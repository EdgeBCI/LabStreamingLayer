# Troubleshooting Guide

Solutions for common issues with node-labstreaminglayer.

## Table of Contents

- [Installation Issues](#installation-issues)
- [Connection Problems](#connection-problems)
- [Performance Issues](#performance-issues)
- [Data Issues](#data-issues)
- [Platform-Specific Issues](#platform-specific-issues)
- [Error Messages](#error-messages)
- [Debugging Techniques](#debugging-techniques)

## Installation Issues

### Issue: Module Not Found

**Error:**
```
Error: Cannot find module 'node-labstreaminglayer'
```

**Solutions:**

1. Ensure proper installation:
```bash
npm install node-labstreaminglayer
```

2. Check package.json:
```json
{
  "dependencies": {
    "node-labstreaminglayer": "^0.1.0"
  }
}
```

3. Clear npm cache and reinstall:
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Issue: Native Library Loading Failed

**Error:**
```
Error: Could not load native library lsl_amd64.dll
```

**Solutions:**

1. Check platform compatibility:
```javascript
import { platform, arch } from 'os';
console.log(`Platform: ${platform()}, Architecture: ${arch()}`);
```

2. Verify library files exist:
```bash
# Check prebuild directory
ls node_modules/node-labstreaminglayer/prebuild/
```

3. Install Visual C++ Redistributables (Windows):
   - Download from Microsoft website
   - Install both x64 and x86 versions

4. Set library path (Linux/macOS):
```bash
export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:./node_modules/node-labstreaminglayer/prebuild
```

### Issue: TypeScript Types Not Found

**Error:**
```
Could not find a declaration file for module 'node-labstreaminglayer'
```

**Solution:**

Ensure TypeScript is configured properly:

```json
// tsconfig.json
{
  "compilerOptions": {
    "moduleResolution": "node",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true
  }
}
```

## Connection Problems

### Issue: No Streams Found

**Problem:** `resolveStreams()` returns empty array

**Solutions:**

1. **Check network connection:**
```javascript
import { resolveStreams } from 'node-labstreaminglayer';

// Increase wait time
const streams = resolveStreams(5.0); // Wait 5 seconds

if (streams.length === 0) {
  console.log('No streams found. Troubleshooting:');
  console.log('1. Is the outlet running?');
  console.log('2. Are both apps on the same network?');
  console.log('3. Is firewall blocking LSL?');
}
```

2. **Verify firewall settings:**
   - Allow UDP port 16571 (default LSL multicast)
   - Allow your application through firewall

3. **Test with local stream:**
```javascript
// Create local test stream
import { StreamInfo, StreamOutlet } from 'node-labstreaminglayer';

const testInfo = new StreamInfo('TestStream', 'Test', 1, 100, 'float32');
const testOutlet = new StreamOutlet(testInfo);

// Now try to find it
setTimeout(() => {
  const found = resolveStreams(1.0);
  console.log(`Found ${found.length} streams`);
}, 100);
```

4. **Check multicast settings:**
```javascript
// Set environment variables before importing
process.env.LSL_MULTICAST_TTL = '1';  // Local network only
process.env.LSL_KNOWN_PEERS = '127.0.0.1';  // Force localhost

import { resolveStreams } from 'node-labstreaminglayer';
```

### Issue: Stream Connection Lost

**Error:**
```
LostError: The stream has been lost
```

**Solutions:**

1. **Implement automatic reconnection:**
```javascript
class ResilientConnection {
  constructor(streamName) {
    this.streamName = streamName;
    this.inlet = null;
    this.connect();
  }
  
  async connect() {
    while (!this.inlet) {
      try {
        const streams = resolveByProp('name', this.streamName, 1, 5.0);
        if (streams.length > 0) {
          this.inlet = new StreamInlet(streams[0], 360, 0, true); // recover=true
          console.log('Connected');
          return;
        }
      } catch (error) {
        console.log('Retrying connection...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
  
  async pullSample() {
    try {
      return this.inlet.pullSample();
    } catch (error) {
      if (error.name === 'LostError') {
        console.log('Connection lost, reconnecting...');
        this.inlet = null;
        await this.connect();
        return this.pullSample();
      }
      throw error;
    }
  }
}
```

2. **Check network stability:**
```javascript
// Monitor connection quality
class ConnectionMonitor {
  constructor(inlet) {
    this.inlet = inlet;
    this.lostSamples = 0;
    this.totalSamples = 0;
  }
  
  async monitor() {
    setInterval(() => {
      const available = this.inlet.samplesAvailable();
      console.log(`Samples in buffer: ${available}`);
      
      if (available > 1000) {
        console.warn('Buffer building up - possible network issue');
      }
    }, 1000);
  }
  
  checkClockReset() {
    if (this.inlet.wasClockReset()) {
      console.warn('Clock reset detected - possible connection interruption');
      this.inlet.flush(); // Clear buffer
    }
  }
}
```

### Issue: Cannot Connect to Remote Stream

**Problem:** Streams on different machines can't connect

**Solutions:**

1. **Configure known peers:**
```javascript
// On both machines
process.env.LSL_KNOWN_PEERS = '192.168.1.100,192.168.1.101';
```

2. **Check network configuration:**
```bash
# Test network connectivity
ping <remote_ip>

# Check if port is open
telnet <remote_ip> 16571
```

3. **Disable IPv6 (if causing issues):**
```javascript
process.env.LSL_IPV6 = 'disable';
```

## Performance Issues

### Issue: High CPU Usage

**Solutions:**

1. **Optimize pulling strategy:**
```javascript
// Bad: Tight polling loop
while (true) {
  try {
    const [sample] = inlet.pullSample(0.0);
  } catch (e) {}
}

// Good: Use appropriate delays
setInterval(() => {
  try {
    const [sample] = inlet.pullSample(0.0);
  } catch (e) {}
}, 10); // 10ms delay

// Better: Pull chunks
setInterval(() => {
  const [samples] = inlet.pullChunk(0.0, 100);
  // Process batch
}, 100);
```

2. **Use worker threads for processing:**
```javascript
import { Worker } from 'worker_threads';

const worker = new Worker(`
  const { parentPort } = require('worker_threads');
  
  parentPort.on('message', (samples) => {
    // Heavy processing here
    const results = processData(samples);
    parentPort.postMessage(results);
  });
`, { eval: true });

// Send data to worker
const [samples] = inlet.pullChunk(0.0, 1000);
worker.postMessage(samples);
```

### Issue: High Memory Usage

**Solutions:**

1. **Adjust buffer sizes:**
```javascript
// Reduce buffer size for low-latency apps
const inlet = new StreamInlet(
  info,
  10,    // Only 10 seconds of buffer instead of default 360
  100    // Smaller chunk size
);
```

2. **Implement memory pooling:**
```javascript
class MemoryPool {
  constructor(size, channels) {
    this.buffers = [];
    this.index = 0;
    
    for (let i = 0; i < size; i++) {
      this.buffers.push(new Float32Array(channels));
    }
  }
  
  getBuffer() {
    const buffer = this.buffers[this.index];
    this.index = (this.index + 1) % this.buffers.length;
    return buffer;
  }
}

const pool = new MemoryPool(10, 32);
// Reuse buffers instead of creating new ones
```

3. **Monitor memory usage:**
```javascript
setInterval(() => {
  const usage = process.memoryUsage();
  console.log(`Memory: ${(usage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  
  if (usage.heapUsed > 500 * 1024 * 1024) {
    console.warn('High memory usage detected');
    // Trigger garbage collection if needed
    if (global.gc) global.gc();
  }
}, 5000);
```

### Issue: Dropped Samples

**Solutions:**

1. **Increase buffer size:**
```javascript
const inlet = new StreamInlet(
  info,
  600,   // Larger buffer: 10 minutes
  10000  // Larger chunks
);
```

2. **Process data more efficiently:**
```javascript
// Use chunks instead of single samples
class EfficientProcessor {
  async process() {
    // Pull large chunks
    const [samples, timestamps] = this.inlet.pullChunk(0.1, 1000);
    
    if (samples.length > 0) {
      // Process entire batch at once
      await this.processBatch(samples, timestamps);
    }
  }
  
  async processBatch(samples, timestamps) {
    // Batch processing is more efficient
    const results = await Promise.all(
      samples.map((s, i) => this.processOne(s, timestamps[i]))
    );
    return results;
  }
}
```

## Data Issues

### Issue: Incorrect Data Values

**Problem:** Received data doesn't match sent data

**Solutions:**

1. **Check data type compatibility:**
```javascript
// Verify channel format matches
const outletFormat = outletInfo.channelFormat();
const inletFormat = inletInfo.channelFormat();

if (outletFormat !== inletFormat) {
  console.error('Format mismatch!');
}
```

2. **Validate data ranges:**
```javascript
// For int16 streams
function validateInt16(value) {
  if (value < -32768 || value > 32767) {
    console.warn(`Value ${value} out of int16 range`);
    return Math.max(-32768, Math.min(32767, value));
  }
  return value;
}
```

3. **Check for timestamp issues:**
```javascript
let lastTimestamp = 0;

function checkTimestamp(timestamp) {
  if (timestamp < lastTimestamp) {
    console.warn('Timestamp went backwards!');
  }
  
  const gap = timestamp - lastTimestamp;
  if (gap > 1.0) {
    console.warn(`Large time gap: ${gap} seconds`);
  }
  
  lastTimestamp = timestamp;
}
```

### Issue: Missing Samples

**Solutions:**

1. **Check sample availability:**
```javascript
const available = inlet.samplesAvailable();
console.log(`${available} samples available`);

if (available === 0) {
  console.log('No samples available - check outlet');
}
```

2. **Verify outlet is sending:**
```javascript
// On outlet side
let samplesSent = 0;
setInterval(() => {
  outlet.pushSample(data);
  samplesSent++;
  
  if (samplesSent % 100 === 0) {
    console.log(`Sent ${samplesSent} samples`);
  }
}, 10);
```

## Platform-Specific Issues

### Windows Issues

**Issue: DLL Load Failed**

**Solutions:**

1. Install Visual C++ Redistributables:
```powershell
# Check installed versions
wmic product get name | findstr "Visual C++"
```

2. Check DLL dependencies:
```powershell
# Use Dependency Walker or similar tool
dumpbin /dependents lsl_amd64.dll
```

3. Set PATH environment:
```javascript
process.env.PATH = `${process.env.PATH};${__dirname}/prebuild`;
```

### macOS Issues

**Issue: Library Not Loaded**

**Solutions:**

1. Check library signing:
```bash
codesign -v lsl.dylib
```

2. Allow unsigned libraries:
```bash
sudo spctl --add lsl.dylib
```

3. Fix library paths:
```bash
otool -L lsl.dylib
install_name_tool -change @rpath/lsl.dylib @loader_path/lsl.dylib lsl.dylib
```

### Linux Issues

**Issue: Shared Library Not Found**

**Solutions:**

1. Install liblsl:
```bash
sudo apt-get install liblsl
# or
sudo yum install liblsl
```

2. Set library path:
```bash
export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:/usr/local/lib
ldconfig
```

3. Check library dependencies:
```bash
ldd lsl.so
```

## Error Messages

### Common Errors and Solutions

#### TimeoutError
```javascript
try {
  const [sample, timestamp] = inlet.pullSample(1.0);
} catch (error) {
  if (error.name === 'TimeoutError') {
    // Normal - no data available within timeout
    // Solutions:
    // 1. Increase timeout
    // 2. Check if outlet is sending
    // 3. Use non-blocking pull (timeout=0)
  }
}
```

#### LostError
```javascript
try {
  inlet.pullSample();
} catch (error) {
  if (error.name === 'LostError') {
    // Stream connection lost
    // Solutions:
    // 1. Recreate inlet
    // 2. Check network connection
    // 3. Enable recovery mode
  }
}
```

#### InvalidArgumentError
```javascript
try {
  // Wrong number of channels
  outlet.pushSample([1, 2, 3]); // Expected 4
} catch (error) {
  if (error.name === 'InvalidArgumentError') {
    // Check arguments
    console.log('Expected channels:', info.channelCount());
  }
}
```

## Debugging Techniques

### Enable Debug Output

```javascript
// Create debug wrapper
class DebugStream {
  constructor(stream, name) {
    this.stream = stream;
    this.name = name;
    this.sampleCount = 0;
  }
  
  pushSample(sample, timestamp, pushthrough) {
    console.log(`[${this.name}] Pushing sample #${++this.sampleCount}`);
    console.log(`  Data: ${sample.slice(0, 3)}...`);
    console.log(`  Time: ${timestamp || 'auto'}`);
    
    return this.stream.pushSample(sample, timestamp, pushthrough);
  }
  
  pullSample(timeout) {
    const result = this.stream.pullSample(timeout);
    console.log(`[${this.name}] Pulled sample`);
    console.log(`  Data: ${result[0].slice(0, 3)}...`);
    console.log(`  Time: ${result[1]}`);
    
    return result;
  }
}
```

### Stream Diagnostics

```javascript
class StreamDiagnostics {
  static async runDiagnostics() {
    console.log('=== LSL Diagnostics ===\n');
    
    // Check library
    console.log('Library version:', libraryVersion());
    console.log('Protocol version:', protocolVersion());
    console.log('Library info:', libraryInfo());
    
    // Check clock
    const t1 = localClock();
    await new Promise(resolve => setTimeout(resolve, 1000));
    const t2 = localClock();
    console.log(`Clock test: ${(t2 - t1).toFixed(3)} seconds`);
    
    // Check network
    console.log('\nSearching for streams...');
    const streams = resolveStreams(2.0);
    console.log(`Found ${streams.length} streams:`);
    
    streams.forEach(stream => {
      console.log(`  - ${stream.name()} (${stream.type()})`);
      console.log(`    Channels: ${stream.channelCount()}`);
      console.log(`    Rate: ${stream.nominalSrate()} Hz`);
      console.log(`    Format: ${fmt2string[stream.channelFormat()]}`);
    });
    
    // Test local stream
    console.log('\nTesting local stream...');
    const info = new StreamInfo('DiagTest', 'Test', 1, 100, 'float32');
    const outlet = new StreamOutlet(info);
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const found = resolveByProp('name', 'DiagTest', 1, 1.0);
    if (found.length > 0) {
      console.log('✓ Local stream test passed');
      
      const inlet = new StreamInlet(found[0]);
      outlet.pushSample([42.0]);
      
      try {
        const [sample] = inlet.pullSample(1.0);
        if (sample[0] === 42.0) {
          console.log('✓ Data transmission test passed');
        }
      } catch (e) {
        console.log('✗ Data transmission test failed:', e.message);
      }
      
      inlet.destroy();
    } else {
      console.log('✗ Local stream test failed');
    }
    
    outlet.destroy();
    console.log('\n=== Diagnostics Complete ===');
  }
}

// Run diagnostics
StreamDiagnostics.runDiagnostics();
```

### Performance Profiling

```javascript
class PerformanceProfiler {
  constructor(name) {
    this.name = name;
    this.metrics = {
      samples: 0,
      bytes: 0,
      errors: 0,
      startTime: Date.now()
    };
  }
  
  recordSample(sample) {
    this.metrics.samples++;
    this.metrics.bytes += sample.length * 4; // Assuming float32
  }
  
  recordError(error) {
    this.metrics.errors++;
    console.error(`[${this.name}] Error:`, error);
  }
  
  report() {
    const elapsed = (Date.now() - this.metrics.startTime) / 1000;
    const rate = this.metrics.samples / elapsed;
    const throughput = this.metrics.bytes / elapsed / 1024 / 1024;
    
    console.log(`=== ${this.name} Performance ===`);
    console.log(`Duration: ${elapsed.toFixed(1)}s`);
    console.log(`Samples: ${this.metrics.samples}`);
    console.log(`Rate: ${rate.toFixed(1)} Hz`);
    console.log(`Throughput: ${throughput.toFixed(2)} MB/s`);
    console.log(`Errors: ${this.metrics.errors}`);
  }
}

// Usage
const profiler = new PerformanceProfiler('MyStream');

setInterval(() => {
  try {
    const [sample] = inlet.pullSample(0.0);
    profiler.recordSample(sample);
  } catch (error) {
    profiler.recordError(error);
  }
}, 10);

// Report every 10 seconds
setInterval(() => profiler.report(), 10000);
```

## Getting Help

If you're still experiencing issues:

1. **Check the examples:** Review the [Examples](./examples.md) for working code
2. **Review the API:** See the [API Reference](./api-reference.md) for correct usage
3. **File an issue:** Report bugs at [GitHub Issues](https://github.com/EdgeBCI/LabStreamingLayer/issues)
4. **Community support:** Visit the [LSL Community](https://labstreaminglayer.org)

When reporting issues, please include:
- Node.js version (`node --version`)
- npm version (`npm --version`)
- Operating system and version
- Complete error message and stack trace
- Minimal code example that reproduces the issue