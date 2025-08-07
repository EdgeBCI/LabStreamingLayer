import {
  lsl_resolve_all,
  lsl_resolve_byprop,
  lsl_resolve_bypred,
  lsl_create_continuous_resolver,
  lsl_create_continuous_resolver_byprop,
  lsl_create_continuous_resolver_bypred,
  lsl_destroy_continuous_resolver,
  lsl_resolver_results
} from './lib/index.js';
import { StreamInfo } from './streamInfo.js';
import { FOREVER } from './util.js';

export function resolveStreams(waitTime: number = 1.0): StreamInfo[] {
  // Create buffer for stream info pointers
  const bufferSize = 1024;
  const buffer = new Array(bufferSize).fill(null);
  
  // Resolve streams
  const numFound = lsl_resolve_all(buffer, bufferSize, waitTime);
  
  // Convert to StreamInfo objects
  const results: StreamInfo[] = [];
  for (let i = 0; i < numFound; i++) {
    const handle = buffer[i];
    if (handle) {
      results.push(new StreamInfo('', '', 0, 0, 0, '', handle));
    }
  }
  
  return results;
}

export function resolveByProp(
  prop: string,
  value: string,
  minimum: number = 1,
  timeout: number = FOREVER
): StreamInfo[] {
  // Create buffer for stream info pointers
  const bufferSize = 1024;
  const buffer = new Array(bufferSize).fill(null);
  
  // Resolve streams by property
  const numFound = lsl_resolve_byprop(
    buffer,
    bufferSize,
    prop,
    value,
    minimum,
    timeout
  );
  
  // Convert to StreamInfo objects
  const results: StreamInfo[] = [];
  for (let i = 0; i < numFound; i++) {
    const handle = buffer[i];
    if (handle) {
      results.push(new StreamInfo('', '', 0, 0, 0, '', handle));
    }
  }
  
  return results;
}

export function resolveByPred(
  predicate: string,
  minimum: number = 1,
  timeout: number = FOREVER
): StreamInfo[] {
  // Create buffer for stream info pointers
  const bufferSize = 1024;
  const buffer = new Array(bufferSize).fill(null);
  
  // Resolve streams by predicate
  const numFound = lsl_resolve_bypred(
    buffer,
    bufferSize,
    predicate,
    minimum,
    timeout
  );
  
  // Convert to StreamInfo objects
  const results: StreamInfo[] = [];
  for (let i = 0; i < numFound; i++) {
    const handle = buffer[i];
    if (handle) {
      results.push(new StreamInfo('', '', 0, 0, 0, '', handle));
    }
  }
  
  return results;
}

// Legacy compatibility function
export function resolveStream(...args: any[]): StreamInfo[] {
  if (args.length === 0) {
    return resolveStreams();
  } else if (typeof args[0] === 'number') {
    return resolveStreams(args[0]);
  } else if (typeof args[0] === 'string') {
    if (args.length === 1) {
      return resolveByPred(args[0]);
    } else if (typeof args[1] === 'number') {
      return resolveByPred(args[0], args[1]);
    } else {
      if (args.length === 2) {
        return resolveByProp(args[0], args[1]);
      } else {
        return resolveByProp(args[0], args[1], args[2]);
      }
    }
  }
  
  throw new Error('Invalid arguments for resolveStream');
}

export class ContinuousResolver {
  private obj: any; // Pointer to the continuous resolver object
  
  constructor(
    prop?: string,
    value?: string,
    pred?: string,
    forgetAfter: number = 5.0
  ) {
    if (pred !== undefined) {
      if (prop !== undefined || value !== undefined) {
        throw new Error(
          'You can only either pass the prop/value argument or the pred argument, but not both.'
        );
      }
      this.obj = lsl_create_continuous_resolver_bypred(pred, forgetAfter);
    } else if (prop !== undefined && value !== undefined) {
      this.obj = lsl_create_continuous_resolver_byprop(prop, value, forgetAfter);
    } else if (prop !== undefined || value !== undefined) {
      throw new Error(
        'If prop is specified, then value must be specified too, and vice versa.'
      );
    } else {
      this.obj = lsl_create_continuous_resolver(forgetAfter);
    }
    
    if (!this.obj) {
      throw new Error('Could not create continuous resolver.');
    }
  }
  
  // Destructor
  destroy(): void {
    if (this.obj) {
      try {
        lsl_destroy_continuous_resolver(this.obj);
      } catch (e) {
        // Silently ignore errors during destruction
      }
      this.obj = null;
    }
  }
  
  results(): StreamInfo[] {
    // Create buffer for stream info pointers
    const bufferSize = 1024;
    const buffer = new Array(bufferSize).fill(null);
    
    // Get resolver results
    const numFound = lsl_resolver_results(this.obj, buffer, bufferSize);
    
    // Convert to StreamInfo objects
    const results: StreamInfo[] = [];
    for (let i = 0; i < numFound; i++) {
      const handle = buffer[i];
      if (handle) {
        results.push(new StreamInfo('', '', 0, 0, 0, '', handle));
      }
    }
    
    return results;
  }
}