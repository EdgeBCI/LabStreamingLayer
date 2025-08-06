# node-lsl Examples

This directory contains example programs demonstrating how to use the node-lsl library for Lab Streaming Layer (LSL) operations.

## Prerequisites

Make sure you have node-lsl installed and built:

```bash
cd node-lsl
npm install
npm run build
```

## Running the Examples

All examples can be run directly with Node.js from the node-lsl directory:

```bash
node examples/ExampleName.js
```

## Examples Overview

### Basic Data Streaming

#### SendData.js
Demonstrates how to create and send a multi-channel time series stream.

```bash
node examples/SendData.js [options]
  -s, --srate <rate>      Sampling rate (default: 100)
  -n, --name <name>       Stream name (default: "BioSemi")
  -t, --type <type>       Stream type (default: "EEG")
  -c, --channels <count>  Number of channels (default: 8)
```

**Use case:** Simulating sensor data, testing data reception, or creating mock EEG/EMG/ECG streams.

#### ReceiveData.js
Shows how to receive and display samples from a stream one by one.

```bash
node examples/ReceiveData.js [stream_type]
```

**Use case:** Basic data monitoring, debugging stream connections, or simple data logging.

### Event Markers

#### SendStringMarkers.js
Demonstrates sending string-valued event markers at irregular intervals.

```bash
node examples/SendStringMarkers.js
```

**Use case:** Marking experimental events, synchronizing stimuli, or logging user interactions.

#### ReceiveStringMarkers.js
Shows how to receive and display string markers from a marker stream.

```bash
node examples/ReceiveStringMarkers.js
```

**Use case:** Event logging, experiment synchronization, or trigger detection.

### Efficient Data Transfer

#### ReceiveDataInChunks.js
Demonstrates efficient bulk data reception using chunk-based pulling.

```bash
node examples/ReceiveDataInChunks.js [stream_type]
```

**Use case:** High-throughput data recording, efficient data processing, or handling high-frequency streams.

### Advanced Features

#### HandleMetadata.js
Shows how to add and retrieve detailed stream metadata including channel descriptions.

```bash
node examples/HandleMetadata.js
```

**Use case:** Documenting channel layouts, storing equipment information, or following XDF metadata standards.

#### SendDataAdvanced.js
Advanced example with complete metadata, chunk-based sending, and simulated hardware latency.

```bash
node examples/SendDataAdvanced.js [options]
  --name <name>     Stream name (default: "LSLExampleAmp")
  --type <type>     Stream type (default: "EEG")
  --srate <rate>    Sampling rate (default: 100)
```

**Use case:** Professional data streaming, realistic EEG simulation, or integration with recording software.

#### GetTimeCorrection.js
Demonstrates time synchronization between computers on the network.

```bash
node examples/GetTimeCorrection.js [stream_type]
```

**Use case:** Multi-stream synchronization, distributed recording, or measuring network latency.

## Common Usage Patterns

### 1. Basic Sender-Receiver Pair

Start a sender in one terminal:
```bash
node examples/SendData.js --name TestStream --type Test --channels 4
```

Receive data in another terminal:
```bash
node examples/ReceiveData.js Test
```

### 2. Marker Stream with Data Stream

Start an EEG data stream:
```bash
node examples/SendDataAdvanced.js --name MyEEG --type EEG
```

Start a marker stream:
```bash
node examples/SendStringMarkers.js
```

Receive both streams in separate terminals:
```bash
node examples/ReceiveDataInChunks.js EEG
node examples/ReceiveStringMarkers.js
```

### 3. Testing Metadata

Run the metadata example to see how channel information is transmitted:
```bash
node examples/HandleMetadata.js
```

### 4. Time Synchronization

First start a data stream:
```bash
node examples/SendData.js
```

Then check time synchronization:
```bash
node examples/GetTimeCorrection.js EEG
```

## Tips and Best Practices

1. **Stream Types**: Use standard stream types when possible:
   - `"EEG"` for electroencephalography
   - `"EMG"` for electromyography
   - `"ECG"` for electrocardiography
   - `"Markers"` for event markers
   - `"Audio"` for audio streams

2. **Sampling Rates**: Choose appropriate sampling rates:
   - EEG: 250-1000 Hz
   - EMG: 1000-2000 Hz
   - ECG: 250-500 Hz
   - Markers: 0 (irregular rate)

3. **Chunk Size**: For high-throughput streams, use chunk-based operations:
   - Sending: Use `pushChunk()` instead of multiple `pushSample()` calls
   - Receiving: Use `pullChunk()` for better efficiency

4. **Time Stamps**: 
   - Use `localClock()` for accurate timestamps
   - Apply time correction for multi-computer setups
   - Consider hardware latency when timestamping

5. **Metadata**: Always include relevant metadata:
   - Channel labels and units
   - Equipment information
   - Coordinate systems for spatial data

## Troubleshooting

### No streams found
- Ensure the sender is running before starting the receiver
- Check firewall settings (LSL uses multicast/unicast UDP)
- Verify both programs are on the same network

### Poor time synchronization
- Check network latency between computers
- Ensure system clocks are synchronized (NTP)
- Use wired connections instead of WiFi when possible

### Data dropouts
- Increase buffer sizes in StreamInlet constructor
- Use chunk-based operations for high-frequency streams
- Check CPU usage and system resources

## Additional Resources

- [Lab Streaming Layer Documentation](https://labstreaminglayer.readthedocs.io/)
- [XDF Metadata Specification](https://github.com/sccn/xdf/wiki/Meta-Data)
- [LSL Best Practices](https://labstreaminglayer.readthedocs.io/info/best_practices.html)

## Contributing

Feel free to add more examples or improve existing ones. Please follow the existing code style and include comprehensive comments.