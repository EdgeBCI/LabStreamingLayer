# node-lsl

Modern Lab Streaming Layer (LSL) bindings for Node.js

## Overview

Lab Streaming Layer (LSL) is a system for the unified collection of measurement time series in research experiments. It handles networking, time-synchronization, and real-time data access. This package provides Node.js bindings to the LSL library.

## Features

- ✅ Full TypeScript support with type definitions
- ✅ Modern API using Promises and EventEmitters
- ✅ Support for all LSL data types (float32, double64, int8/16/32/64, string)
- ✅ Stream discovery and resolution
- ✅ Time synchronization
- ✅ Automatic memory management
- ✅ Windows support (macOS and Linux coming soon)

## Installation

```bash
npm install node-lsl
```

## Requirements

- Node.js >= 18.0.0
- Windows (x64 or x86) - macOS and Linux support coming soon
- LSL library v1.16.2 (included for Windows)

## Quick Start

### Sending Data

```javascript
const lsl = require('node-lsl');

// Create stream info
const info = new lsl.StreamInfo(
  'MyStream',           // Stream name
  'EEG',                // Stream type
  8,                    // Number of channels
  250,                  // Sampling rate (Hz)
  lsl.ChannelFormat.Float32,  // Data format
  'myid12345'           // Source ID
);

// Create outlet
const outlet = new lsl.StreamOutlet(info);

// Send data
setInterval(() => {
  const sample = Array(8).fill(0).map(() => Math.random());
  outlet.pushSample(sample);
}, 4); // 250 Hz = every 4ms
```

### Receiving Data

```javascript
const lsl = require('node-lsl');

// Find streams
const streams = lsl.resolveByProp('type', 'EEG', 1, 5.0);

if (streams.length > 0) {
  // Create inlet
  const inlet = new lsl.StreamInlet(streams[0]);
  inlet.openStream();
  
  // Pull samples
  setInterval(() => {
    const result = inlet.pullSample();
    if (result.sample) {
      console.log('Data:', result.sample);
      console.log('Timestamp:', result.timestamp);
    }
  }, 4);
}
```

### Stream Discovery

```javascript
const lsl = require('node-lsl');

// Find all streams
const allStreams = lsl.resolveStreams(2.0);

// Find by type
const eegStreams = lsl.findStreamsByType('EEG');

// Find by name
const myStream = lsl.findStreamsByName('MyStream');

// Continuous monitoring
const resolver = new lsl.ContinuousResolver();
setInterval(() => {
  const streams = resolver.results();
  console.log(`Found ${streams.length} streams`);
}, 1000);
```

## API Reference

### Classes

#### StreamInfo
Represents metadata about a stream.

```typescript
new StreamInfo(
  name: string,
  type: string,
  channelCount: number,
  nominalSrate: number,
  channelFormat: ChannelFormat,
  sourceId?: string
)
```

#### StreamOutlet
Sends data to the network.

```typescript
new StreamOutlet(info: StreamInfo, chunkSize?: number, maxBuffered?: number)
outlet.pushSample(sample: number[], timestamp?: number)
outlet.pushChunk(samples: number[][], timestamps?: number[])
outlet.haveConsumers(): boolean
```

#### StreamInlet
Receives data from the network.

```typescript
new StreamInlet(info: StreamInfo, maxBuflen?: number, maxChunklen?: number, recover?: boolean)
inlet.openStream(timeout?: number)
inlet.pullSample(timeout?: number): { sample: number[], timestamp: number }
inlet.pullChunk(maxSamples?: number, timeout?: number): { samples: number[][], timestamps: number[] }
inlet.timeCorrection(timeout?: number): number
```

### Functions

- `resolveStreams(waitTime?: number): StreamInfo[]` - Find all streams
- `resolveByProp(prop: string, value: string, minimum?: number, timeout?: number): StreamInfo[]` - Find by property
- `resolveByPred(predicate: string, minimum?: number, timeout?: number): StreamInfo[]` - Find by XPath predicate
- `localClock(): number` - Get LSL timestamp
- `protocolVersion(): number` - Get protocol version
- `libraryVersion(): number` - Get library version

### Constants

#### ChannelFormat
- `Float32` - 32-bit float
- `Double64` - 64-bit float  
- `String` - Variable length string
- `Int32` - 32-bit integer
- `Int16` - 16-bit integer
- `Int8` - 8-bit integer
- `Int64` - 64-bit integer

#### ProcessingOptions
- `None` - No processing
- `ClockSync` - Time synchronization
- `Dejitter` - Remove jitter
- `Monotonize` - Force monotonic timestamps
- `ThreadSafe` - Thread-safe processing

## Examples

See the `examples` directory for complete examples:
- `send_data.js` - Stream data sender
- `receive_data.js` - Stream data receiver
- `discover_streams.js` - Stream discovery

## Building from Source

```bash
npm install
npm run build
```

## Testing

```bash
npm test
```

## License

MIT

## Credits

Based on the Lab Streaming Layer library: https://github.com/sccn/labstreaminglayer