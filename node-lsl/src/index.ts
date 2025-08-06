/**
 * node-lsl - Modern Lab Streaming Layer (LSL) bindings for Node.js
 * 
 * Lab Streaming Layer (LSL) is a system for the unified collection of 
 * measurement time series in research experiments. It handles networking, 
 * time-synchronization, and real-time data access.
 */

// Core classes
export { StreamInfo, XMLElement } from './streaminfo';
export { StreamOutlet } from './outlet';
export { StreamInlet, PullResult, ChunkResult } from './inlet';

// Resolver functions and classes
export {
  resolveStreams,
  resolveByProp,
  resolveByPred,
  ContinuousResolver,
  findStreamsByType,
  findStreamsByName,
  findStreamsBySourceId,
} from './resolver';

// Constants and enums
export {
  ChannelFormat,
  ProcessingOptions,
  ErrorCode,
  IRREGULAR_RATE,
  FOREVER,
  NO_PREFERENCE,
  ALL,
  CHANNEL_FORMAT_STRINGS,
  LSL_PROTOCOL_VERSION,
  channelFormatToString,
  stringToChannelFormat,
  getBytesPerSample,
} from './constants';

// Utility functions from lib
import { 
  lsl_protocol_version,
  lsl_library_version,
  lsl_library_info,
  lsl_local_clock
} from './lib';

/**
 * Get the protocol version used by the library
 */
export function protocolVersion(): number {
  return lsl_protocol_version();
}

/**
 * Get the library version
 */
export function libraryVersion(): number {
  return lsl_library_version();
}

/**
 * Get library info string
 */
export function libraryInfo(): string {
  return lsl_library_info() || '';
}

/**
 * Get the local LSL clock time
 * This is the time used for timestamps if no custom timestamp is provided
 */
export function localClock(): number {
  return lsl_local_clock();
}

// Re-export commonly used types for convenience
export type { default as lib } from './lib';

// Import the constants/functions we need for aliases
import { ChannelFormat, ProcessingOptions, ErrorCode } from './constants';
import { resolveByProp, resolveByPred, resolveStreams } from './resolver';

// Convenience aliases for backward compatibility
export const channel_format_t = ChannelFormat;
export const processing_options_t = ProcessingOptions;
export const error_code_t = ErrorCode;

// Convenience functions
export const resolve_byprop = resolveByProp;
export const resolve_bypred = resolveByPred;
export const resolve_streams = resolveStreams;
export const protocol_version = protocolVersion;
export const library_version = libraryVersion;
export const library_info = libraryInfo;
export const local_clock = localClock;