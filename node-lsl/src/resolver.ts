import * as koffi from 'koffi';
import {
  ContinuousResolverHandle,
  lsl_resolve_all,
  lsl_resolve_byprop,
  lsl_resolve_bypred,
  lsl_create_continuous_resolver,
  lsl_create_continuous_resolver_byprop,
  lsl_create_continuous_resolver_bypred,
  lsl_destroy_continuous_resolver,
  lsl_resolver_results,
  lsl_copy_streaminfo,
} from './lib';
import { StreamInfo } from './info';
import { FOREVER } from './util';

/**
 * Resolve all streams on the network.
 * This function returns all currently available streams from any outlet on the network.
 * 
 * @param waitTime - The timeout for the operation, in seconds. (default 1.0)
 * @returns An array of StreamInfo objects describing the available streams.
 */
export function resolveStreams(waitTime: number = 1.0): StreamInfo[] {
  const maxStreams = 1024;
  const buffer = koffi.alloc('void*', maxStreams);
  
  const count = lsl_resolve_all(buffer, maxStreams, waitTime);
  
  const streams: StreamInfo[] = [];
  const handles = koffi.decode(buffer, 'void**');
  
  for (let i = 0; i < count; i++) {
    if (handles[i]) {
      // Copy the handle to ensure it remains valid
      const copiedHandle = lsl_copy_streaminfo(handles[i]);
      streams.push(new StreamInfo('', '', 0, 0, 0, '', copiedHandle));
    }
  }
  
  return streams;
}

/**
 * Resolve all streams with a specific value for a given property.
 * This function returns all streams that have a specific value for a given property.
 * 
 * @param prop - The property to match (e.g., "name", "type", "source_id").
 * @param value - The value that the property should have.
 * @param minimum - Minimum number of streams to return (waits until this many are found or timeout).
 * @param timeout - The timeout for the operation, in seconds. (default FOREVER)
 * @returns An array of StreamInfo objects describing the matching streams.
 */
export function resolveByProp(
  prop: string,
  value: string,
  minimum: number = 1,
  timeout: number = FOREVER
): StreamInfo[] {
  const maxStreams = 1024;
  const buffer = koffi.alloc('void*', maxStreams);
  
  const count = lsl_resolve_byprop(buffer, maxStreams, prop, value, minimum, timeout);
  
  const streams: StreamInfo[] = [];
  const handles = koffi.decode(buffer, 'void**');
  
  for (let i = 0; i < count; i++) {
    if (handles[i]) {
      // Copy the handle to ensure it remains valid
      const copiedHandle = lsl_copy_streaminfo(handles[i]);
      streams.push(new StreamInfo('', '', 0, 0, 0, '', copiedHandle));
    }
  }
  
  return streams;
}

/**
 * Resolve all streams that match a given predicate.
 * This function returns all streams for which the predicate evaluates to true.
 * 
 * @param predicate - A predicate string in XPath 1.0 format (e.g., "name='BioSemi'").
 * @param minimum - Minimum number of streams to return (waits until this many are found or timeout).
 * @param timeout - The timeout for the operation, in seconds. (default FOREVER)
 * @returns An array of StreamInfo objects describing the matching streams.
 */
export function resolveByPred(
  predicate: string,
  minimum: number = 1,
  timeout: number = FOREVER
): StreamInfo[] {
  const maxStreams = 1024;
  const buffer = koffi.alloc('void*', maxStreams);
  
  const count = lsl_resolve_bypred(buffer, maxStreams, predicate, minimum, timeout);
  
  const streams: StreamInfo[] = [];
  const handles = koffi.decode(buffer, 'void**');
  
  for (let i = 0; i < count; i++) {
    if (handles[i]) {
      // Copy the handle to ensure it remains valid
      const copiedHandle = lsl_copy_streaminfo(handles[i]);
      streams.push(new StreamInfo('', '', 0, 0, 0, '', copiedHandle));
    }
  }
  
  return streams;
}

