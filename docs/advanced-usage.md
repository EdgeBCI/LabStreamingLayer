# Advanced Usage

Advanced techniques and optimizations for node-labstreaminglayer.

## Table of Contents

- [Performance Optimization](#performance-optimization)
- [Buffer Management](#buffer-management)
- [Time Synchronization](#time-synchronization)
- [Network Configuration](#network-configuration)
- [Memory Management](#memory-management)
- [Multi-threading Considerations](#multi-threading-considerations)
- [Custom Post-processing](#custom-post-processing)
- [Stream Recovery](#stream-recovery)

## Performance Optimization

### Optimizing for High-Throughput Streams

When dealing with high-frequency data (>1000 Hz) or many channels (>64), optimization becomes critical.

#### Use Chunk-based Transmission

```javascript
// Inefficient: Single sample transmission
setInterval(() => {
  outlet.pushSample(sample); // One network call per sample
}, 1);

// Efficient: Chunk transmission
const CHUNK_SIZE = 100;
const samples = [];

setInterval(() => {
  // Collect samples
  for (let i = 0; i < CHUNK_SIZE; i++) {
    samples.push(generateSample());
  }
  
  // Send as chunk - one network call
  outlet.pushChunk(samples);
  samples.length = 0; // Clear array
}, 100); // Send 100 samples every 100ms
```

#### Optimize Buffer Allocation

```javascript
// Pre-allocate buffers for better performance
class OptimizedStreamer {
  constructor(channels, chunkSize) {
    // Pre-allocate typed arrays
    this.buffers = [];
    for (let i = 0; i < chunkSize; i++) {
      this.buffers.push(new Float32Array(channels));
    }
    this.bufferIndex = 0;
  }
  
  getNextBuffer() {
    const buffer = this.buffers[this.bufferIndex];
    this.bufferIndex = (this.bufferIndex + 1) % this.buffers.length;
    return buffer;
  }
  
  streamData(outlet) {
    const chunk = [];
    
    for (let i = 0; i < this.buffers.length; i++) {
      const buffer = this.getNextBuffer();
      // Fill buffer with data (reuses memory)
      this.fillBuffer(buffer);
      chunk.push(buffer);
    }
    
    outlet.pushChunk(chunk);
  }
  
  fillBuffer(buffer) {
    // Fill with your data
    for (let i = 0; i < buffer.length; i++) {
      buffer[i] = Math.random();
    }
  }
}
```

### Optimizing Data Reception

#### Efficient Pulling Strategies

```javascript
// Strategy 1: Pull chunks for high-throughput
class ChunkReceiver {
  constructor(inlet) {
    this.inlet = inlet;
    this.processBuffer = [];
  }
  
  receiveData() {
    // Pull up to 1000 samples at once
    const [samples, timestamps] = this.inlet.pullChunk(0.0, 1000);
    
    if (samples.length > 0) {
      // Process in batches
      this.processBatch(samples, timestamps);
    }
  }
  
  processBatch(samples, timestamps) {
    // Batch processing is more efficient
    const results = samples.map((sample, i) => ({
      data: this.processample(sample),
      time: timestamps[i]
    }));
    
    // Store or forward results
    this.processBuffer.push(...results);
  }
}

// Strategy 2: Non-blocking continuous reception
class ContinuousReceiver {
  constructor(inlet) {
    this.inlet = inlet;
    this.running = true;
    this.receiveLoop();
  }
  
  async receiveLoop() {
    while (this.running) {
      try {
        // Non-blocking pull
        const [sample, timestamp] = this.inlet.pullSample(0.0);
        this.processSample(sample, timestamp);
      } catch (e) {
        // No data available - yield to event loop
        await new Promise(resolve => setImmediate(resolve));
      }
    }
  }
  
  processSample(sample, timestamp) {
    // Process immediately
  }
  
  stop() {
    this.running = false;
  }
}
```

## Buffer Management

### Configuring Buffer Sizes

Buffer sizes significantly impact performance and memory usage.

```javascript
// Buffer size considerations
const inlet = new StreamInlet(
  info,
  360,    // max_buflen: Maximum buffer in seconds
  1024    // max_chunklen: Maximum samples per chunk
);

// For high-frequency streams
const highFreqInlet = new StreamInlet(
  info,
  60,     // Smaller time buffer (60s)
  10000   // Larger chunk size
);

// For low-latency applications
const lowLatencyInlet = new StreamInlet(
  info,
  10,     // Small buffer (10s)
  1       // Single sample chunks
);
```

### Dynamic Buffer Management

```javascript
class AdaptiveBuffer {
  constructor(inlet) {
    this.inlet = inlet;
    this.bufferHighWater = 1000;
    this.bufferLowWater = 100;
  }
  
  async manageBuffer() {
    while (true) {
      const available = this.inlet.samplesAvailable();
      
      if (available > this.bufferHighWater) {
        // Buffer getting full - process aggressively
        console.log('High buffer usage - increasing processing rate');
        await this.processAggressively();
      } else if (available < this.bufferLowWater) {
        // Buffer low - can process leisurely
        await this.processNormally();
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  async processAggressively() {
    // Pull large chunks quickly
    const [samples] = this.inlet.pullChunk(0.0, 500);
    // Process samples...
  }
  
  async processNormally() {
    // Pull smaller chunks
    const [samples] = this.inlet.pullChunk(0.1, 100);
    // Process samples...
  }
}
```

### Circular Buffer Implementation

```javascript
class CircularBuffer {
  constructor(size) {
    this.buffer = new Float32Array(size);
    this.size = size;
    this.writePos = 0;
    this.readPos = 0;
    this.count = 0;
  }
  
  write(data) {
    for (let i = 0; i < data.length; i++) {
      this.buffer[this.writePos] = data[i];
      this.writePos = (this.writePos + 1) % this.size;
      
      if (this.count < this.size) {
        this.count++;
      } else {
        // Overwriting old data
        this.readPos = (this.readPos + 1) % this.size;
      }
    }
  }
  
  read(length) {
    const result = new Float32Array(Math.min(length, this.count));
    
    for (let i = 0; i < result.length; i++) {
      result[i] = this.buffer[this.readPos];
      this.readPos = (this.readPos + 1) % this.size;
      this.count--;
    }
    
    return result;
  }
  
  available() {
    return this.count;
  }
}

// Usage with LSL
class BufferedProcessor {
  constructor(inlet, bufferSize = 10000) {
    this.inlet = inlet;
    this.buffer = new CircularBuffer(bufferSize);
  }
  
  async run() {
    // Fill buffer
    setInterval(() => {
      try {
        const [samples] = this.inlet.pullChunk(0.0, 100);
        samples.forEach(sample => this.buffer.write(sample));
      } catch (e) {
        // No data
      }
    }, 10);
    
    // Process from buffer
    setInterval(() => {
      if (this.buffer.available() >= 256) {
        const windowData = this.buffer.read(256);
        this.processWindow(windowData);
      }
    }, 100);
  }
  
  processWindow(data) {
    // Process fixed-size windows
  }
}
```

## Time Synchronization

### Understanding LSL Time

LSL uses its own clock for precise synchronization across devices.

```javascript
import { localClock, proc_clocksync, proc_dejitter } from 'node-labstreaminglayer';

// Get current LSL time
const lslTime = localClock(); // Returns seconds since arbitrary epoch

// Enable time correction on inlet
const inlet = new StreamInlet(
  info,
  360,
  0,
  true,
  proc_clocksync | proc_dejitter // Enable synchronization
);

// Get time correction offset
const correction = inlet.timeCorrection(5.0); // Wait up to 5 seconds
console.log(`Clock offset: ${correction * 1000} ms`);
```

### Synchronizing Multiple Streams

```javascript
class StreamSynchronizer {
  constructor(streams) {
    this.inlets = new Map();
    this.buffers = new Map();
    this.syncWindow = 0.01; // 10ms sync window
    
    // Create inlets with time correction
    streams.forEach(stream => {
      const inlet = new StreamInlet(
        stream,
        360,
        0,
        true,
        proc_clocksync | proc_dejitter
      );
      
      this.inlets.set(stream.uid(), inlet);
      this.buffers.set(stream.uid(), []);
    });
  }
  
  pullSynchronized() {
    const synchronized = new Map();
    let referenceTime = null;
    
    // Pull from all streams
    this.inlets.forEach((inlet, uid) => {
      try {
        const [samples, timestamps] = inlet.pullChunk(0.0, 100);
        
        for (let i = 0; i < samples.length; i++) {
          this.buffers.get(uid).push({
            data: samples[i],
            time: timestamps[i]
          });
        }
      } catch (e) {
        // No data
      }
    });
    
    // Find common time point
    let minLatestTime = Infinity;
    
    this.buffers.forEach(buffer => {
      if (buffer.length > 0) {
        const latestTime = buffer[buffer.length - 1].time;
        minLatestTime = Math.min(minLatestTime, latestTime);
      }
    });
    
    if (minLatestTime === Infinity) {
      return synchronized; // No data
    }
    
    // Extract synchronized samples
    this.buffers.forEach((buffer, uid) => {
      const syncSamples = [];
      
      while (buffer.length > 0 && buffer[0].time <= minLatestTime) {
        const sample = buffer.shift();
        
        if (Math.abs(sample.time - minLatestTime) < this.syncWindow) {
          syncSamples.push(sample);
        }
      }
      
      if (syncSamples.length > 0) {
        synchronized.set(uid, syncSamples);
      }
    });
    
    return synchronized;
  }
}
```

### Custom Timestamp Handling

```javascript
class TimestampManager {
  constructor() {
    this.offset = 0;
    this.driftRate = 0;
    this.lastSync = localClock();
  }
  
  // Synchronize with external clock
  syncWithExternal(externalTime) {
    const lslTime = localClock();
    this.offset = externalTime - lslTime;
    
    // Calculate drift
    const timeSinceSync = lslTime - this.lastSync;
    if (timeSinceSync > 0) {
      this.driftRate = this.offset / timeSinceSync;
    }
    
    this.lastSync = lslTime;
  }
  
  // Convert LSL time to external time
  toExternalTime(lslTimestamp) {
    const elapsed = lslTimestamp - this.lastSync;
    const drift = elapsed * this.driftRate;
    return lslTimestamp + this.offset + drift;
  }
  
  // Convert external time to LSL time
  toLSLTime(externalTimestamp) {
    const elapsed = localClock() - this.lastSync;
    const drift = elapsed * this.driftRate;
    return externalTimestamp - this.offset - drift;
  }
}

// Usage
const tm = new TimestampManager();
tm.syncWithExternal(Date.now() / 1000);

// When sending data
const externalTime = Date.now() / 1000;
const lslTime = tm.toLSLTime(externalTime);
outlet.pushSample(sample, lslTime);

// When receiving data
const [sample, lslTimestamp] = inlet.pullSample();
const externalTimestamp = tm.toExternalTime(lslTimestamp);
```

## Network Configuration

### Multicast Configuration

LSL uses multicast for stream discovery. Configure network settings for optimal performance.

```javascript
// Environment variables for network configuration
process.env.LSL_MULTICAST_TTL = '1';  // Restrict to local network
process.env.LSL_MULTICAST_PORT = '16571';  // Custom multicast port

// For complex networks, use known peers
process.env.LSL_KNOWN_PEERS = '192.168.1.100,192.168.1.101';
```

### Handling Network Issues

```javascript
class RobustConnection {
  constructor(streamName) {
    this.streamName = streamName;
    this.inlet = null;
    this.connected = false;
    this.reconnectInterval = 5000;
    
    this.connect();
  }
  
  async connect() {
    while (!this.connected) {
      try {
        console.log(`Attempting to connect to ${this.streamName}...`);
        
        const streams = resolveByProp('name', this.streamName, 1, 5.0);
        
        if (streams.length > 0) {
          this.inlet = new StreamInlet(streams[0], 360, 0, true);
          this.connected = true;
          console.log('Connected successfully');
          
          // Start monitoring connection
          this.monitorConnection();
        }
      } catch (error) {
        console.error('Connection failed:', error);
      }
      
      if (!this.connected) {
        await new Promise(resolve => 
          setTimeout(resolve, this.reconnectInterval)
        );
      }
    }
  }
  
  monitorConnection() {
    setInterval(() => {
      try {
        // Try to pull sample to check connection
        this.inlet.pullSample(0.0);
      } catch (error) {
        if (error.name === 'LostError') {
          console.log('Connection lost, reconnecting...');
          this.connected = false;
          this.inlet.destroy();
          this.connect();
        }
      }
    }, 1000);
  }
  
  pullSample(timeout = 1.0) {
    if (!this.connected) {
      throw new Error('Not connected');
    }
    
    return this.inlet.pullSample(timeout);
  }
}
```

## Memory Management

### Preventing Memory Leaks

```javascript
class ManagedStream {
  constructor() {
    this.outlets = new Set();
    this.inlets = new Set();
    
    // Setup cleanup handlers
    process.on('exit', () => this.cleanup());
    process.on('SIGINT', () => this.cleanup());
    process.on('SIGTERM', () => this.cleanup());
    process.on('uncaughtException', (error) => {
      console.error('Uncaught exception:', error);
      this.cleanup();
      process.exit(1);
    });
  }
  
  createOutlet(info, chunkSize, maxBuffered) {
    const outlet = new StreamOutlet(info, chunkSize, maxBuffered);
    this.outlets.add(outlet);
    return outlet;
  }
  
  createInlet(info, maxBuflen, maxChunklen, recover, flags) {
    const inlet = new StreamInlet(info, maxBuflen, maxChunklen, recover, flags);
    this.inlets.add(inlet);
    return inlet;
  }
  
  cleanup() {
    console.log('Cleaning up streams...');
    
    this.outlets.forEach(outlet => {
      try {
        outlet.destroy();
      } catch (e) {
        // Already destroyed
      }
    });
    
    this.inlets.forEach(inlet => {
      try {
        inlet.destroy();
      } catch (e) {
        // Already destroyed
      }
    });
    
    this.outlets.clear();
    this.inlets.clear();
  }
}

// Usage
const manager = new ManagedStream();
const outlet = manager.createOutlet(info);
// Automatic cleanup on exit
```

### Memory-efficient Data Processing

```javascript
class StreamProcessor {
  constructor(inlet, windowSize = 1024) {
    this.inlet = inlet;
    this.windowSize = windowSize;
    
    // Reuse buffers
    this.window = new Float32Array(windowSize);
    this.fftBuffer = new Float32Array(windowSize);
    this.powerBuffer = new Float32Array(windowSize / 2);
  }
  
  process() {
    // Pull directly into pre-allocated buffer
    const samples = this.inlet.pullChunk(1.0, this.windowSize);
    
    if (samples[0].length >= this.windowSize) {
      // Copy data to window (reuses memory)
      for (let i = 0; i < this.windowSize; i++) {
        this.window[i] = samples[0][i][0]; // First channel
      }
      
      // Process in-place
      this.applyWindow(this.window);
      this.computeFFT(this.window, this.fftBuffer);
      this.computePower(this.fftBuffer, this.powerBuffer);
      
      return this.powerBuffer;
    }
  }
  
  applyWindow(data) {
    // Hamming window in-place
    for (let i = 0; i < data.length; i++) {
      data[i] *= 0.54 - 0.46 * Math.cos(2 * Math.PI * i / (data.length - 1));
    }
  }
  
  computeFFT(input, output) {
    // FFT implementation (simplified)
    // In practice, use a library like fft.js
  }
  
  computePower(fft, power) {
    // Compute power spectrum
    for (let i = 0; i < power.length; i++) {
      const real = fft[i * 2];
      const imag = fft[i * 2 + 1];
      power[i] = real * real + imag * imag;
    }
  }
}
```

## Multi-threading Considerations

### Worker Thread Integration

```javascript
// main.js
import { Worker } from 'worker_threads';
import { StreamInlet, resolveStreams } from 'node-labstreaminglayer';

class ThreadedProcessor {
  constructor(numWorkers = 4) {
    this.workers = [];
    this.currentWorker = 0;
    
    // Create worker pool
    for (let i = 0; i < numWorkers; i++) {
      const worker = new Worker('./processor-worker.js');
      this.workers.push(worker);
      
      worker.on('message', (result) => {
        this.handleResult(result);
      });
    }
  }
  
  async start() {
    // Connect to stream in main thread
    const streams = resolveStreams(2.0);
    if (streams.length === 0) return;
    
    const inlet = new StreamInlet(streams[0]);
    
    // Distribute work to workers
    setInterval(() => {
      try {
        const [samples, timestamps] = inlet.pullChunk(0.0, 100);
        
        if (samples.length > 0) {
          // Round-robin distribution
          this.workers[this.currentWorker].postMessage({
            samples,
            timestamps
          });
          
          this.currentWorker = (this.currentWorker + 1) % this.workers.length;
        }
      } catch (e) {
        // No data
      }
    }, 10);
  }
  
  handleResult(result) {
    console.log('Processed:', result);
  }
  
  stop() {
    this.workers.forEach(worker => worker.terminate());
  }
}

// processor-worker.js
import { parentPort } from 'worker_threads';

parentPort.on('message', (data) => {
  const { samples, timestamps } = data;
  
  // Heavy processing
  const results = samples.map((sample, i) => {
    // Complex calculations
    const processed = performFFT(sample);
    const features = extractFeatures(processed);
    
    return {
      timestamp: timestamps[i],
      features
    };
  });
  
  // Send results back
  parentPort.postMessage(results);
});

function performFFT(data) {
  // FFT implementation
}

function extractFeatures(spectrum) {
  // Feature extraction
}
```

## Custom Post-processing

### Implementing Custom Filters

```javascript
class CustomFilter {
  constructor(inlet) {
    this.inlet = inlet;
    
    // IIR filter coefficients (example: 50Hz notch)
    this.b = [0.9695, -1.9391, 0.9695];
    this.a = [1.0000, -1.9391, 0.9391];
    
    // Filter state for each channel
    this.channels = inlet.info().channelCount();
    this.state = Array(this.channels).fill(null).map(() => ({
      x: [0, 0],
      y: [0, 0]
    }));
  }
  
  pullFiltered(timeout = 1.0) {
    const [sample, timestamp] = this.inlet.pullSample(timeout);
    
    // Apply filter to each channel
    const filtered = sample.map((value, ch) => {
      return this.applyFilter(value, ch);
    });
    
    return [filtered, timestamp];
  }
  
  applyFilter(input, channel) {
    const s = this.state[channel];
    
    // Shift state
    s.x[1] = s.x[0];
    s.x[0] = input;
    s.y[1] = s.y[0];
    
    // Apply filter
    s.y[0] = this.b[0] * s.x[0] + 
             this.b[1] * s.x[1] + 
             this.b[2] * s.x[2] -
             this.a[1] * s.y[1] - 
             this.a[2] * s.y[2];
    
    return s.y[0];
  }
}
```

### Real-time Feature Extraction

```javascript
class FeatureExtractor {
  constructor(inlet, windowSize = 256) {
    this.inlet = inlet;
    this.windowSize = windowSize;
    this.buffer = [];
  }
  
  async extractFeatures() {
    // Fill buffer
    while (this.buffer.length < this.windowSize) {
      const [sample, timestamp] = this.inlet.pullSample(1.0);
      this.buffer.push({ sample, timestamp });
    }
    
    // Extract features from window
    const features = {
      timestamp: this.buffer[this.buffer.length - 1].timestamp,
      mean: this.calculateMean(),
      std: this.calculateStd(),
      power: this.calculatePower(),
      zeroCrossings: this.calculateZeroCrossings(),
      spectralCentroid: this.calculateSpectralCentroid()
    };
    
    // Slide window
    this.buffer = this.buffer.slice(this.windowSize / 2);
    
    return features;
  }
  
  calculateMean() {
    const sum = this.buffer.reduce((acc, item) => {
      return acc + item.sample.reduce((a, b) => a + b, 0);
    }, 0);
    
    return sum / (this.buffer.length * this.buffer[0].sample.length);
  }
  
  calculateStd() {
    const mean = this.calculateMean();
    const variance = this.buffer.reduce((acc, item) => {
      return acc + item.sample.reduce((a, val) => {
        return a + Math.pow(val - mean, 2);
      }, 0);
    }, 0) / (this.buffer.length * this.buffer[0].sample.length);
    
    return Math.sqrt(variance);
  }
  
  calculatePower() {
    return this.buffer.reduce((acc, item) => {
      return acc + item.sample.reduce((a, val) => a + val * val, 0);
    }, 0) / this.buffer.length;
  }
  
  calculateZeroCrossings() {
    let crossings = 0;
    
    for (let ch = 0; ch < this.buffer[0].sample.length; ch++) {
      for (let i = 1; i < this.buffer.length; i++) {
        const prev = this.buffer[i - 1].sample[ch];
        const curr = this.buffer[i].sample[ch];
        
        if (prev * curr < 0) {
          crossings++;
        }
      }
    }
    
    return crossings;
  }
  
  calculateSpectralCentroid() {
    // Simplified spectral centroid
    // In practice, compute FFT first
    return 0; // Placeholder
  }
}
```

## Stream Recovery

### Automatic Recovery System

```javascript
class ResilientStream {
  constructor(streamPredicate, maxRetries = 5) {
    this.predicate = streamPredicate;
    this.maxRetries = maxRetries;
    this.inlet = null;
    this.outlet = null;
    this.connected = false;
    this.retryCount = 0;
    
    this.startMonitoring();
  }
  
  async startMonitoring() {
    while (true) {
      if (!this.connected) {
        await this.attemptConnection();
      } else {
        await this.checkConnection();
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  async attemptConnection() {
    try {
      console.log(`Connection attempt ${this.retryCount + 1}/${this.maxRetries}`);
      
      const streams = resolveByPred(this.predicate, 1, 5.0);
      
      if (streams.length > 0) {
        // Create inlet with recovery enabled
        this.inlet = new StreamInlet(streams[0], 360, 0, true);
        
        // Test connection
        this.inlet.pullSample(1.0);
        
        this.connected = true;
        this.retryCount = 0;
        console.log('Connected successfully');
        
        // Notify listeners
        this.onConnect();
      }
    } catch (error) {
      this.retryCount++;
      
      if (this.retryCount >= this.maxRetries) {
        console.error('Max retries reached');
        this.onMaxRetriesReached();
        this.retryCount = 0;
      }
      
      // Exponential backoff
      const delay = Math.min(1000 * Math.pow(2, this.retryCount), 30000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  async checkConnection() {
    try {
      // Check if stream is still alive
      if (this.inlet.wasClockReset()) {
        console.log('Clock reset detected');
        this.handleClockReset();
      }
      
      // Try to pull sample
      this.inlet.pullSample(0.0);
    } catch (error) {
      if (error.name === 'LostError' || error.name === 'TimeoutError') {
        console.log('Connection lost');
        this.connected = false;
        
        if (this.inlet) {
          this.inlet.destroy();
          this.inlet = null;
        }
        
        this.onDisconnect();
      }
    }
  }
  
  handleClockReset() {
    // Handle clock discontinuity
    console.log('Handling clock reset...');
    this.inlet.flush(); // Clear buffer
  }
  
  onConnect() {
    // Override in subclass
  }
  
  onDisconnect() {
    // Override in subclass
  }
  
  onMaxRetriesReached() {
    // Override in subclass
  }
}
```

## Best Practices Summary

1. **Use chunks for high-throughput data** - Reduces network overhead
2. **Pre-allocate buffers** - Avoids garbage collection pressure
3. **Enable time correction flags** - Ensures synchronized recording
4. **Implement connection recovery** - Handles network interruptions
5. **Use worker threads for heavy processing** - Prevents blocking
6. **Monitor buffer levels** - Prevents overflow/underflow
7. **Clean up resources properly** - Prevents memory leaks
8. **Use typed arrays for numeric data** - Better performance
9. **Implement exponential backoff** - For connection retries
10. **Profile your application** - Identify bottlenecks

## Next Steps

- Review [Examples](./examples.md) for complete implementations
- Check [Troubleshooting](./troubleshooting.md) for common issues
- See [Architecture](./architecture.md) for internal details