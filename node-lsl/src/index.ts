/**
 * node-lsl: Lab Streaming Layer (LSL) bindings for Node.js
 * 
 * This module provides Node.js bindings for the Lab Streaming Layer (LSL) library,
 * enabling real-time streaming of time series data over a local network.
 */

// Export all utility functions and constants
export {
  // Constants
  IRREGULAR_RATE,
  DEDUCED_TIMESTAMP,
  FOREVER,
  // Processing flags
  procNone,
  procClocksync,
  procDejitter,
  procMonotonize,
  procThreadsafe,
  procAll,
  // Channel formats
  cfFloat32,
  cfDouble64,
  cfString,
  cfInt32,
  cfInt16,
  cfInt8,
  cfInt64,
  cfUndefined,
  // Utility functions
  protocolVersion,
  libraryVersion,
  libraryInfo,
  localClock,
  // Error classes
  TimeoutError,
  LostError,
  InvalidArgumentError,
  InternalError,
  // Helper functions
  handleError,
  string2fmt,
  fmt2string,
} from './util';

// Export StreamInfo and XMLElement classes
export { StreamInfo, XMLElement } from './info';

// Export StreamOutlet class
export { StreamOutlet } from './outlet';

// Export StreamInlet class
export { StreamInlet } from './inlet';

// Export resolver functions and ContinuousResolver class
export {
  resolveStreams,
  resolveByProp,
  resolveByPred,
  resolveStream,
  ContinuousResolver,
} from './resolver';

// Import all modules for default export
import { StreamInfo, XMLElement } from './info';
import { StreamOutlet } from './outlet';
import { StreamInlet } from './inlet';
import {
  resolveStreams,
  resolveByProp,
  resolveByPred,
  resolveStream,
  ContinuousResolver,
} from './resolver';
import {
  IRREGULAR_RATE,
  DEDUCED_TIMESTAMP,
  FOREVER,
  procNone,
  procClocksync,
  procDejitter,
  procMonotonize,
  procThreadsafe,
  procAll,
  cfFloat32,
  cfDouble64,
  cfString,
  cfInt32,
  cfInt16,
  cfInt8,
  cfInt64,
  cfUndefined,
  protocolVersion,
  libraryVersion,
  libraryInfo,
  localClock,
  TimeoutError,
  LostError,
  InvalidArgumentError,
  InternalError,
} from './util';

// Default export with all exports for convenience
export default {
  // Classes
  StreamInfo,
  XMLElement,
  StreamOutlet,
  StreamInlet,
  ContinuousResolver,
  // Resolver functions
  resolveStreams,
  resolveByProp,
  resolveByPred,
  resolveStream,
  // Constants
  IRREGULAR_RATE,
  DEDUCED_TIMESTAMP,
  FOREVER,
  // Processing flags
  procNone,
  procClocksync,
  procDejitter,
  procMonotonize,
  procThreadsafe,
  procAll,
  // Channel formats
  cfFloat32,
  cfDouble64,
  cfString,
  cfInt32,
  cfInt16,
  cfInt8,
  cfInt64,
  cfUndefined,
  // Utility functions
  protocolVersion,
  libraryVersion,
  libraryInfo,
  localClock,
  // Error classes
  TimeoutError,
  LostError,
  InvalidArgumentError,
  InternalError,
};