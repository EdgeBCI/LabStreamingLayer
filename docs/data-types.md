# Data Types Reference

Comprehensive guide to data types and formats in node-labstreaminglayer.

## Table of Contents

- [Supported Channel Formats](#supported-channel-formats)
- [Type Conversions](#type-conversions)
- [Working with Different Data Types](#working-with-different-data-types)
- [Memory Considerations](#memory-considerations)
- [Best Practices](#best-practices)

## Supported Channel Formats

LSL supports the following channel formats for streaming data:

| Format | Constant | Value | Description | JavaScript Type | Bytes/Sample |
|--------|----------|-------|-------------|-----------------|--------------|
| `float32` | `cf_float32` | 1 | 32-bit IEEE floating point | `Float32Array` or `number[]` | 4 |
| `double64` | `cf_double64` | 2 | 64-bit IEEE floating point | `Float64Array` or `number[]` | 8 |
| `string` | `cf_string` | 3 | Variable-length UTF-8 string | `string[]` | Variable |
| `int32` | `cf_int32` | 4 | 32-bit signed integer | `Int32Array` or `number[]` | 4 |
| `int16` | `cf_int16` | 5 | 16-bit signed integer | `Int16Array` or `number[]` | 2 |
| `int8` | `cf_int8` | 6 | 8-bit signed integer | `Int8Array` or `number[]` | 1 |
| `int64` | `cf_int64` | 7 | 64-bit signed integer | `BigInt64Array` or `bigint[]` | 8 |
| `undefined` | `cf_undefined` | 0 | Undefined format (not recommended) | N/A | N/A |

### Format Selection Guidelines

Choose the appropriate format based on your data requirements:

- **`float32`**: Default choice for most biosignals (EEG, EMG, ECG)
- **`double64`**: When high precision is required (scientific measurements)
- **`string`**: Event markers, annotations, or text data
- **`int32`**: Digital signals, counters, indices
- **`int16`**: Compact storage for limited-range signals
- **`int8`**: Binary or categorical data
- **`int64`**: Large counters, timestamps (use with caution - see notes)

## Type Conversions

### String to Format Constant

```javascript
import { string2fmt, cf_float32 } from 'node-labstreaminglayer';

// Convert string to format constant
const format = string2fmt['float32'];  // Returns 1 (cf_float32)
const format2 = string2fmt['double64']; // Returns 2 (cf_double64)

// Use in StreamInfo
const info = new StreamInfo('MyStream', 'Data', 4, 100, string2fmt['float32']);
// Or directly with string
const info2 = new StreamInfo('MyStream', 'Data', 4, 100, 'float32');
```

### Format Constant to String

```javascript
import { fmt2string, cf_float32 } from 'node-labstreaminglayer';

// Convert format constant to string
const formatName = fmt2string[cf_float32]; // Returns 'float32'
const formatName2 = fmt2string[1];         // Also returns 'float32'

// Get format from existing stream
const streamFormat = info.channelFormat(); // Returns numeric constant
const formatString = fmt2string[streamFormat]; // Convert to string
```

## Working with Different Data Types

### Float32 - Single Precision Floating Point

Most common format for continuous signals.

```javascript
// Creating a float32 stream
const info = new StreamInfo('FloatStream', 'Data', 8, 250, 'float32');
const outlet = new StreamOutlet(info);

// Sending float32 data - using regular array
const sample = [1.0, 2.5, -3.7, 4.2, 5.8, -6.1, 7.3, 8.9];
outlet.pushSample(sample);

// Sending float32 data - using typed array (more efficient)
const typedSample = new Float32Array([1.0, 2.5, -3.7, 4.2, 5.8, -6.1, 7.3, 8.9]);
outlet.pushSample(typedSample);

// Receiving float32 data
const inlet = new StreamInlet(info);
const [received, timestamp] = inlet.pullSample();
console.log(received); // Array of numbers
```

**Range**: ±3.4028235 × 10³⁸  
**Precision**: ~7 significant digits

### Double64 - Double Precision Floating Point

For high-precision measurements.

```javascript
// Creating a double64 stream
const info = new StreamInfo('PrecisionStream', 'Scientific', 4, 100, 'double64');
const outlet = new StreamOutlet(info);

// Sending double64 data
const preciseSample = new Float64Array([
  Math.PI,
  Math.E,
  1.23456789012345,
  -9.87654321098765
]);
outlet.pushSample(preciseSample);

// Receiving preserves precision
const inlet = new StreamInlet(info);
const [received, timestamp] = inlet.pullSample();
console.log(received[0]); // 3.141592653589793
```

**Range**: ±1.7976931348623157 × 10³⁰⁸  
**Precision**: ~15-17 significant digits

### String - Variable Length Text

For markers, events, and annotations.

```javascript
// Creating a string stream
const info = new StreamInfo('Markers', 'Markers', 1, 0, 'string');
const outlet = new StreamOutlet(info);

// Sending string data (always as array)
outlet.pushSample(['stimulus_onset']);
outlet.pushSample(['response_correct']);
outlet.pushSample(['trial_end']);

// Multi-channel strings
const multiInfo = new StreamInfo('Annotations', 'Text', 3, 0, 'string');
const multiOutlet = new StreamOutlet(multiInfo);
multiOutlet.pushSample(['event_type', 'timestamp', 'description']);

// Receiving strings
const inlet = new StreamInlet(info);
const [marker, timestamp] = inlet.pullSample();
console.log(marker[0]); // 'stimulus_onset'
```

**Encoding**: UTF-8  
**Max Length**: Limited by network MTU (typically ~1500 bytes)

### Int32 - 32-bit Signed Integer

For discrete values and digital signals.

```javascript
// Creating an int32 stream
const info = new StreamInfo('DigitalSignals', 'Digital', 8, 1000, 'int32');
const outlet = new StreamOutlet(info);

// Sending int32 data
const digitalSample = new Int32Array([0, 1, -1, 1000000, -2000000, 0, 1, 0]);
outlet.pushSample(digitalSample);

// Or using regular array (will be converted)
const sample = [0, 1, -1, 1000000, -2000000, 0, 1, 0];
outlet.pushSample(sample);

// Receiving int32 data
const inlet = new StreamInlet(info);
const [received, timestamp] = inlet.pullSample();
// Note: Fractional values will be truncated when sending
```

**Range**: -2,147,483,648 to 2,147,483,647

### Int16 - 16-bit Signed Integer

For compact storage of limited-range signals.

```javascript
// Creating an int16 stream (good for digitized analog signals)
const info = new StreamInfo('CompactData', 'ADC', 16, 500, 'int16');
const outlet = new StreamOutlet(info);

// Sending int16 data (range: -32768 to 32767)
const adcSample = new Int16Array(16);
for (let i = 0; i < 16; i++) {
  adcSample[i] = Math.floor(Math.random() * 65536 - 32768);
}
outlet.pushSample(adcSample);

// Useful for normalized data (-1 to 1 mapped to int16 range)
function floatToInt16(floatValue) {
  return Math.round(floatValue * 32767);
}

function int16ToFloat(intValue) {
  return intValue / 32767;
}

// Example: normalized signal
const normalizedSignal = Math.sin(Date.now() / 1000);
const int16Value = floatToInt16(normalizedSignal);
outlet.pushSample([int16Value]);
```

**Range**: -32,768 to 32,767  
**Use Case**: Digitized analog signals, audio data

### Int8 - 8-bit Signed Integer

For binary or categorical data.

```javascript
// Creating an int8 stream
const info = new StreamInfo('BinaryData', 'Binary', 32, 100, 'int8');
const outlet = new StreamOutlet(info);

// Sending int8 data (range: -128 to 127)
const binarySample = new Int8Array(32);
for (let i = 0; i < 32; i++) {
  binarySample[i] = Math.random() > 0.5 ? 1 : 0;
}
outlet.pushSample(binarySample);

// Use for categorical data
const categories = {
  REST: 0,
  TASK_A: 1,
  TASK_B: 2,
  TASK_C: 3
};

outlet.pushSample([categories.TASK_A]);
```

**Range**: -128 to 127  
**Use Case**: Binary flags, small categorical values

### Int64 - 64-bit Signed Integer

For very large integers. Note: JavaScript BigInt support.

```javascript
// Creating an int64 stream
const info = new StreamInfo('LargeCounters', 'Counters', 2, 0, 'int64');
const outlet = new StreamOutlet(info);

// Sending int64 data - using BigInt
const bigSample = [
  BigInt('9223372036854775807'),  // Max int64
  BigInt('-9223372036854775808')  // Min int64
];
outlet.pushSample(bigSample);

// Using BigInt64Array
const bigTypedSample = new BigInt64Array([
  123456789012345n,
  -987654321098765n
]);
outlet.pushSample(bigTypedSample);

// Receiving int64 data
const inlet = new StreamInlet(info);
const [received, timestamp] = inlet.pullSample();
console.log(received[0]); // BigInt value
```

**Range**: -9,223,372,036,854,775,808 to 9,223,372,036,854,775,807  
**Note**: Requires BigInt support in JavaScript

## Memory Considerations

### Memory Usage by Data Type

Calculate memory requirements for your streams:

```javascript
function calculateMemoryUsage(format, channels, sampleRate, bufferSeconds) {
  const bytesPerSample = {
    'float32': 4,
    'double64': 8,
    'int32': 4,
    'int16': 2,
    'int8': 1,
    'int64': 8,
    'string': 100 // Estimate: average 100 bytes per string
  };
  
  const bytes = bytesPerSample[format] * channels * sampleRate * bufferSeconds;
  const megabytes = bytes / (1024 * 1024);
  
  return {
    bytes,
    megabytes,
    gigabytes: megabytes / 1024
  };
}

// Example: 32-channel EEG at 256 Hz with 60-second buffer
const usage = calculateMemoryUsage('float32', 32, 256, 60);
console.log(`Memory usage: ${usage.megabytes.toFixed(2)} MB`);
// Output: Memory usage: 1.88 MB

// High-frequency example: 64 channels at 10kHz with 10-second buffer
const highFreqUsage = calculateMemoryUsage('float32', 64, 10000, 10);
console.log(`High-freq usage: ${highFreqUsage.megabytes.toFixed(2)} MB`);
// Output: High-freq usage: 24.41 MB
```

### Optimizing Memory Usage

```javascript
class MemoryOptimizedStream {
  constructor(info, options = {}) {
    this.info = info;
    this.format = info.channelFormat();
    this.channels = info.channelCount();
    
    // Choose appropriate typed array
    this.ArrayType = this.getArrayType();
    
    // Pre-allocate buffers
    this.bufferPool = [];
    const poolSize = options.poolSize || 10;
    
    for (let i = 0; i < poolSize; i++) {
      this.bufferPool.push(new this.ArrayType(this.channels));
    }
    
    this.currentBuffer = 0;
  }
  
  getArrayType() {
    const typeMap = {
      1: Float32Array,  // cf_float32
      2: Float64Array,  // cf_double64
      4: Int32Array,    // cf_int32
      5: Int16Array,    // cf_int16
      6: Int8Array,     // cf_int8
      7: BigInt64Array  // cf_int64
    };
    
    return typeMap[this.format] || Array;
  }
  
  getBuffer() {
    // Reuse buffers from pool
    const buffer = this.bufferPool[this.currentBuffer];
    this.currentBuffer = (this.currentBuffer + 1) % this.bufferPool.length;
    return buffer;
  }
  
  fillAndSend(outlet, fillFunction) {
    const buffer = this.getBuffer();
    fillFunction(buffer);
    outlet.pushSample(buffer);
  }
}

// Usage
const stream = new MemoryOptimizedStream(info, { poolSize: 20 });

const outlet = new StreamOutlet(info);
setInterval(() => {
  stream.fillAndSend(outlet, (buffer) => {
    // Fill buffer with data
    for (let i = 0; i < buffer.length; i++) {
      buffer[i] = Math.random();
    }
  });
}, 10);
```

## Best Practices

### 1. Choose the Right Format

```javascript
// For EEG/biosignals: float32 is usually sufficient
const eegInfo = new StreamInfo('EEG', 'EEG', 32, 256, 'float32');

// For precise scientific measurements: double64
const scientificInfo = new StreamInfo('Precision', 'Science', 8, 100, 'double64');

// For markers/events: string
const markerInfo = new StreamInfo('Events', 'Markers', 1, 0, 'string');

// For digital triggers: int8 or int32
const triggerInfo = new StreamInfo('Triggers', 'Digital', 8, 1000, 'int8');
```

### 2. Use Typed Arrays for Performance

```javascript
// Slower: Regular arrays (requires conversion)
const regularArray = [1.0, 2.0, 3.0, 4.0];
outlet.pushSample(regularArray);

// Faster: Typed arrays (no conversion needed)
const typedArray = new Float32Array([1.0, 2.0, 3.0, 4.0]);
outlet.pushSample(typedArray);

// Fastest: Reuse typed arrays
class EfficientStreamer {
  constructor(channels) {
    this.buffer = new Float32Array(channels);
  }
  
  sendSample(outlet, generateData) {
    generateData(this.buffer); // Fill existing buffer
    outlet.pushSample(this.buffer);
  }
}
```

### 3. Handle Type Conversion Properly

```javascript
// Converting between types
class TypeConverter {
  static floatToInt16(floatArray) {
    const int16Array = new Int16Array(floatArray.length);
    for (let i = 0; i < floatArray.length; i++) {
      // Scale and clamp to int16 range
      const scaled = Math.max(-1, Math.min(1, floatArray[i])) * 32767;
      int16Array[i] = Math.round(scaled);
    }
    return int16Array;
  }
  
  static int16ToFloat(int16Array) {
    const floatArray = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      floatArray[i] = int16Array[i] / 32767;
    }
    return floatArray;
  }
  
  static normalizeInt32(int32Array, min, max) {
    const range = max - min;
    const floatArray = new Float32Array(int32Array.length);
    
    for (let i = 0; i < int32Array.length; i++) {
      floatArray[i] = (int32Array[i] - min) / range;
    }
    
    return floatArray;
  }
}
```

### 4. Validate Data Ranges

```javascript
class DataValidator {
  static validateSample(sample, format, channels) {
    // Check array length
    if (sample.length !== channels) {
      throw new Error(`Expected ${channels} channels, got ${sample.length}`);
    }
    
    // Check data types and ranges
    switch (format) {
      case 'float32':
        return sample.every(v => 
          typeof v === 'number' && 
          Math.abs(v) <= 3.4028235e38
        );
        
      case 'int16':
        return sample.every(v => 
          Number.isInteger(v) && 
          v >= -32768 && 
          v <= 32767
        );
        
      case 'int8':
        return sample.every(v => 
          Number.isInteger(v) && 
          v >= -128 && 
          v <= 127
        );
        
      case 'string':
        return sample.every(v => typeof v === 'string');
        
      default:
        return true;
    }
  }
}

// Use before sending
const sample = [1.0, 2.0, 300000]; // Invalid for int16
if (!DataValidator.validateSample(sample, 'int16', 3)) {
  throw new Error('Invalid sample data for int16 format');
}
```

### 5. Handle String Data Carefully

```javascript
// String streams require special handling
class StringStreamHandler {
  static createMarkerStream() {
    // Single channel for markers
    return new StreamInfo('Markers', 'Markers', 1, 0, 'string');
  }
  
  static createAnnotationStream() {
    // Multiple channels for structured annotations
    const info = new StreamInfo('Annotations', 'Annotations', 3, 0, 'string');
    // Channel 0: event type
    // Channel 1: description
    // Channel 2: metadata (JSON)
    return info;
  }
  
  static sendStructuredMarker(outlet, eventType, data) {
    const timestamp = localClock();
    const json = JSON.stringify({ ...data, eventType, timestamp });
    
    outlet.pushSample([eventType, data.description || '', json]);
  }
  
  static parseStructuredMarker(sample) {
    const [eventType, description, jsonData] = sample;
    
    try {
      const data = JSON.parse(jsonData);
      return { eventType, description, ...data };
    } catch (e) {
      return { eventType, description, data: jsonData };
    }
  }
}
```

## Format Comparison Table

| Aspect | float32 | double64 | string | int32 | int16 | int8 | int64 |
|--------|---------|----------|--------|-------|-------|------|-------|
| **Bytes per value** | 4 | 8 | Variable | 4 | 2 | 1 | 8 |
| **Precision** | ~7 digits | ~15 digits | N/A | Exact | Exact | Exact | Exact |
| **Range** | ±3.4e38 | ±1.8e308 | N/A | ±2.1e9 | ±32k | ±127 | ±9.2e18 |
| **JavaScript Type** | Number | Number | String | Number | Number | Number | BigInt |
| **Typed Array** | Float32Array | Float64Array | Array | Int32Array | Int16Array | Int8Array | BigInt64Array |
| **Use Case** | Biosignals | Science | Markers | Digital | Compact | Binary | Counters |
| **Network Efficiency** | Good | Fair | Variable | Good | Excellent | Best | Fair |

## Common Pitfalls and Solutions

### Pitfall 1: Using Wrong Format

```javascript
// Wrong: Using float64 for simple sensor data (wastes bandwidth)
const info = new StreamInfo('Sensor', 'Data', 8, 100, 'double64');

// Right: float32 is sufficient for most sensors
const info = new StreamInfo('Sensor', 'Data', 8, 100, 'float32');
```

### Pitfall 2: Not Using Typed Arrays

```javascript
// Inefficient: Creates new array every time
setInterval(() => {
  outlet.pushSample([Math.random(), Math.random(), Math.random()]);
}, 10);

// Efficient: Reuse typed array
const buffer = new Float32Array(3);
setInterval(() => {
  buffer[0] = Math.random();
  buffer[1] = Math.random();
  buffer[2] = Math.random();
  outlet.pushSample(buffer);
}, 10);
```

### Pitfall 3: Overflow/Underflow

```javascript
// Problem: Value exceeds int16 range
const int16Stream = new StreamOutlet(new StreamInfo('Data', 'Test', 1, 100, 'int16'));
int16Stream.pushSample([40000]); // Will be truncated!

// Solution: Validate and clamp
function clampToInt16(value) {
  return Math.max(-32768, Math.min(32767, Math.round(value)));
}
int16Stream.pushSample([clampToInt16(40000)]);
```

## Next Steps

- See [API Reference](./api-reference.md) for complete API documentation
- Review [Examples](./examples.md) for practical implementations
- Check [Advanced Usage](./advanced-usage.md) for optimization techniques