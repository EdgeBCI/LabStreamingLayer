/**
 * Constants and enums for Lab Streaming Layer
 */

/**
 * Data format of a channel
 */
export enum ChannelFormat {
  /** 32-bit float (single precision) */
  Float32 = 1,
  /** 64-bit float (double precision) */
  Double64 = 2,
  /** String (variable length) */
  String = 3,
  /** 32-bit signed integer */
  Int32 = 4,
  /** 16-bit signed integer */
  Int16 = 5,
  /** 8-bit signed integer */
  Int8 = 6,
  /** 64-bit signed integer */
  Int64 = 7,
  /** Undefined format (placeholder) */
  Undefined = 0,
}

/**
 * Post-processing flags for inlet
 */
export enum ProcessingOptions {
  /** No automatic post-processing */
  None = 0,
  /** Perform clock synchronization */
  ClockSync = 1,
  /** Remove jitter from timestamps */
  Dejitter = 2,
  /** Force timestamps to be monotonically ascending */
  Monotonize = 4,
  /** Post-processing is thread-safe */
  ThreadSafe = 8,
  /** All post-processing options */
  All = 1 | 2 | 4 | 8,
}

/**
 * Error codes
 */
export enum ErrorCode {
  /** No error */
  NoError = 0,
  /** Timeout expired */
  TimeoutError = -1,
  /** Stream lost */
  LostError = -2,
  /** Invalid argument */
  ArgumentError = -3,
  /** Internal error */
  InternalError = -4,
}

/**
 * Special constants
 */
export const IRREGULAR_RATE = 0.0;
export const FOREVER = 32000000.0;
export const NO_PREFERENCE = 0;
export const ALL = -1;

/**
 * Channel format names
 */
export const CHANNEL_FORMAT_STRINGS: { [key: number]: string } = {
  [ChannelFormat.Float32]: 'float32',
  [ChannelFormat.Double64]: 'double64',
  [ChannelFormat.String]: 'string',
  [ChannelFormat.Int32]: 'int32',
  [ChannelFormat.Int16]: 'int16',
  [ChannelFormat.Int8]: 'int8',
  [ChannelFormat.Int64]: 'int64',
  [ChannelFormat.Undefined]: 'undefined',
};

/**
 * Protocol version
 */
export const LSL_PROTOCOL_VERSION = 110;

/**
 * Get the string representation of a channel format
 */
export function channelFormatToString(format: ChannelFormat): string {
  return CHANNEL_FORMAT_STRINGS[format] || 'unknown';
}

/**
 * Get the channel format from a string
 */
export function stringToChannelFormat(str: string): ChannelFormat {
  const lowerStr = str.toLowerCase();
  for (const [key, value] of Object.entries(CHANNEL_FORMAT_STRINGS)) {
    if (value === lowerStr) {
      return parseInt(key) as ChannelFormat;
    }
  }
  // Also handle cf_ prefix variants
  if (lowerStr === 'cf_float32') return ChannelFormat.Float32;
  if (lowerStr === 'cf_double64') return ChannelFormat.Double64;
  if (lowerStr === 'cf_string') return ChannelFormat.String;
  if (lowerStr === 'cf_int32') return ChannelFormat.Int32;
  if (lowerStr === 'cf_int16') return ChannelFormat.Int16;
  if (lowerStr === 'cf_int8') return ChannelFormat.Int8;
  if (lowerStr === 'cf_int64') return ChannelFormat.Int64;
  return ChannelFormat.Undefined;
}

/**
 * Get bytes per sample for a channel format
 */
export function getBytesPerSample(format: ChannelFormat): number {
  switch (format) {
    case ChannelFormat.Float32:
      return 4;
    case ChannelFormat.Double64:
      return 8;
    case ChannelFormat.Int8:
      return 1;
    case ChannelFormat.Int16:
      return 2;
    case ChannelFormat.Int32:
      return 4;
    case ChannelFormat.Int64:
      return 8;
    case ChannelFormat.String:
      return -1; // Variable length
    default:
      return 0;
  }
}

/**
 * LSL-specific error classes
 */

/**
 * Error thrown when an operation times out
 */
export class TimeoutError extends Error {
  constructor(message?: string) {
    super(message || 'Operation timed out');
    this.name = 'TimeoutError';
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}

/**
 * Error thrown when a stream is lost or disconnected
 */
export class LostError extends Error {
  constructor(message?: string) {
    super(message || 'Stream lost or disconnected');
    this.name = 'LostError';
    Object.setPrototypeOf(this, LostError.prototype);
  }
}

/**
 * Channel format constants with cf_ prefix (pylsl compatibility)
 */
export const cf_float32 = ChannelFormat.Float32;
export const cf_double64 = ChannelFormat.Double64;
export const cf_string = ChannelFormat.String;
export const cf_int32 = ChannelFormat.Int32;
export const cf_int16 = ChannelFormat.Int16;
export const cf_int8 = ChannelFormat.Int8;
export const cf_int64 = ChannelFormat.Int64;
export const cf_undefined = ChannelFormat.Undefined;

/**
 * Processing options helper functions (pylsl compatibility)
 */

/** No post-processing */
export function proc_none(): ProcessingOptions {
  return ProcessingOptions.None;
}

/** Clock synchronization */
export function proc_clocksync(): ProcessingOptions {
  return ProcessingOptions.ClockSync;
}

/** Remove jitter from timestamps */
export function proc_dejitter(): ProcessingOptions {
  return ProcessingOptions.Dejitter;
}

/** Force timestamps to be monotonic */
export function proc_monotonize(): ProcessingOptions {
  return ProcessingOptions.Monotonize;
}

/** Make post-processing thread-safe */
export function proc_threadsafe(): ProcessingOptions {
  return ProcessingOptions.ThreadSafe;
}

/** All post-processing options */
export function proc_all(): ProcessingOptions {
  return ProcessingOptions.All;
}