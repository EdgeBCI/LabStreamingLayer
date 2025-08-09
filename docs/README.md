# node-labstreaminglayer Documentation

Welcome to the comprehensive documentation for **node-labstreaminglayer**, the official Node.js bindings for the Lab Streaming Layer (LSL) protocol.

## What is Lab Streaming Layer?

Lab Streaming Layer (LSL) is a system for the unified collection of measurement time series in research experiments. It handles networking, time-synchronization, and real-time data access for a wide range of acquisition systems, from EEG systems to motion capture and eye tracking.

## What is node-labstreaminglayer?

node-labstreaminglayer provides high-performance Node.js bindings to the LSL C library, enabling JavaScript and TypeScript developers to:

- Stream real-time data from sensors and acquisition devices
- Build data processing pipelines for biosignals
- Create web-based visualization and analysis tools
- Integrate LSL streams with modern web technologies

## Key Features

- **High Performance**: Direct FFI bindings using Koffi for minimal overhead
- **Complete Type Support**: Full TypeScript definitions for type-safe development
- **Cross-Platform**: Works on Windows (x86/x64), macOS (Intel/Apple Silicon), and Linux
- **All Data Types**: Support for float32, double64, int8/16/32/64, and string channels
- **Real-Time Capable**: Sub-millisecond precision with hardware timestamps
- **Easy Integration**: Simple API that follows LSL conventions

## Documentation Overview

### Getting Started
- [Quick Start Guide](./getting-started.md) - Installation and first steps
- [Examples](./examples.md) - Complete code examples for common use cases

### API Documentation
- [API Reference](./api-reference.md) - Complete API documentation for all classes and functions
- [Data Types](./data-types.md) - Supported data types and format specifications

### Advanced Topics
- [Advanced Usage](./advanced-usage.md) - Performance optimization and advanced features
- [Architecture](./architecture.md) - Technical implementation details
- [Troubleshooting](./troubleshooting.md) - Common issues and solutions

### Contributing
- [Migration Guide](./migration-guide.md) - Migrating from other LSL implementations
- [Contributing](./contributing.md) - How to contribute to the project

## Quick Example

```javascript
// Sending data
import { StreamInfo, StreamOutlet } from 'node-labstreaminglayer';

const info = new StreamInfo('MyStream', 'EEG', 8, 250, 'float32');
const outlet = new StreamOutlet(info);

// Send 8-channel data at 250 Hz
const sample = [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0];
outlet.pushSample(sample);
```

```javascript
// Receiving data
import { resolveStreams, StreamInlet } from 'node-labstreaminglayer';

const streams = resolveStreams();
if (streams.length > 0) {
  const inlet = new StreamInlet(streams[0]);
  const [sample, timestamp] = inlet.pullSample();
  console.log('Received:', sample, 'at', timestamp);
}
```

## System Requirements

### Prerequisites
- Node.js >= 16.0.0
- npm or yarn package manager

### Platform Support
- **Windows**: Windows 10 or later (x86/x64)
- **macOS**: macOS 10.14 or later (Intel/Apple Silicon)
- **Linux**: Ubuntu 18.04+ or equivalent (x64)

### Optional Dependencies
- Python 3.x (for testing with pylsl)
- C++ build tools (only if building from source)

## Installation

```bash
npm install node-labstreaminglayer
```

For detailed installation instructions, see the [Getting Started Guide](./getting-started.md).

## Use Cases

node-labstreaminglayer is ideal for:

- **Neuroscience Research**: EEG, fNIRS, and other biosignal acquisition
- **Human-Computer Interaction**: Real-time BCI applications
- **Motion Capture**: Streaming position and orientation data
- **Physiological Monitoring**: ECG, EMG, respiration, and other vitals
- **Behavioral Research**: Eye tracking, response times, and event markers
- **IoT Sensors**: Environmental and industrial sensor networks
- **Data Synchronization**: Multi-modal data collection with precise timestamps

## Community and Support

- **GitHub Repository**: [EdgeBCI/LabStreamingLayer](https://github.com/EdgeBCI/LabStreamingLayer)
- **Issues**: [Report bugs or request features](https://github.com/EdgeBCI/LabStreamingLayer/issues)
- **LSL Community**: [Lab Streaming Layer](https://labstreaminglayer.org)

## License

node-labstreaminglayer is released under the MIT License. See [LICENSE](../LICENSE) for details.

## Acknowledgments

This project builds upon the excellent work of the Lab Streaming Layer community and uses [Koffi](https://koffi.dev/) for FFI bindings.

---

*For the main project README with quick installation instructions, see [../README.md](../node-labstreaminglayer/README.md)*