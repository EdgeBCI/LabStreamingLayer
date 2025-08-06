import * as koffi from 'koffi';
import { 
  lsl_resolve_all,
  lsl_resolve_byprop,
  lsl_resolve_bypred,
  lsl_create_continuous_resolver,
  lsl_create_continuous_resolver_byprop,
  lsl_create_continuous_resolver_bypred,
  lsl_resolver_results,
  lsl_destroy_continuous_resolver
} from './lib';
import { StreamInfo } from './streaminfo';
import { FOREVER } from './util';

/**
 * Resolve all streams on the network
 * @param waitTime Time to wait for streams
 * @returns Array of StreamInfo objects
 */
export function resolveStreams(waitTime = 1.0): StreamInfo[] {
  const maxStreams = 1024;
  const buffer = koffi.alloc('void*', maxStreams);
  
  const numStreams = lsl_resolve_all(buffer, maxStreams, waitTime);
  
  const streams: StreamInfo[] = [];
  for (let i = 0; i < numStreams; i++) {
    const handle = koffi.decode(buffer, 'void*', i);
    if (handle) {
      streams.push(new StreamInfo(handle));
    }
  }
  
  return streams;
}

/**
 * Resolve streams by property
 * @param prop Property name (e.g., 'name', 'type', 'source_id')
 * @param value Value to match
 * @param minimum Minimum number of streams to resolve
 * @param timeout Timeout in seconds
 * @returns Array of StreamInfo objects
 */
export function resolveByProp(
  prop: string,
  value: string,
  minimum = 1,
  timeout = FOREVER
): StreamInfo[] {
  const maxStreams = 1024;
  const buffer = koffi.alloc('void*', maxStreams);
  
  const numStreams = lsl_resolve_byprop(
    buffer,
    maxStreams,
    prop,
    value,
    minimum,
    timeout
  );
  
  const streams: StreamInfo[] = [];
  for (let i = 0; i < numStreams; i++) {
    const handle = koffi.decode(buffer, 'void*', i);
    if (handle) {
      streams.push(new StreamInfo(handle));
    }
  }
  
  return streams;
}

/**
 * Resolve streams by predicate
 * @param predicate XPath-like predicate string
 * @param minimum Minimum number of streams to resolve
 * @param timeout Timeout in seconds
 * @returns Array of StreamInfo objects
 */
export function resolveByPred(
  predicate: string,
  minimum = 1,
  timeout = FOREVER
): StreamInfo[] {
  const maxStreams = 1024;
  const buffer = koffi.alloc('void*', maxStreams);
  
  const numStreams = lsl_resolve_bypred(
    buffer,
    maxStreams,
    predicate,
    minimum,
    timeout
  );
  
  const streams: StreamInfo[] = [];
  for (let i = 0; i < numStreams; i++) {
    const handle = koffi.decode(buffer, 'void*', i);
    if (handle) {
      streams.push(new StreamInfo(handle));
    }
  }
  
  return streams;
}

/**
 * ContinuousResolver for background stream discovery
 */
export class ContinuousResolver {
  private handle: any; // koffi pointer

  /**
   * Create a continuous resolver
   * @param prop Property to filter by (optional)
   * @param value Value to match (optional)
   * @param predicate XPath predicate (optional)
   * @param forgetAfter Time after which to forget streams (seconds)
   */
  constructor(
    prop?: string,
    value?: string,
    predicate?: string,
    forgetAfter = 5.0
  ) {

    if (predicate) {
      this.handle = lsl_create_continuous_resolver_bypred(predicate, forgetAfter);
    } else if (prop && value) {
      this.handle = lsl_create_continuous_resolver_byprop(prop, value, forgetAfter);
    } else {
      this.handle = lsl_create_continuous_resolver(forgetAfter);
    }

    if (!this.handle) {
      throw new Error('Failed to create continuous resolver');
    }

    // Set up finalizer for automatic cleanup
    if (typeof FinalizationRegistry !== 'undefined') {
      const registry = new FinalizationRegistry((handle: any) => {
        try {
          lsl_destroy_continuous_resolver(handle);
        } catch (e) {
          // Ignore errors during cleanup
        }
      });
      registry.register(this, this.handle);
    }
  }

  /**
   * Destroy the resolver explicitly
   */
  destroy(): void {
    if (this.handle) {
      lsl_destroy_continuous_resolver(this.handle);
    }
  }

  /**
   * Get current results
   * @returns Array of StreamInfo objects
   */
  results(): StreamInfo[] {
    const maxStreams = 1024;
    const buffer = koffi.alloc('void*', maxStreams);
    
    const numStreams = lsl_resolver_results(this.handle, buffer, maxStreams);
    
    const streams: StreamInfo[] = [];
    for (let i = 0; i < numStreams; i++) {
      const handle = koffi.decode(buffer, 'void*', i);
      if (handle) {
        streams.push(new StreamInfo(handle));
      }
    }
    
    return streams;
  }

  /**
   * Get the internal handle
   */
  getHandle(): any {
    return this.handle;
  }
}

/**
 * Helper function to find streams by type
 * @param type Stream type to search for
 * @param timeout Timeout in seconds
 * @returns Array of StreamInfo objects
 */
export function findStreamsByType(type: string, timeout = 1.0): StreamInfo[] {
  return resolveByProp('type', type, 0, timeout);
}

/**
 * Helper function to find streams by name
 * @param name Stream name to search for
 * @param timeout Timeout in seconds
 * @returns Array of StreamInfo objects
 */
export function findStreamsByName(name: string, timeout = 1.0): StreamInfo[] {
  return resolveByProp('name', name, 0, timeout);
}

/**
 * Helper function to find streams by source ID
 * @param sourceId Source ID to search for
 * @param timeout Timeout in seconds
 * @returns Array of StreamInfo objects
 */
export function findStreamsBySourceId(sourceId: string, timeout = 1.0): StreamInfo[] {
  return resolveByProp('source_id', sourceId, 0, timeout);
}