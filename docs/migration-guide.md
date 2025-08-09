# Migration Guide

Guide for migrating from other LSL implementations to node-labstreaminglayer.

## Table of Contents

- [Migrating from Python (pylsl)](#migrating-from-python-pylsl)
- [Migrating from C++ API](#migrating-from-c-api)
- [Migrating from MATLAB](#migrating-from-matlab)
- [Migrating from Java](#migrating-from-java)
- [API Comparison](#api-comparison)
- [Common Migration Patterns](#common-migration-patterns)

## Migrating from Python (pylsl)

### Basic Concepts Mapping

| Python (pylsl) | Node.js (node-labstreaminglayer) |
|---------------|-----------------------------------|
| `import pylsl` | `import { ... } from 'node-labstreaminglayer'` |
| `pylsl.StreamInfo()` | `new StreamInfo()` |
| `pylsl.StreamOutlet()` | `new StreamOutlet()` |
| `pylsl.StreamInlet()` | `new StreamInlet()` |
| `pylsl.resolve_streams()` | `resolveStreams()` |
| `pylsl.local_clock()` | `localClock()` |

### Creating Streams

#### Python (pylsl)
```python
import pylsl

# Create stream info
info = pylsl.StreamInfo(
    name='MyStream',
    type='EEG',
    channel_count=8,
    nominal_srate=250,
    channel_format=pylsl.cf_float32,
    source_id='myuid123'
)

# Create outlet
outlet = pylsl.StreamOutlet(info)

# Send data
sample = [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0]
outlet.push_sample(sample)
```

#### Node.js (node-labstreaminglayer)
```javascript
import { StreamInfo, StreamOutlet } from 'node-labstreaminglayer';

// Create stream info
const info = new StreamInfo(
    'MyStream',     // name
    'EEG',          // type
    8,              // channel_count
    250,            // nominal_srate
    'float32',      // channel_format (string or constant)
    'myuid123'      // source_id
);

// Create outlet
const outlet = new StreamOutlet(info);

// Send data
const sample = [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0];
outlet.pushSample(sample);
```

### Receiving Data

#### Python (pylsl)
```python
# Find streams
streams = pylsl.resolve_stream('type', 'EEG')

# Create inlet
inlet = pylsl.StreamInlet(streams[0])

# Pull sample
sample, timestamp = inlet.pull_sample()

# Pull chunk
samples, timestamps = inlet.pull_chunk()
```

#### Node.js (node-labstreaminglayer)
```javascript
// Find streams
const streams = resolveByProp('type', 'EEG');

// Create inlet
const inlet = new StreamInlet(streams[0]);

// Pull sample
const [sample, timestamp] = inlet.pullSample();

// Pull chunk
const [samples, timestamps] = inlet.pullChunk();
```

### Key Differences

1. **Method naming convention:**
   - Python uses snake_case: `push_sample`, `pull_chunk`
   - Node.js uses camelCase: `pushSample`, `pullChunk`

2. **Return values:**
   - Python returns tuples: `sample, timestamp = inlet.pull_sample()`
   - Node.js returns arrays: `const [sample, timestamp] = inlet.pullSample()`

3. **Channel format specification:**
   - Python uses constants: `pylsl.cf_float32`
   - Node.js accepts strings or constants: `'float32'` or `cf_float32`

4. **Error handling:**
   - Python raises exceptions: `pylsl.TimeoutError`
   - Node.js throws errors: `TimeoutError` class

### Advanced Features

#### Stream Metadata (Python)
```python
# Python
desc = info.desc()
channels = desc.append_child("channels")
for label in ['C3', 'C4', 'Cz']:
    ch = channels.append_child("channel")
    ch.append_child_value("label", label)
    ch.append_child_value("unit", "microvolts")
```

#### Stream Metadata (Node.js)
```javascript
// Node.js
const desc = info.desc();
const channels = desc.appendChild("channels");
for (const label of ['C3', 'C4', 'Cz']) {
    const ch = channels.appendChild("channel");
    ch.appendChildValue("label", label);
    ch.appendChildValue("unit", "microvolts");
}
```

### Complete Migration Example

#### Original Python Code
```python
import pylsl
import time
import random

# Producer
def create_outlet():
    info = pylsl.StreamInfo('PythonStream', 'EEG', 8, 100, 
                           pylsl.cf_float32, 'py123')
    outlet = pylsl.StreamOutlet(info)
    
    while True:
        sample = [random.random() for _ in range(8)]
        outlet.push_sample(sample)
        time.sleep(0.01)

# Consumer
def create_inlet():
    streams = pylsl.resolve_stream('name', 'PythonStream')
    inlet = pylsl.StreamInlet(streams[0])
    
    while True:
        sample, timestamp = inlet.pull_sample()
        print(f"Received: {sample[0]:.3f} at {timestamp:.3f}")
```

#### Migrated Node.js Code
```javascript
import { StreamInfo, StreamOutlet, StreamInlet, resolveByProp } from 'node-labstreaminglayer';

// Producer
function createOutlet() {
    const info = new StreamInfo('NodeStream', 'EEG', 8, 100, 
                               'float32', 'node123');
    const outlet = new StreamOutlet(info);
    
    setInterval(() => {
        const sample = Array.from({length: 8}, () => Math.random());
        outlet.pushSample(sample);
    }, 10);
}

// Consumer
async function createInlet() {
    const streams = resolveByProp('name', 'NodeStream');
    const inlet = new StreamInlet(streams[0]);
    
    setInterval(() => {
        try {
            const [sample, timestamp] = inlet.pullSample(0.1);
            console.log(`Received: ${sample[0].toFixed(3)} at ${timestamp.toFixed(3)}`);
        } catch (e) {
            // Handle timeout
        }
    }, 10);
}
```

## Migrating from C++ API

### Header Inclusion

#### C++
```cpp
#include <lsl_cpp.h>
using namespace lsl;
```

#### Node.js
```javascript
import { StreamInfo, StreamOutlet, StreamInlet } from 'node-labstreaminglayer';
```

### Stream Creation

#### C++
```cpp
// Create stream info
stream_info info("MyStream", "EEG", 8, 250, cf_float32, "myuid");

// Create outlet
stream_outlet outlet(info);

// Send sample
std::vector<float> sample(8);
outlet.push_sample(sample);
```

#### Node.js
```javascript
// Create stream info
const info = new StreamInfo("MyStream", "EEG", 8, 250, 'float32', "myuid");

// Create outlet
const outlet = new StreamOutlet(info);

// Send sample
const sample = new Float32Array(8);
outlet.pushSample(sample);
```

### Key Differences from C++

1. **Memory management:**
   - C++: Manual memory management or RAII
   - Node.js: Automatic garbage collection with FinalizationRegistry

2. **Templates vs Dynamic typing:**
   - C++: `push_sample<float>()`, `push_sample<double>()`
   - Node.js: Single `pushSample()` method with type inference

3. **Synchronous vs Asynchronous:**
   - C++: Blocking calls by default
   - Node.js: Non-blocking with timeouts

### Complex C++ Example Migration

#### Original C++ Code
```cpp
#include <lsl_cpp.h>
#include <thread>
#include <chrono>

void stream_data() {
    lsl::stream_info info("CppStream", "EEG", 32, 256, 
                         lsl::cf_float32, "cpp_source");
    
    // Add channel labels
    lsl::xml_element channels = info.desc().append_child("channels");
    for (int i = 0; i < 32; i++) {
        channels.append_child("channel")
            .append_child_value("label", "Ch" + std::to_string(i))
            .append_child_value("unit", "microvolts");
    }
    
    lsl::stream_outlet outlet(info);
    
    std::vector<float> sample(32);
    while (true) {
        for (int i = 0; i < 32; i++) {
            sample[i] = std::sin(i * 0.1) * 100;
        }
        outlet.push_sample(sample);
        std::this_thread::sleep_for(std::chrono::milliseconds(4));
    }
}
```

#### Migrated Node.js Code
```javascript
import { StreamInfo, StreamOutlet } from 'node-labstreaminglayer';

function streamData() {
    const info = new StreamInfo("NodeStream", "EEG", 32, 256, 
                               'float32', "node_source");
    
    // Add channel labels
    const channels = info.desc().appendChild("channels");
    for (let i = 0; i < 32; i++) {
        channels.appendChild("channel")
            .appendChildValue("label", `Ch${i}`)
            .appendChildValue("unit", "microvolts");
    }
    
    const outlet = new StreamOutlet(info);
    
    const sample = new Float32Array(32);
    setInterval(() => {
        for (let i = 0; i < 32; i++) {
            sample[i] = Math.sin(i * 0.1) * 100;
        }
        outlet.pushSample(sample);
    }, 4);
}
```

## Migrating from MATLAB

### Basic Operations

#### MATLAB
```matlab
% Load library
lib = lsl_loadlib();

% Create stream info
info = lsl_streaminfo(lib, 'MatlabStream', 'EEG', 8, 250, 'cf_float32', 'mat123');

% Create outlet
outlet = lsl_outlet(info);

% Send data
sample = randn(1, 8);
outlet.push_sample(sample);
```

#### Node.js
```javascript
// Import library
import { StreamInfo, StreamOutlet } from 'node-labstreaminglayer';

// Create stream info
const info = new StreamInfo('NodeStream', 'EEG', 8, 250, 'float32', 'node123');

// Create outlet
const outlet = new StreamOutlet(info);

// Send data
const sample = Array.from({length: 8}, () => Math.random());
outlet.pushSample(sample);
```

### Key Differences from MATLAB

1. **Array indexing:**
   - MATLAB: 1-based indexing
   - Node.js: 0-based indexing

2. **Matrix operations:**
   - MATLAB: Built-in matrix operations
   - Node.js: Use libraries or manual implementation

3. **Data types:**
   - MATLAB: Everything is a matrix
   - Node.js: Explicit arrays and typed arrays

## Migrating from Java

### Stream Creation Comparison

#### Java
```java
import edu.ucsd.sccn.LSL;

// Create stream info
LSL.StreamInfo info = new LSL.StreamInfo(
    "JavaStream", "EEG", 8, 250, 
    LSL.ChannelFormat.float32, "java123"
);

// Create outlet
LSL.StreamOutlet outlet = new LSL.StreamOutlet(info);

// Send sample
float[] sample = new float[8];
outlet.push_sample(sample);
```

#### Node.js
```javascript
import { StreamInfo, StreamOutlet } from 'node-labstreaminglayer';

// Create stream info
const info = new StreamInfo(
    "NodeStream", "EEG", 8, 250, 
    'float32', "node123"
);

// Create outlet
const outlet = new StreamOutlet(info);

// Send sample
const sample = new Float32Array(8);
outlet.pushSample(sample);
```

## API Comparison

### Method Name Mapping

| Operation | Python | C++ | MATLAB | Java | Node.js |
|-----------|--------|-----|--------|------|---------|
| Create info | `StreamInfo()` | `stream_info()` | `lsl_streaminfo()` | `new StreamInfo()` | `new StreamInfo()` |
| Create outlet | `StreamOutlet()` | `stream_outlet()` | `lsl_outlet()` | `new StreamOutlet()` | `new StreamOutlet()` |
| Create inlet | `StreamInlet()` | `stream_inlet()` | `lsl_inlet()` | `new StreamInlet()` | `new StreamInlet()` |
| Push sample | `push_sample()` | `push_sample()` | `push_sample()` | `push_sample()` | `pushSample()` |
| Pull sample | `pull_sample()` | `pull_sample()` | `pull_sample()` | `pull_sample()` | `pullSample()` |
| Push chunk | `push_chunk()` | `push_chunk()` | `push_chunk()` | `push_chunk()` | `pushChunk()` |
| Pull chunk | `pull_chunk()` | `pull_chunk()` | `pull_chunk()` | `pull_chunk()` | `pullChunk()` |
| Find streams | `resolve_stream()` | `resolve_stream()` | `lsl_resolve_all()` | `resolve_stream()` | `resolveStreams()` |
| Local clock | `local_clock()` | `local_clock()` | `lsl_local_clock()` | `local_clock()` | `localClock()` |

### Data Type Mapping

| LSL Type | Python | C++ | MATLAB | Java | Node.js |
|----------|--------|-----|--------|------|---------|
| float32 | `numpy.float32` | `float` | `single` | `float` | `Float32Array` |
| double64 | `numpy.float64` | `double` | `double` | `double` | `Float64Array` |
| string | `str` | `std::string` | `char` | `String` | `string` |
| int32 | `numpy.int32` | `int32_t` | `int32` | `int` | `Int32Array` |
| int16 | `numpy.int16` | `int16_t` | `int16` | `short` | `Int16Array` |
| int8 | `numpy.int8` | `int8_t` | `int8` | `byte` | `Int8Array` |
| int64 | `numpy.int64` | `int64_t` | `int64` | `long` | `BigInt64Array` |

## Common Migration Patterns

### Pattern 1: Continuous Data Streaming

#### Python Pattern
```python
import pylsl
import numpy as np

def stream_continuous():
    info = pylsl.StreamInfo('Data', 'EEG', 32, 256, pylsl.cf_float32)
    outlet = pylsl.StreamOutlet(info)
    
    while True:
        data = np.random.randn(32)
        outlet.push_sample(data)
        time.sleep(1/256)
```

#### Node.js Equivalent
```javascript
import { StreamInfo, StreamOutlet, localClock } from 'node-labstreaminglayer';

function streamContinuous() {
    const info = new StreamInfo('Data', 'EEG', 32, 256, 'float32');
    const outlet = new StreamOutlet(info);
    
    const startTime = localClock();
    let sampleIndex = 0;
    
    setInterval(() => {
        const targetSamples = Math.floor((localClock() - startTime) * 256);
        
        while (sampleIndex < targetSamples) {
            const data = new Float32Array(32).map(() => Math.random());
            outlet.pushSample(data);
            sampleIndex++;
        }
    }, 4); // Check every 4ms
}
```

### Pattern 2: Event Markers

#### Python Pattern
```python
def send_markers():
    info = pylsl.StreamInfo('Markers', 'Markers', 1, 0, pylsl.cf_string)
    outlet = pylsl.StreamOutlet(info)
    
    outlet.push_sample(['event_start'])
    # ... do something ...
    outlet.push_sample(['event_end'])
```

#### Node.js Equivalent
```javascript
function sendMarkers() {
    const info = new StreamInfo('Markers', 'Markers', 1, 0, 'string');
    const outlet = new StreamOutlet(info);
    
    outlet.pushSample(['event_start']);
    // ... do something ...
    outlet.pushSample(['event_end']);
}
```

### Pattern 3: Synchronized Multi-stream

#### Python Pattern
```python
def receive_synchronized():
    streams = pylsl.resolve_streams()
    inlets = [pylsl.StreamInlet(s, processing_flags=pylsl.proc_clocksync) 
              for s in streams]
    
    while True:
        samples = []
        for inlet in inlets:
            sample, ts = inlet.pull_sample(timeout=0.0)
            if sample:
                samples.append((sample, ts))
        
        # Process synchronized samples
        process_samples(samples)
```

#### Node.js Equivalent
```javascript
import { resolveStreams, StreamInlet, proc_clocksync } from 'node-labstreaminglayer';

function receiveSynchronized() {
    const streams = resolveStreams();
    const inlets = streams.map(s => 
        new StreamInlet(s, 360, 0, true, proc_clocksync)
    );
    
    setInterval(() => {
        const samples = [];
        
        for (const inlet of inlets) {
            try {
                const [sample, ts] = inlet.pullSample(0.0);
                samples.push([sample, ts]);
            } catch (e) {
                // No data available
            }
        }
        
        // Process synchronized samples
        processSamples(samples);
    }, 10);
}
```

### Pattern 4: Chunk Processing

#### Python Pattern
```python
def process_chunks():
    inlet = pylsl.StreamInlet(stream_info)
    
    while True:
        chunk, timestamps = inlet.pull_chunk(max_samples=1024)
        if chunk:
            # Process chunk
            results = np.mean(chunk, axis=0)
            print(f"Processed {len(chunk)} samples")
```

#### Node.js Equivalent
```javascript
function processChunks() {
    const inlet = new StreamInlet(streamInfo);
    
    setInterval(() => {
        try {
            const [chunk, timestamps] = inlet.pullChunk(0.0, 1024);
            
            if (chunk.length > 0) {
                // Process chunk
                const results = chunk.reduce((acc, sample) => 
                    acc.map((v, i) => v + sample[i]), 
                    new Array(chunk[0].length).fill(0)
                ).map(v => v / chunk.length);
                
                console.log(`Processed ${chunk.length} samples`);
            }
        } catch (e) {
            // Handle error
        }
    }, 100);
}
```

## Migration Checklist

When migrating to node-labstreaminglayer:

- [ ] **Update imports**: Change to ES6 module imports
- [ ] **Convert method names**: Change snake_case to camelCase
- [ ] **Update data types**: Use TypedArrays for better performance
- [ ] **Handle async patterns**: Convert blocking calls to async/callbacks
- [ ] **Update error handling**: Use try/catch for timeout errors
- [ ] **Convert time handling**: Use setInterval instead of sleep loops
- [ ] **Update array syntax**: Use JavaScript array methods
- [ ] **Test thoroughly**: Verify data integrity after migration

## Performance Considerations

When migrating, consider these performance optimizations:

1. **Use TypedArrays** instead of regular arrays for numeric data
2. **Pre-allocate buffers** to reduce garbage collection
3. **Use chunk operations** for high-throughput streams
4. **Implement worker threads** for CPU-intensive processing
5. **Enable appropriate post-processing flags** for time sync

## Getting Help

For migration assistance:
- Review the [API Reference](./api-reference.md) for detailed documentation
- Check [Examples](./examples.md) for Node.js-specific patterns
- See [Troubleshooting](./troubleshooting.md) for common issues
- Visit the [GitHub repository](https://github.com/EdgeBCI/LabStreamingLayer) for support