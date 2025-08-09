# API Reference

Complete API documentation for node-labstreaminglayer.

## Table of Contents

- [Core Classes](#core-classes)
  - [StreamInfo](#streaminfo)
  - [StreamOutlet](#streamoutlet)
  - [StreamInlet](#streaminlet)
  - [XMLElement](#xmlelement)
- [Stream Discovery](#stream-discovery)
  - [resolveStreams()](#resolvestreams)
  - [resolveByProp()](#resolvebyprop)
  - [resolveByPred()](#resolvebypred)
  - [ContinuousResolver](#continuousresolver)
- [Constants](#constants)
- [Utility Functions](#utility-functions)
- [Error Classes](#error-classes)

## Core Classes

### StreamInfo

Represents the declaration of a data stream. Contains metadata about the stream's properties.

#### Constructor

```typescript
new StreamInfo(
  name: string,
  type: string,
  channelCount: number,
  nominalSrate: number,
  channelFormat: ChannelFormat | number,
  sourceId?: string,
  handle?: any
)
```

**Parameters:**
- `name` - Stream name (e.g., "BioSemi")
- `type` - Content type (e.g., "EEG", "Markers")
- `channelCount` - Number of channels
- `nominalSrate` - Sampling rate in Hz (use 0 or IRREGULAR_RATE for irregular sampling)
- `channelFormat` - Data format: 'float32', 'double64', 'string', 'int32', 'int16', 'int8', 'int64'
- `sourceId` - (Optional) Unique source identifier
- `handle` - (Internal) C object handle

**Example:**
```javascript
const info = new StreamInfo('MyEEG', 'EEG', 32, 256, 'float32', 'biosemi_001');
```

#### Methods

##### `name(): string`
Returns the stream name.

##### `type(): string`
Returns the stream type.

##### `channelCount(): number`
Returns the number of channels.

##### `nominalSrate(): number`
Returns the nominal sampling rate.

##### `channelFormat(): number`
Returns the channel format as a numeric constant.

##### `sourceId(): string`
Returns the source identifier.

##### `version(): number`
Returns the protocol version used by the stream.

##### `createdAt(): number`
Returns the creation timestamp of the stream.

##### `uid(): string`
Returns the unique identifier of the stream.

##### `sessionId(): string`
Returns the session ID.

##### `hostname(): string`
Returns the hostname where the stream originates.

##### `desc(): XMLElement`
Returns the XML description tree for extended metadata.

##### `asXml(): string`
Returns the complete stream info as XML string.

##### `matches(query: any): boolean`
Checks if the stream matches a query (for internal use).

##### `setChannelLabels(labels: string[]): void`
Convenience method to set channel labels.

**Example:**
```javascript
info.setChannelLabels(['Fp1', 'Fp2', 'F3', 'F4', 'C3', 'C4', 'P3', 'P4']);
```

##### `setChannelTypes(types: string[]): void`
Sets the channel types (e.g., 'EEG', 'EOG').

##### `setChannelUnits(units: string[]): void`
Sets the channel units (e.g., 'microvolts').

##### `destroy(): void`
Manually destroys the underlying C object.

### StreamOutlet

Broadcasts data samples to the network.

#### Constructor

```typescript
new StreamOutlet(
  info: StreamInfo,
  chunkSize?: number,
  maxBuffered?: number
)
```

**Parameters:**
- `info` - StreamInfo object describing the stream
- `chunkSize` - (Optional) Preferred chunk size (default: 0, no chunking)
- `maxBuffered` - (Optional) Maximum amount to buffer in seconds (default: 360)

**Example:**
```javascript
const outlet = new StreamOutlet(info, 0, 360);
```

#### Methods

##### `pushSample(sample: any[], timestamp?: number, pushthrough?: boolean): void`
Pushes a single sample to the outlet.

**Parameters:**
- `sample` - Array of values (must match channel count)
- `timestamp` - (Optional) Custom timestamp (default: current time)
- `pushthrough` - (Optional) Whether to push immediately (default: true)

**Example:**
```javascript
outlet.pushSample([1.0, 2.0, 3.0, 4.0]);
outlet.pushSample([5.0, 6.0, 7.0, 8.0], localClock(), true);
```

##### `pushChunk(samples: any[][], timestamp?: number, pushthrough?: boolean): void`
Pushes multiple samples at once.

**Parameters:**
- `samples` - 2D array of samples
- `timestamp` - (Optional) Timestamp for the last sample
- `pushthrough` - (Optional) Whether to push immediately

**Example:**
```javascript
const chunk = [
  [1, 2, 3, 4],
  [5, 6, 7, 8],
  [9, 10, 11, 12]
];
outlet.pushChunk(chunk);
```

##### `pushChunkN(samples: any[][], timestamps: number[], pushthrough?: boolean): void`
Pushes samples with individual timestamps.

**Parameters:**
- `samples` - 2D array of samples
- `timestamps` - Array of timestamps (one per sample)
- `pushthrough` - (Optional) Whether to push immediately

##### `haveConsumers(): boolean`
Checks if there are consumers connected.

##### `waitForConsumers(timeout?: number): boolean`
Waits for consumers to connect.

**Parameters:**
- `timeout` - Maximum time to wait in seconds

##### `info(): StreamInfo`
Returns the StreamInfo object associated with this outlet.

##### `destroy(): void`
Manually destroys the outlet.

### StreamInlet

Receives streaming data from the network.

#### Constructor

```typescript
new StreamInlet(
  info: StreamInfo,
  maxBuflen?: number,
  maxChunklen?: number,
  recover?: boolean,
  processingFlags?: number
)
```

**Parameters:**
- `info` - StreamInfo of the stream to connect to
- `maxBuflen` - (Optional) Maximum buffer length in seconds (default: 360)
- `maxChunklen` - (Optional) Maximum chunk length (default: 0)
- `recover` - (Optional) Try to recover lost streams (default: true)
- `processingFlags` - (Optional) Post-processing flags (default: 0)

**Example:**
```javascript
import { proc_clocksync, proc_dejitter } from 'node-labstreaminglayer';

const inlet = new StreamInlet(
  info, 
  360,  // 360 second buffer
  1024, // Max chunk size
  true, // Recover lost streams
  proc_clocksync | proc_dejitter // Time correction
);
```

#### Methods

##### `pullSample(timeout?: number): [any[], number]`
Pulls a single sample from the inlet.

**Parameters:**
- `timeout` - (Optional) Max time to wait in seconds (default: FOREVER)

**Returns:** Tuple of [sample, timestamp]

**Example:**
```javascript
try {
  const [sample, timestamp] = inlet.pullSample(1.0);
  console.log('Sample:', sample, 'Time:', timestamp);
} catch (error) {
  if (error.name === 'TimeoutError') {
    console.log('No data available');
  }
}
```

##### `pullChunk(timeout?: number, maxSamples?: number): [any[][], number[]]`
Pulls multiple samples at once.

**Parameters:**
- `timeout` - (Optional) Max time to wait
- `maxSamples` - (Optional) Maximum samples to pull

**Returns:** Tuple of [samples, timestamps]

##### `timeCorrection(timeout?: number): number`
Returns the time correction offset for this inlet.

##### `openStream(timeout?: number): void`
Explicitly opens the stream connection.

##### `closeStream(): void`
Closes the stream connection.

##### `samplesAvailable(): number`
Returns the number of samples currently available.

##### `wasClockReset(): boolean`
Checks if the clock was reset since last check.

##### `flush(): void`
Flushes the buffer, discarding all data.

##### `info(timeout?: number): StreamInfo`
Gets the full stream info including XML description.

##### `destroy(): void`
Manually destroys the inlet.

### XMLElement

Represents an XML element for stream metadata.

#### Methods

##### `firstChild(): XMLElement | null`
Returns the first child element.

##### `lastChild(): XMLElement | null`
Returns the last child element.

##### `nextSibling(name?: string): XMLElement | null`
Returns the next sibling element.

##### `previousSibling(name?: string): XMLElement | null`
Returns the previous sibling element.

##### `parent(): XMLElement | null`
Returns the parent element.

##### `child(name: string): XMLElement | null`
Returns a child element by name.

##### `empty(): boolean`
Checks if the element is empty.

##### `isText(): boolean`
Checks if this is a text element.

##### `name(): string`
Returns the element name.

##### `value(): string`
Returns the element value.

##### `childValue(name?: string): string`
Returns a child element's value.

##### `appendChildValue(name: string, value: string): XMLElement`
Appends a child with a value.

**Example:**
```javascript
info.desc()
  .appendChild('channels')
  .appendChild('channel')
  .appendChildValue('label', 'Fp1')
  .appendChildValue('type', 'EEG')
  .appendChildValue('unit', 'microvolts');
```

##### `prependChildValue(name: string, value: string): XMLElement`
Prepends a child with a value.

##### `setChildValue(name: string, value: string): boolean`
Sets or creates a child value.

##### `setName(name: string): boolean`
Sets the element name.

##### `setValue(value: string): boolean`
Sets the element value.

##### `appendChild(name: string): XMLElement`
Appends a new child element.

##### `prependChild(name: string): XMLElement`
Prepends a new child element.

##### `removeChild(element: string | XMLElement): void`
Removes a child element.

## Stream Discovery

### resolveStreams()

```typescript
resolveStreams(waitTime?: number): StreamInfo[]
```

Finds all streams on the network.

**Parameters:**
- `waitTime` - (Optional) Time to wait in seconds (default: 1.0)

**Returns:** Array of StreamInfo objects

**Example:**
```javascript
const streams = resolveStreams(2.0);
console.log(`Found ${streams.length} streams`);
```

### resolveByProp()

```typescript
resolveByProp(
  prop: string,
  value: string,
  minimum?: number,
  timeout?: number
): StreamInfo[]
```

Finds streams matching a specific property.

**Parameters:**
- `prop` - Property name ('name', 'type', 'source_id', etc.)
- `value` - Property value to match
- `minimum` - (Optional) Minimum streams to find (default: 1)
- `timeout` - (Optional) Timeout in seconds (default: FOREVER)

**Example:**
```javascript
const eegStreams = resolveByProp('type', 'EEG', 1, 5.0);
```

### resolveByPred()

```typescript
resolveByPred(
  predicate: string,
  minimum?: number,
  timeout?: number
): StreamInfo[]
```

Finds streams using an XPath predicate.

**Parameters:**
- `predicate` - XPath predicate string
- `minimum` - (Optional) Minimum streams to find
- `timeout` - (Optional) Timeout in seconds

**Example:**
```javascript
const filtered = resolveByPred("name='BioSemi' and channel_count='32'");
```

### resolveStream()

```typescript
resolveStream(
  prop: string,
  value: string,
  timeout?: number
): StreamInfo | null
```

Finds a single stream (convenience function).

**Example:**
```javascript
const stream = resolveStream('name', 'MyStream', 5.0);
```

### ContinuousResolver

Continuously monitors available streams.

#### Constructor

```typescript
new ContinuousResolver(prop?: string, value?: string, pred?: string)
```

**Parameters:**
- `prop` - (Optional) Property to filter by
- `value` - (Optional) Property value
- `pred` - (Optional) XPath predicate

#### Methods

##### `results(): StreamInfo[]`
Returns currently available streams.

**Example:**
```javascript
const resolver = new ContinuousResolver('type', 'EEG');

setInterval(() => {
  const streams = resolver.results();
  console.log(`${streams.length} EEG streams available`);
}, 1000);
```

##### `destroy(): void`
Stops monitoring and cleans up.

## Constants

### Sampling Rate Constants

```javascript
IRREGULAR_RATE    // 0.0 - Variable sampling rate
DEDUCED_TIMESTAMP // -1.0 - Use stream's sampling rate
```

### Timeout Constants

```javascript
FOREVER // 32000000.0 - No timeout
```

### Post-Processing Flags

```javascript
proc_none        // 0 - No processing
proc_clocksync   // 1 - Clock synchronization
proc_dejitter    // 2 - Remove jitter
proc_monotonize  // 4 - Force monotonic timestamps
proc_threadsafe  // 8 - Thread-safe processing
proc_ALL         // All flags combined
```

### Channel Format Constants

```javascript
cf_undefined  // 0
cf_float32    // 1
cf_double64   // 2
cf_string     // 3
cf_int32      // 4
cf_int16      // 5
cf_int8       // 6
cf_int64      // 7
```

## Utility Functions

### protocolVersion()

```typescript
protocolVersion(): number
```

Returns the LSL protocol version.

### libraryVersion()

```typescript
libraryVersion(): number
```

Returns the liblsl library version.

### libraryInfo()

```typescript
libraryInfo(): string
```

Returns library information string.

### localClock()

```typescript
localClock(): number
```

Returns the local LSL clock time in seconds.

**Example:**
```javascript
const timestamp = localClock();
console.log(`Current LSL time: ${timestamp}`);
```

### string2fmt

```typescript
string2fmt: { [key: string]: number }
```

Maps format strings to constants.

**Example:**
```javascript
const format = string2fmt['float32']; // Returns 1
```

### fmt2string

```typescript
fmt2string: string[]
```

Maps format constants to strings.

**Example:**
```javascript
const name = fmt2string[cf_float32]; // Returns 'float32'
```

## Error Classes

### TimeoutError

Thrown when an operation times out.

```javascript
try {
  inlet.pullSample(1.0);
} catch (error) {
  if (error instanceof TimeoutError) {
    console.log('No data received within timeout');
  }
}
```

### LostError

Thrown when a stream connection is lost.

```javascript
try {
  inlet.pullSample();
} catch (error) {
  if (error instanceof LostError) {
    console.log('Stream connection lost');
    // Attempt reconnection
  }
}
```

### InvalidArgumentError

Thrown when arguments are invalid.

### InternalError

Thrown for internal LSL errors.

## Type Definitions

### ChannelFormat

```typescript
type ChannelFormat = 'float32' | 'double64' | 'string' | 'int32' | 'int16' | 'int8' | 'int64';
```

Valid channel format strings.

## Complete Example

```javascript
import {
  StreamInfo,
  StreamOutlet,
  StreamInlet,
  resolveStreams,
  localClock,
  proc_clocksync,
  proc_dejitter,
  TimeoutError
} from 'node-labstreaminglayer';

// Create a stream
const info = new StreamInfo('TestStream', 'Test', 4, 100, 'float32');
info.setChannelLabels(['Ch1', 'Ch2', 'Ch3', 'Ch4']);

const outlet = new StreamOutlet(info);

// Send data
const sample = [1.0, 2.0, 3.0, 4.0];
outlet.pushSample(sample, localClock());

// Find and connect to stream
const streams = resolveStreams(2.0);
const inlet = new StreamInlet(
  streams[0],
  360,
  0,
  true,
  proc_clocksync | proc_dejitter
);

// Receive data
try {
  const [data, timestamp] = inlet.pullSample(1.0);
  console.log('Received:', data, 'at', timestamp);
} catch (error) {
  if (error instanceof TimeoutError) {
    console.log('Timeout waiting for data');
  }
}

// Cleanup
outlet.destroy();
inlet.destroy();
```