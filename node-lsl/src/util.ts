import { lsl_protocol_version, lsl_library_version, lsl_library_info, lsl_local_clock } from './lib';

// Constants matching pylsl
export const IRREGULAR_RATE = 0.0;
export const DEDUCED_TIMESTAMP = -1.0;
export const FOREVER = 32000000.0;

// Processing flags for stream inlets (camelCase naming)
export const procNone = 0;  // No automatic post-processing
export const procClocksync = 1;  // Perform automatic clock synchronization
export const procDejitter = 2;  // Remove jitter from time stamps
export const procMonotonize = 4;  // Force time-stamps to be monotonically ascending
export const procThreadsafe = 8;  // Post-processing is thread-safe
export const procAll = procNone | procClocksync | procDejitter | procMonotonize | procThreadsafe;

// Channel format constants (camelCase naming)
export const cfFloat32 = 1;
export const cfDouble64 = 2;
export const cfString = 3;
export const cfInt32 = 4;
export const cfInt16 = 5;
export const cfInt8 = 6;
export const cfInt64 = 7;
export const cfUndefined = 0;

// String to format mapping
export const string2fmt: { [key: string]: number } = {
  'float32': cfFloat32,
  'double64': cfDouble64,
  'string': cfString,
  'int32': cfInt32,
  'int16': cfInt16,
  'int8': cfInt8,
  'int64': cfInt64,
};

// Format to string mapping
export const fmt2string: string[] = [
  'undefined',
  'float32',
  'double64',
  'string',
  'int32',
  'int16',
  'int8',
  'int64',
];

// Error classes matching pylsl
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

// Error handler function
export function handleError(errcode: number): void {
  if (errcode === 0) {
    return; // No error
  } else if (errcode === -1) {
    throw new TimeoutError();
  } else if (errcode === -2) {
    throw new LostError();
  } else if (errcode === -3) {
    throw new InvalidArgumentError();
  } else if (errcode === -4) {
    throw new InternalError();
  } else if (errcode < 0) {
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