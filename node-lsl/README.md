# node-lsl

Modern Lab Streaming Layer (LSL) bindings for Node.js

## Overview

node-lsl provides Node.js bindings for the Lab Streaming Layer (LSL) library, enabling real-time streaming of time series data over a local network. This package is designed to be compatible with the Python pylsl library while following JavaScript/TypeScript conventions.

## Features

- Complete LSL API implementation
- TypeScript support with full type definitions
- Cross-platform support (Windows, macOS, Linux)
- Compatible with pylsl API design
- High-performance FFI bindings using Koffi
- Support for all LSL data types (float32, double64, string, int32, int16, int8, int64)

## Requirements

- Node.js >= 18.0.0
- LSL library installed on your system (or use the included prebuilt binaries)

## Installation

```bash
npm install node-lsl
```

## Quick Start

### Creating a Stream Outlet (Sender)

```javascript
const lsl = require('node-lsl');

// Create stream info
const info = new lsl.StreamInfo(
  'MyStream',        // Stream name
  'EEG',            // Stream type
  8,                // Number of channels
  100,              // Sampling rate (Hz)
  lsl.cfFloat32,    // Data type
  'myuid34234'      // Source ID
);

// Create outlet
const outlet = new lsl.StreamOutlet(info);

// Push samples
const sample = [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0];
outlet.pushSample(sample);

// Push multiple samples at once
const samples = [
  [1, 2, 3, 4, 5, 6, 7, 8],
  [2, 3, 4, 5, 6, 7, 8, 9],
  [3, 4, 5, 6, 7, 8, 9, 10]
];
outlet.pushChunk(samples);
```

### Creating a Stream Inlet (Receiver)

```javascript
const lsl = require('node-lsl');

// Resolve streams of a specific type
const streams = lsl.resolveByProp('type', 'EEG', 1, 10.0);

if (streams.length > 0) {
  // Create inlet
  const inlet = new lsl.StreamInlet(streams[0]);
  
  // Pull samples
  const [sample, timestamp] = inlet.pullSample();
  if (sample) {
    console.log('Received sample:', sample, 'at time:', timestamp);
  }
  
  // Pull multiple samples
  const [samples, timestamps] = inlet.pullChunk();
  console.log('Received', samples.length, 'samples');
}
```

### Resolving Streams

```javascript
// Resolve all available streams
const allStreams = lsl.resolveStreams(5.0);  // 5 second timeout

// Resolve by property
const eegStreams = lsl.resolveByProp('type', 'EEG');

// Resolve by predicate (XPath)
const highRateStreams = lsl.resolveByPred("nominal_srate>100");

// Continuous resolver
const resolver = new lsl.ContinuousResolver('type', 'EEG');
// ... later ...
const currentStreams = resolver.results();
```

## API Reference

### Core Classes

- **StreamInfo**: Represents stream metadata
- **StreamOutlet**: Used to broadcast data streams
- **StreamInlet**: Used to receive data streams
- **ContinuousResolver**: Continuously resolves streams in the background
- **XMLElement**: Manipulates stream descriptions

### Resolver Functions

- `resolveStreams(waitTime)`: Resolve all streams on the network
- `resolveByProp(prop, value, minimum, timeout)`: Resolve streams by property
- `resolveByPred(predicate, minimum, timeout)`: Resolve streams by XPath predicate
- `resolveStream(...args)`: Polymorphic resolver function

### Constants

#### Data Types
- `cfFloat32`: 32-bit float
- `cfDouble64`: 64-bit double
- `cfString`: String
- `cfInt32`: 32-bit integer
- `cfInt16`: 16-bit integer
- `cfInt8`: 8-bit integer
- `cfInt64`: 64-bit integer

#### Processing Flags
- `procNone`: No automatic post-processing
- `procClocksync`: Perform automatic clock synchronization
- `procDejitter`: Remove jitter from time stamps
- `procMonotonize`: Force time-stamps to be monotonically ascending
- `procThreadsafe`: Post-processing is thread-safe
- `procAll`: All processing flags combined

#### Time Constants
- `IRREGULAR_RATE`: 0.0 - Indicates variable sampling rate
- `DEDUCED_TIMESTAMP`: -1.0 - Use implicit timestamps
- `FOREVER`: 32000000.0 - Infinite timeout

### Utility Functions

- `protocolVersion()`: Get LSL protocol version
- `libraryVersion()`: Get LSL library version
- `libraryInfo()`: Get library information string
- `localClock()`: Get local system timestamp

## Platform Support

The package includes prebuilt binaries for:
- Windows (x64, x86)
- macOS (x64, arm64) - requires LSL library installation
- Linux (x64, x86) - requires LSL library installation

For macOS and Linux, you can install the LSL library using:
- macOS: `brew install labstreaminglayer/tap/lsl`
- Linux: Build from source or use your package manager

## Environment Variables

- `LSL_LIB` or `PYLSL_LIB`: Path to the LSL library file

## TypeScript Support

This package includes TypeScript definitions. Simply import the package in your TypeScript project:

```typescript
import * as lsl from 'node-lsl';
// or
import { StreamInfo, StreamOutlet, StreamInlet } from 'node-lsl';
```

## Differences from pylsl

While node-lsl aims to be compatible with pylsl, there are some differences:

1. **Naming conventions**: Uses camelCase instead of snake_case (e.g., `pushSample` vs `push_sample`)
2. **Async patterns**: JavaScript's event-driven nature may require different patterns for real-time streaming
3. **Buffer handling**: Uses TypedArrays instead of NumPy arrays

## Examples

Check the `examples/` directory for more detailed examples including:
- EEG streaming
- Marker streaming
- Multi-stream synchronization
- Real-time visualization

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details

## Resources

- [Lab Streaming Layer Documentation](https://labstreaminglayer.readthedocs.io/)
- [LSL GitHub Repository](https://github.com/sccn/labstreaminglayer)
- [pylsl Python Library](https://github.com/labstreaminglayer/pylsl)

## Support

For issues and questions, please use the [GitHub issue tracker](https://github.com/EdgeBCI/node-lsl/issues).