import { 
  lsl_protocol_version,
  lsl_library_version,
  lsl_library_info,
  lsl_local_clock
} from './lib/index.js';

// Constant to indicate that a stream has variable sampling rate
export const IRREGULAR_RATE = 0.0;

// Constant to indicate that a sample has the next successive time stamp
// according to the stream's defined sampling rate
export const DEDUCED_TIMESTAMP = -1.0;

// A very large time value (ca. 1 year); can be used in timeouts
export const FOREVER = 32000000.0;

// Post processing flags
export const proc_none = 0;  // No automatic post-processing
export const proc_clocksync = 1;  // Perform automatic clock synchronization
export const proc_dejitter = 2;  // Remove jitter from time stamps
export const proc_monotonize = 4;  // Force time-stamps to be monotonically ascending
export const proc_threadsafe = 8;  // Post-processing is thread-safe
export const proc_ALL = proc_none | proc_clocksync | proc_dejitter | proc_monotonize | proc_threadsafe;

// Error classes
export class TimeoutError extends Error {
  constructor(message?: string) {
    super(message || 'The operation failed due to a timeout.');
    this.name = 'TimeoutError';
  }
}

export class LostError extends Error {
  constructor(message?: string) {
    super(message || 'The stream has been lost.');
    this.name = 'LostError';
  }
}

export class InvalidArgumentError extends Error {
  constructor(message?: string) {
    super(message || 'An argument was incorrectly specified.');
    this.name = 'InvalidArgumentError';
  }
}

export class InternalError extends Error {
  constructor(message?: string) {
    super(message || 'An internal error has occurred.');
    this.name = 'InternalError';
  }
}

// Error handler function (exported for testing)
export function handleError(errcode: number | { value: number }): void {
  // Handle both number and object with value property
  const code = typeof errcode === 'number' ? errcode : errcode.value;
  
  if (code === 0) {
    return; // no error
  } else if (code === -1) {
    throw new TimeoutError();
  } else if (code === -2) {
    throw new LostError();
  } else if (code === -3) {
    throw new InvalidArgumentError();
  } else if (code === -4) {
    throw new InternalError();
  } else if (code < 0) {
    throw new Error('An unknown error has occurred.');
  }
}

// Utility functions
export function protocolVersion(): number {
  return lsl_protocol_version();
}

export function libraryVersion(): number {
  return lsl_library_version();
}

export function libraryInfo(): string {
  return lsl_library_info();
}

export function localClock(): number {
  return lsl_local_clock();
}