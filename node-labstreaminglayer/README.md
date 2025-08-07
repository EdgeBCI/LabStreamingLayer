# node-labstreaminglayer

Node.js bindings for Lab Streaming Layer (LSL) - A system for unified collection of measurement time series in research experiments.

## Features

- 🚀 High-performance FFI bindings using Koffi
- 📊 Support for all LSL data types (float32, double64, string, int32, int16, int8, int64)
- 🔄 Real-time streaming with sub-millisecond precision
- 🔍 Stream discovery and resolution
- 📝 Full metadata support via XML
- 💻 Cross-platform support (Windows, macOS, Linux)
- 📦 TypeScript support with full type definitions
- 🧵 Thread-safe operations

## Installation

```bash
npm install node-labstreaminglayer
```

## Quick Start

### Sending Data

```javascript
import { StreamInfo, StreamOutlet } from 'node-labstreaminglayer';

// Create stream info
const info = new StreamInfo('MyStream', 'EEG', 8, 100, 'float32', 'uniqueid123');

// Create outlet and start streaming
const outlet = new StreamOutlet(info);

// Send data
const sample = [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0];
outlet.pushSample(sample);
```

### Receiving Data

```javascript
import { resolveStreams, StreamInlet } from 'node-labstreaminglayer';

// Find available streams
const streams = resolveStreams();

if (streams.length > 0) {
  // Connect to first stream
  const inlet = new StreamInlet(streams[0]);
  
  // Receive data
  const [sample, timestamp] = inlet.pullSample();
  console.log('Received:', sample, 'at', timestamp);
}
```

## API Reference

### Core Classes

#### StreamInfo
Stores the declaration of a data stream.

```javascript
const info = new StreamInfo(
  name,           // Stream name
  type,           // Content type (e.g., 'EEG', 'Markers')
  channelCount,   // Number of channels
  nominalSrate,   // Sampling rate (Hz) or IRREGULAR_RATE
  channelFormat,  // Data type: 'float32', 'double64', 'string', etc.
  sourceId        // Unique source identifier (optional)
);
```

#### StreamOutlet
Makes streaming data available on the network.

```javascript
const outlet = new StreamOutlet(info, chunkSize?, maxBuffered?);
outlet.pushSample(sample, timestamp?, pushthrough?);
outlet.pushChunk(samples, timestamp?, pushthrough?);
outlet.haveConsumers();
outlet.waitForConsumers(timeout);
```

#### StreamInlet
Receives streaming data from the network.

```javascript
const inlet = new StreamInlet(info, maxBuflen?, maxChunklen?, recover?, processingFlags?);
const [sample, timestamp] = inlet.pullSample(timeout?);
const [samples, timestamps] = inlet.pullChunk(timeout?, maxSamples?);
inlet.timeCorrection(timeout?);
inlet.openStream(timeout?);
inlet.closeStream();
```

### Stream Discovery

```javascript
// Find all streams
const streams = resolveStreams(waitTime?);

// Find by property
const eegStreams = resolveByProp('type', 'EEG');

// Find by predicate (XPath)
const filtered = resolveByPred("name='MyStream' and type='EEG'");

// Continuous resolution
const resolver = new ContinuousResolver();
const currentStreams = resolver.results();
```

### Constants

```javascript
import { 
  IRREGULAR_RATE,  // 0.0 - for irregular sampling
  FOREVER,         // 32000000.0 - for infinite timeout
  proc_clocksync,  // Clock synchronization flag
  proc_dejitter,   // Dejitter timestamps flag
  proc_ALL        // All processing flags
} from 'node-labstreaminglayer';
```

## Examples

The package includes several example scripts in the `src/examples` directory:

- `SendData.ts` - Stream multi-channel data
- `ReceiveData.ts` - Receive and display data
- `SendStringMarkers.ts` - Send event markers
- `ReceiveStringMarkers.ts` - Receive event markers
- `HandleMetadata.ts` - Work with stream metadata

Run examples after building:
```bash
npm run build
node dist/examples/SendData.js
```

## Building from Source

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run tests
npm test
```

## Platform Support

- **Windows**: x64 and x86 (uses `lsl_amd64.dll` or `lsl_i386.dll`)
- **Linux**: x64 (uses `lsl.so`)
- **macOS**: x64 and ARM64 (uses `lsl.dylib`)

## License

MIT

## Credits

This package provides Node.js bindings for the Lab Streaming Layer (LSL) library.
- LSL: https://github.com/sccn/labstreaminglayer
- Uses Koffi for FFI: https://koffi.dev/

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.