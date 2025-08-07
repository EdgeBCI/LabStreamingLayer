// Main exports for node-lsl package

// Core classes
export { StreamInfo, XMLElement } from './streamInfo.js';
export { StreamOutlet } from './outlet.js';
export { StreamInlet } from './inlet.js';

// Resolver functions and classes
export {
  resolveStreams,
  resolveByProp,
  resolveByPred,
  resolveStream,
  ContinuousResolver
} from './resolver.js';

// Constants and utilities
export {
  IRREGULAR_RATE,
  DEDUCED_TIMESTAMP,
  FOREVER,
  proc_none,
  proc_clocksync,
  proc_dejitter,
  proc_monotonize,
  proc_threadsafe,
  proc_ALL,
  protocolVersion,
  libraryVersion,
  libraryInfo,
  localClock,
  TimeoutError,
  LostError,
  InvalidArgumentError,
  InternalError,
  handleError
} from './util.js';

// Channel format constants
export {
  cf_float32,
  cf_double64,
  cf_string,
  cf_int32,
  cf_int16,
  cf_int8,
  cf_int64,
  cf_undefined,
  string2fmt,
  fmt2string
} from './lib/index.js';

// Type exports
export type { ChannelFormat } from './lib/index.js';