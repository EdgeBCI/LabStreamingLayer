# Getting Started with node-labstreaminglayer

This guide will help you get up and running with node-labstreaminglayer in minutes.

## Table of Contents
- [Installation](#installation)
- [Basic Concepts](#basic-concepts)
- [Your First LSL Application](#your-first-lsl-application)
- [Common Patterns](#common-patterns)
- [Next Steps](#next-steps)

## Installation

### Using npm

```bash
npm install node-labstreaminglayer
```

### Using yarn

```bash
yarn add node-labstreaminglayer
```

### Building from Source

If you need to build from source:

```bash
git clone https://github.com/EdgeBCI/LabStreamingLayer.git
cd LabStreamingLayer/node-labstreaminglayer
npm install
npm run build
```

### Verifying Installation

Create a simple test file to verify the installation:

```javascript
import { libraryVersion, protocolVersion } from 'node-labstreaminglayer';

console.log('LSL Library Version:', libraryVersion());
console.log('LSL Protocol Version:', protocolVersion());
```

## Basic Concepts

### What is a Stream?

An LSL stream represents a time series of data with the following properties:

- **Name**: Human-readable identifier (e.g., "BioSemi")
- **Type**: Content type (e.g., "EEG", "Markers", "Gaze")
- **Channels**: Number of data channels
- **Sampling Rate**: Frequency in Hz (or 0 for irregular sampling)
- **Data Format**: Type of data (float32, int32, string, etc.)
- **Source ID**: Unique identifier for the data source

### Core Components

1. **StreamInfo**: Describes a stream's metadata and properties
2. **StreamOutlet**: Broadcasts data to the network
3. **StreamInlet**: Receives data from the network
4. **Resolver**: Discovers available streams on the network

### Data Flow

```
Producer App                Network               Consumer App
[StreamOutlet] ----push----> [LSL] ----pull----> [StreamInlet]
```

## Your First LSL Application

### Step 1: Create a Data Producer

Create a file `producer.js`:

```javascript
import { StreamInfo, StreamOutlet, localClock } from 'node-labstreaminglayer';

// Define stream properties
const info = new StreamInfo(
  'TestStream',     // Stream name
  'TestData',       // Stream type
  4,                // Number of channels
  100,              // Sampling rate (Hz)
  'float32',        // Data format
  'test123'         // Source ID (optional)
);

// Create outlet
const outlet = new StreamOutlet(info);
console.log('Stream created. Sending data...');

// Send data at 100 Hz
setInterval(() => {
  // Generate sample data (4 channels)
  const sample = [
    Math.sin(localClock()),
    Math.cos(localClock()),
    Math.random(),
    Date.now() / 1000
  ];
  
  // Push sample to network
  outlet.pushSample(sample);
}, 10); // 10ms = 100 Hz
```

### Step 2: Create a Data Consumer

Create a file `consumer.js`:

```javascript
import { resolveStreams, StreamInlet } from 'node-labstreaminglayer';

console.log('Looking for streams...');

// Find available streams (wait up to 2 seconds)
const streams = resolveStreams(2.0);

if (streams.length === 0) {
  console.log('No streams found!');
  process.exit(1);
}

console.log(`Found ${streams.length} stream(s)`);

// Connect to the first stream
const inlet = new StreamInlet(streams[0]);
console.log(`Connected to: ${streams[0].name()}`);

// Receive data continuously
setInterval(() => {
  try {
    // Pull a sample (timeout after 0.1 seconds)
    const [sample, timestamp] = inlet.pullSample(0.1);
    console.log('Data:', sample, 'Time:', timestamp);
  } catch (error) {
    // Timeout is normal if no new data is available
    if (error.name !== 'TimeoutError') {
      console.error('Error:', error);
    }
  }
}, 10);
```

### Step 3: Run the Applications

In separate terminals:

```bash
# Terminal 1 - Start the producer
node producer.js

# Terminal 2 - Start the consumer
node consumer.js
```

## Common Patterns

### Pattern 1: Event Markers

Send event markers or annotations as strings:

```javascript
// Producer
const markerInfo = new StreamInfo('EventMarkers', 'Markers', 1, 0, 'string');
const markerOutlet = new StreamOutlet(markerInfo);

// Send a marker
markerOutlet.pushSample(['stimulus_onset']);

// Consumer
const markerInlet = new StreamInlet(markerInfo);
const [marker, timestamp] = markerInlet.pullSample();
console.log(`Event: ${marker[0]} at ${timestamp}`);
```

### Pattern 2: Multichannel Biosignals

Stream multichannel biosignal data like EEG:

```javascript
// 32-channel EEG at 256 Hz
const eegInfo = new StreamInfo('BioSemi', 'EEG', 32, 256, 'float32');
const eegOutlet = new StreamOutlet(eegInfo);

// Add channel labels
eegInfo.desc()
  .appendChild('channels')
  .appendChild('channel')
  .appendChildValue('label', 'Fp1')
  .appendChild('channel')
  .appendChildValue('label', 'Fp2');
// ... add more channels

// Send EEG data
const eegSample = new Float32Array(32);
// ... fill with actual EEG values
eegOutlet.pushSample(eegSample);
```

### Pattern 3: Stream Discovery

Find specific types of streams:

```javascript
import { resolveByProp, resolveByPred } from 'node-labstreaminglayer';

// Find all EEG streams
const eegStreams = resolveByProp('type', 'EEG');

// Find streams matching complex criteria
const filtered = resolveByPred("name='BioSemi' and channel_count='32'");

// Continuous monitoring
import { ContinuousResolver } from 'node-labstreaminglayer';

const resolver = new ContinuousResolver();
setInterval(() => {
  const currentStreams = resolver.results();
  console.log(`Currently ${currentStreams.length} streams available`);
}, 1000);
```

### Pattern 4: Chunk-based Transmission

For efficiency with high-frequency data:

```javascript
// Producer - send chunks of samples
const samples = [
  [1, 2, 3, 4],  // Sample 1
  [5, 6, 7, 8],  // Sample 2
  [9, 10, 11, 12] // Sample 3
];
outlet.pushChunk(samples);

// Consumer - receive chunks
const [samples, timestamps] = inlet.pullChunk(1.0, 100); // Max 100 samples
console.log(`Received ${samples.length} samples`);
```

## TypeScript Support

node-labstreaminglayer includes complete TypeScript definitions:

```typescript
import { 
  StreamInfo, 
  StreamOutlet, 
  StreamInlet, 
  ChannelFormat 
} from 'node-labstreaminglayer';

// Type-safe channel format
const format: ChannelFormat = 'float32';

// TypeScript will enforce correct types
const info = new StreamInfo('MyStream', 'Data', 8, 100, format);
const outlet = new StreamOutlet(info);

// Type inference for samples
const sample: number[] = [1, 2, 3, 4, 5, 6, 7, 8];
outlet.pushSample(sample);
```

## Error Handling

Always handle potential errors gracefully:

```javascript
import { TimeoutError, LostError } from 'node-labstreaminglayer';

try {
  const [sample, timestamp] = inlet.pullSample(1.0);
  // Process sample
} catch (error) {
  if (error instanceof TimeoutError) {
    console.log('No data available');
  } else if (error instanceof LostError) {
    console.log('Stream connection lost');
    // Attempt to reconnect
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Performance Tips

1. **Use appropriate buffer sizes**: Larger buffers for high-throughput streams
   ```javascript
   const inlet = new StreamInlet(info, 360, 1024); // 360s buffer, 1024 sample chunks
   ```

2. **Enable post-processing flags for time correction**:
   ```javascript
   import { proc_clocksync, proc_dejitter } from 'node-labstreaminglayer';
   const inlet = new StreamInlet(info, 360, 0, true, proc_clocksync | proc_dejitter);
   ```

3. **Use chunks for high-frequency data**: More efficient than single samples
   ```javascript
   // Send 100 samples at once
   outlet.pushChunk(sampleArray);
   ```

## Next Steps

Now that you understand the basics:

1. Explore the [API Reference](./api-reference.md) for detailed documentation
2. Check out [Examples](./examples.md) for complete working code
3. Learn about [Advanced Usage](./advanced-usage.md) for optimization
4. Review [Data Types](./data-types.md) for format specifications
5. See [Troubleshooting](./troubleshooting.md) if you encounter issues

## Quick Reference

### Import Everything

```javascript
import {
  // Core classes
  StreamInfo,
  StreamOutlet,
  StreamInlet,
  
  // Discovery
  resolveStreams,
  resolveByProp,
  resolveByPred,
  ContinuousResolver,
  
  // Constants
  IRREGULAR_RATE,
  FOREVER,
  
  // Post-processing flags
  proc_clocksync,
  proc_dejitter,
  proc_ALL,
  
  // Utilities
  localClock,
  libraryVersion,
  
  // Errors
  TimeoutError,
  LostError
} from 'node-labstreaminglayer';
```

### Common Operations

```javascript
// Create stream
const info = new StreamInfo(name, type, channels, rate, format);
const outlet = new StreamOutlet(info);

// Find streams
const streams = resolveStreams(timeout);

// Connect to stream
const inlet = new StreamInlet(streamInfo);

// Send data
outlet.pushSample(sample);

// Receive data
const [sample, timestamp] = inlet.pullSample(timeout);

// Get local clock
const now = localClock();
```