/**
 * Polymorphic resolver function that can be called with different argument combinations.
 * 
 * @param args - Various argument combinations:
 *   - No arguments: resolve all streams with 1 second timeout
 *   - Single number: resolve all streams with specified timeout
 *   - Two strings: resolve by property and value
 *   - String and undefined: resolve by predicate
 * @returns An array of StreamInfo objects describing the matching streams.
 */
export function resolveStream(...args: any[]): StreamInfo[] {
  if (args.length === 0) {
    // No arguments: resolve all streams
    return resolveStreams();
  } else if (args.length === 1 && typeof args[0] === 'number') {
    // Single number: resolve all with timeout
    return resolveStreams(args[0]);
  } else if (args.length === 2 && typeof args[0] === 'string' && typeof args[1] === 'string') {
    // Two strings: resolve by property
    return resolveByProp(args[0], args[1]);
  } else if (args.length >= 3 && typeof args[0] === 'string' && typeof args[1] === 'string') {
    // Property with minimum and/or timeout
    const minimum = typeof args[2] === 'number' ? args[2] : 1;
    const timeout = typeof args[3] === 'number' ? args[3] : FOREVER;
    return resolveByProp(args[0], args[1], minimum, timeout);
  } else if (typeof args[0] === 'string') {
    // Single string: resolve by predicate
    const minimum = typeof args[1] === 'number' ? args[1] : 1;
    const timeout = typeof args[2] === 'number' ? args[2] : FOREVER;
    return resolveByPred(args[0], minimum, timeout);
  } else {
    throw new Error('Invalid arguments for resolveStream');
  }
}

/**
 * A convenience class that resolves streams continuously in the background 
 * and can be queried at any time for the current results.
 */
export class ContinuousResolver {
  private handle: any;
  private destroyed: boolean = false;

  /**
   * Construct a new continuous resolver.
   * 
   * @param prop - The property to match (e.g., "name", "type", "source_id"). 
   *               Pass null to resolve all streams.
   * @param value - The value that the property should have. 
   *                Ignored if prop is null.
   * @param pred - A predicate string in XPath 1.0 format. 
   *               If specified, prop and value are ignored.
   * @param forgetAfter - How long to remember streams after they disappear, in seconds. (default 5.0)
   */
  constructor(
    prop: string | null = null,
    value: string | null = null,
    pred: string | null = null,
    forgetAfter: number = 5.0
  ) {
    if (pred) {
      // Use predicate-based resolver
      this.handle = lsl_create_continuous_resolver_bypred(pred, forgetAfter);
    } else if (prop && value) {
      // Use property-based resolver
      this.handle = lsl_create_continuous_resolver_byprop(prop, value, forgetAfter);
    } else {
      // Resolve all streams
      this.handle = lsl_create_continuous_resolver(forgetAfter);
    }

    if (!this.handle) {
      throw new Error('Could not create continuous resolver.');
    }
  }

  /**
   * Destroy the continuous resolver.
   */
  destroy(): void {
    if (!this.destroyed && this.handle) {
      try {
        lsl_destroy_continuous_resolver(this.handle);
        this.destroyed = true;
      } catch (e) {
        console.error('ContinuousResolver deletion triggered error:', e);
      }
    }
  }

  /**
   * Get the current set of results.
   * 
   * @returns An array of StreamInfo objects describing the currently available streams.
   */
  results(): StreamInfo[] {
    const maxStreams = 1024;
    const buffer = koffi.alloc('void*', maxStreams);
    
    const count = lsl_resolver_results(this.handle, buffer, maxStreams);
    
    const streams: StreamInfo[] = [];
    const handles = koffi.decode(buffer, 'void**');
    
    for (let i = 0; i < count; i++) {
      if (handles[i]) {
        // Copy the handle to ensure it remains valid
        const copiedHandle = lsl_copy_streaminfo(handles[i]);
        streams.push(new StreamInfo('', '', 0, 0, 0, '', copiedHandle));
      }
    }
    
    return streams;
  }
}