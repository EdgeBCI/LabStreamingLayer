# Lab Streaming Layer Packages

A collection of packages and bindings for Lab Streaming Layer (LSL) - a system for unified collection of measurement time series in research experiments that handles both the networking, time-synchronization, (near) real-time access as well as optionally the centralized collection, viewing and disk recording of the data.

## Packages

### node-labstreaminglayer
Node.js bindings for Lab Streaming Layer (LSL) with TypeScript support.

- 🚀 High-performance FFI bindings using Koffi
- 📊 Support for all LSL data types
- 🔄 Real-time streaming with sub-millisecond precision
- 📦 Full TypeScript support
- 💻 Cross-platform (Windows, macOS, Linux)

**Installation:**
```bash
npm install node-labstreaminglayer
```

**Quick Example:**
```javascript
import { StreamInfo, StreamOutlet } from 'node-labstreaminglayer';

// Create and send data
const info = new StreamInfo('MyStream', 'EEG', 8, 100, 'float32', 'uniqueid123');
const outlet = new StreamOutlet(info);
outlet.pushSample([1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0]);
```

[View full documentation](./node-labstreaminglayer/README.md)

## About Lab Streaming Layer

Lab Streaming Layer (LSL) is a system for the unified collection of measurement time series in research experiments. It handles the networking, time-synchronization, and real-time access to data streams. LSL is particularly popular in neuroscience, brain-computer interfaces (BCI), and psychophysiology research.

Key features of LSL:
- **Time Synchronization**: Sub-millisecond synchronization between streams
- **Platform Independent**: Works across Windows, Linux, macOS, Android, iOS
- **Language Agnostic**: Bindings available for many programming languages
- **Robust**: Automatic stream discovery and recovery from network interruptions
- **Scalable**: Handle multiple high-frequency data streams simultaneously

## Author

**Haowen John Wei**  
GitHub: [https://github.com/HaowenWeiJohn](https://github.com/HaowenWeiJohn)

## Resources

- [LSL Documentation](https://labstreaminglayer.readthedocs.io/)
- [LSL GitHub Repository](https://github.com/sccn/labstreaminglayer)
- [LSL Community](https://github.com/labstreaminglayer)

## License

MIT