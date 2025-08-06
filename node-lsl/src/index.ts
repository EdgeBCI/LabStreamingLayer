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

// Default export with all exports for convenience
export default {
  // Classes
  StreamInfo: require('./info').StreamInfo,
  XMLElement: require('./info').XMLElement,
  StreamOutlet: require('./outlet').StreamOutlet,
  StreamInlet: require('./inlet').StreamInlet,
  ContinuousResolver: require('./resolver').ContinuousResolver,
  // Resolver functions
  resolveStreams: require('./resolver').resolveStreams,
  resolveByProp: require('./resolver').resolveByProp,
  resolveByPred: require('./resolver').resolveByPred,
  resolveStream: require('./resolver').resolveStream,
  // Constants
  IRREGULAR_RATE: require('./util').IRREGULAR_RATE,
  DEDUCED_TIMESTAMP: require('./util').DEDUCED_TIMESTAMP,
  FOREVER: require('./util').FOREVER,
  // Processing flags
  procNone: require('./util').procNone,
  procClocksync: require('./util').procClocksync,
  procDejitter: require('./util').procDejitter,
  procMonotonize: require('./util').procMonotonize,
  procThreadsafe: require('./util').procThreadsafe,
  procAll: require('./util').procAll,
  // Channel formats
  cfFloat32: require('./util').cfFloat32,
  cfDouble64: require('./util').cfDouble64,
  cfString: require('./util').cfString,
  cfInt32: require('./util').cfInt32,
  cfInt16: require('./util').cfInt16,
  cfInt8: require('./util').cfInt8,
  cfInt64: require('./util').cfInt64,
  cfUndefined: require('./util').cfUndefined,
  // Utility functions
  protocolVersion: require('./util').protocolVersion,
  libraryVersion: require('./util').libraryVersion,
  libraryInfo: require('./util').libraryInfo,
  localClock: require('./util').localClock,
  // Error classes
  TimeoutError: require('./util').TimeoutError,
  LostError: require('./util').LostError,
  InvalidArgumentError: require('./util').InvalidArgumentError,
  InternalError: require('./util').InternalError,
};