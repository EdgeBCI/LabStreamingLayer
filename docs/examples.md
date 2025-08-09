# Examples

Complete working examples for common LSL use cases.

## Table of Contents

- [Basic Examples](#basic-examples)
  - [Simple Data Streaming](#simple-data-streaming)
  - [String Markers](#string-markers)
  - [Multi-channel EEG](#multi-channel-eeg)
- [Advanced Examples](#advanced-examples)
  - [Chunk-based Transmission](#chunk-based-transmission)
  - [Stream Metadata](#stream-metadata)
  - [Time Synchronization](#time-synchronization)
  - [Performance Testing](#performance-testing)
- [Real-World Applications](#real-world-applications)
  - [BCI Application](#bci-application)
  - [Data Logger](#data-logger)
  - [Stream Bridge](#stream-bridge)

## Basic Examples

### Simple Data Streaming

#### Producer - Send Random Data

```javascript
// producer.js
import { StreamInfo, StreamOutlet, localClock } from 'node-labstreaminglayer';

// Create a 4-channel stream at 100 Hz
const info = new StreamInfo(
  'RandomData',
  'Test',
  4,          // 4 channels
  100,        // 100 Hz
  'float32',
  'test_' + Date.now()
);

const outlet = new StreamOutlet(info);
console.log('Stream created. Sending data at 100 Hz...');
console.log('Press Ctrl+C to stop');

const startTime = localClock();
let samplesSent = 0;

// Send data at precise 100 Hz rate
const sendData = () => {
  const elapsed = localClock() - startTime;
  const targetSamples = Math.floor(elapsed * 100);
  
  while (samplesSent < targetSamples) {
    const sample = [
      Math.sin(samplesSent * 0.1),
      Math.cos(samplesSent * 0.1),
      Math.random() * 2 - 1,
      samplesSent
    ];
    
    outlet.pushSample(sample);
    samplesSent++;
  }
};

// Run at 10ms intervals (100 Hz)
setInterval(sendData, 10);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log(`\nSent ${samplesSent} samples`);
  outlet.destroy();
  process.exit(0);
});
```

#### Consumer - Receive and Display Data

```javascript
// consumer.js
import { resolveByProp, StreamInlet, TimeoutError } from 'node-labstreaminglayer';

console.log('Looking for RandomData stream...');

// Find the stream
const streams = resolveByProp('name', 'RandomData', 1, 5.0);

if (streams.length === 0) {
  console.error('No RandomData stream found!');
  process.exit(1);
}

const inlet = new StreamInlet(streams[0]);
console.log('Connected! Receiving data...\n');

let samplesReceived = 0;
let lastReport = Date.now();

// Continuous data reception
const receiveData = () => {
  try {
    const [sample, timestamp] = inlet.pullSample(0.0); // Non-blocking
    samplesReceived++;
    
    // Report every second
    if (Date.now() - lastReport > 1000) {
      console.log(`Rate: ${samplesReceived} Hz | Latest: [${
        sample.map(v => v.toFixed(2)).join(', ')
      }] @ ${timestamp.toFixed(3)}`);
      samplesReceived = 0;
      lastReport = Date.now();
    }
  } catch (error) {
    if (!(error instanceof TimeoutError)) {
      console.error('Error:', error);
    }
  }
};

// High-frequency polling
setInterval(receiveData, 1);

// Cleanup
process.on('SIGINT', () => {
  inlet.destroy();
  process.exit(0);
});
```

### String Markers

#### Send Event Markers

```javascript
// send-markers.js
import { StreamInfo, StreamOutlet, localClock } from 'node-labstreaminglayer';

// Create a marker stream (irregular rate)
const info = new StreamInfo(
  'ExperimentMarkers',
  'Markers',
  1,          // Single channel for marker string
  0,          // Irregular rate
  'string',
  'exp_001'
);

const outlet = new StreamOutlet(info);
console.log('Marker stream created');

// Simulated experiment events
const events = [
  { delay: 1000, marker: 'experiment_start' },
  { delay: 2000, marker: 'block_1_start' },
  { delay: 3000, marker: 'stimulus_onset' },
  { delay: 3500, marker: 'response' },
  { delay: 4000, marker: 'stimulus_offset' },
  { delay: 5000, marker: 'block_1_end' },
  { delay: 6000, marker: 'block_2_start' },
  { delay: 7000, marker: 'stimulus_onset' },
  { delay: 7300, marker: 'response' },
  { delay: 8000, marker: 'stimulus_offset' },
  { delay: 9000, marker: 'block_2_end' },
  { delay: 10000, marker: 'experiment_end' }
];

// Send markers at specified times
events.forEach(event => {
  setTimeout(() => {
    const timestamp = localClock();
    outlet.pushSample([event.marker], timestamp);
    console.log(`Sent marker: "${event.marker}" at ${timestamp.toFixed(3)}`);
  }, event.delay);
});

// Keep process alive
setTimeout(() => {
  console.log('All markers sent');
  outlet.destroy();
  process.exit(0);
}, 11000);
```

#### Receive Event Markers

```javascript
// receive-markers.js
import { resolveByProp, StreamInlet } from 'node-labstreaminglayer';

console.log('Waiting for marker stream...');

const streams = resolveByProp('type', 'Markers', 1, 10.0);

if (streams.length === 0) {
  console.error('No marker stream found!');
  process.exit(1);
}

const inlet = new StreamInlet(streams[0]);
console.log(`Connected to: ${streams[0].name()}\n`);
console.log('Waiting for markers...\n');

// Continuous marker reception
const checkMarkers = () => {
  try {
    const [marker, timestamp] = inlet.pullSample(0.0);
    console.log(`[${timestamp.toFixed(3)}] Event: ${marker[0]}`);
    
    // React to specific markers
    switch(marker[0]) {
      case 'experiment_start':
        console.log('  -> Experiment started!');
        break;
      case 'stimulus_onset':
        console.log('  -> Stimulus presented');
        break;
      case 'response':
        console.log('  -> User responded');
        break;
      case 'experiment_end':
        console.log('  -> Experiment complete!');
        setTimeout(() => process.exit(0), 100);
        break;
    }
  } catch (error) {
    // Timeout is normal when no markers available
  }
};

setInterval(checkMarkers, 10);
```

### Multi-channel EEG

#### EEG Stream with Metadata

```javascript
// eeg-stream.js
import { StreamInfo, StreamOutlet, localClock } from 'node-labstreaminglayer';

// Standard 10-20 EEG montage
const channels = [
  'Fp1', 'Fp2', 'F3', 'F4', 'C3', 'C4', 'P3', 'P4',
  'O1', 'O2', 'F7', 'F8', 'T3', 'T4', 'T5', 'T6',
  'Fz', 'Cz', 'Pz', 'Oz', 'FC1', 'FC2', 'CP1', 'CP2',
  'FC5', 'FC6', 'CP5', 'CP6', 'TP9', 'TP10', 'POz', 'ECG'
];

// Create 32-channel EEG stream at 256 Hz
const info = new StreamInfo(
  'SimulatedEEG',
  'EEG', 
  channels.length,
  256,
  'float32',
  'eeg_sim_001'
);

// Add channel metadata
const desc = info.desc();
const chns = desc.appendChild('channels');

channels.forEach((label, index) => {
  const chn = chns.appendChild('channel');
  chn.appendChildValue('label', label);
  chn.appendChildValue('unit', 'microvolts');
  chn.appendChildValue('type', index === 31 ? 'ECG' : 'EEG');
});

// Add amplifier settings
const amp = desc.appendChild('amplifier');
amp.appendChildValue('manufacturer', 'Simulated');
amp.appendChildValue('model', 'SimEEG-32');
amp.appendChildValue('precision', '24');
amp.appendChildValue('range', '187500');

const outlet = new StreamOutlet(info);
console.log(`Streaming ${channels.length}-channel EEG at 256 Hz`);

// Generate realistic EEG-like signals
const generateEEGSample = (t) => {
  const sample = new Float32Array(channels.length);
  
  for (let i = 0; i < channels.length; i++) {
    // Mix of different frequency components
    const alpha = Math.sin(2 * Math.PI * 10 * t + i) * 20;      // Alpha: 10 Hz
    const beta = Math.sin(2 * Math.PI * 20 * t + i * 2) * 10;   // Beta: 20 Hz
    const theta = Math.sin(2 * Math.PI * 6 * t + i * 3) * 15;   // Theta: 6 Hz
    const noise = (Math.random() - 0.5) * 5;                     // Noise
    
    sample[i] = alpha + beta + theta + noise;
    
    // ECG channel (last channel)
    if (i === channels.length - 1) {
      sample[i] = Math.sin(2 * Math.PI * 1.2 * t) * 500; // ~72 BPM
    }
  }
  
  return sample;
};

// Stream at precise 256 Hz
const startTime = localClock();
let sampleIndex = 0;

const streamEEG = () => {
  const currentTime = localClock();
  const elapsed = currentTime - startTime;
  const targetSamples = Math.floor(elapsed * 256);
  
  while (sampleIndex < targetSamples) {
    const t = sampleIndex / 256.0;
    const sample = generateEEGSample(t);
    outlet.pushSample(sample);
    sampleIndex++;
  }
};

setInterval(streamEEG, 4); // 256 Hz = ~4ms per sample

// Status reporting
setInterval(() => {
  console.log(`Streaming... ${sampleIndex} samples sent (${(sampleIndex/256).toFixed(1)}s)`);
}, 5000);
```

## Advanced Examples

### Chunk-based Transmission

#### High-throughput Data with Chunks

```javascript
// chunk-sender.js
import { StreamInfo, StreamOutlet, localClock } from 'node-labstreaminglayer';

// High-frequency stream: 64 channels at 1000 Hz
const info = new StreamInfo(
  'HighFreqData',
  'EMG',
  64,
  1000,
  'float32',
  'emg_hd_001'
);

// Use chunking for efficiency
const chunkSize = 100;  // Send 100 samples at a time
const outlet = new StreamOutlet(info, chunkSize);

console.log('Streaming 64ch @ 1kHz using chunks');

// Generate chunk of samples
const generateChunk = (startSample, numSamples) => {
  const chunk = [];
  
  for (let s = 0; s < numSamples; s++) {
    const sample = new Float32Array(64);
    const t = (startSample + s) / 1000.0;
    
    for (let ch = 0; ch < 64; ch++) {
      // Simulate EMG signal
      sample[ch] = Math.sin(2 * Math.PI * 50 * t + ch) * 100 * Math.random();
    }
    
    chunk.push(sample);
  }
  
  return chunk;
};

// Send chunks at 10 Hz (100 samples per chunk)
let totalSamples = 0;
const startTime = localClock();

setInterval(() => {
  const elapsed = localClock() - startTime;
  const targetSamples = Math.floor(elapsed * 1000);
  const samplesToSend = Math.min(chunkSize, targetSamples - totalSamples);
  
  if (samplesToSend > 0) {
    const chunk = generateChunk(totalSamples, samplesToSend);
    outlet.pushChunk(chunk);
    totalSamples += samplesToSend;
    
    console.log(`Sent chunk: ${samplesToSend} samples (total: ${totalSamples})`);
  }
}, 100); // Every 100ms
```

#### Chunk Receiver with Buffer

```javascript
// chunk-receiver.js
import { resolveByProp, StreamInlet } from 'node-labstreaminglayer';

const streams = resolveByProp('name', 'HighFreqData', 1, 5.0);

if (streams.length === 0) {
  console.error('Stream not found!');
  process.exit(1);
}

// Large buffer for high-frequency data
const inlet = new StreamInlet(
  streams[0],
  360,   // 360 second buffer
  1000   // Max chunk size
);

console.log('Receiving high-frequency data in chunks...\n');

let totalReceived = 0;
let lastReport = Date.now();

// Pull chunks efficiently
const receiveChunks = () => {
  try {
    // Pull up to 500 samples at once
    const [samples, timestamps] = inlet.pullChunk(0.0, 500);
    
    if (samples.length > 0) {
      totalReceived += samples.length;
      
      // Process the chunk
      const avgValues = new Float32Array(64);
      for (const sample of samples) {
        for (let ch = 0; ch < 64; ch++) {
          avgValues[ch] += sample[ch] / samples.length;
        }
      }
      
      // Report statistics
      if (Date.now() - lastReport > 1000) {
        console.log(`Rate: ${totalReceived} Hz | Chunk: ${samples.length} samples`);
        console.log(`Avg Ch0-3: [${avgValues.slice(0, 4).map(v => v.toFixed(1)).join(', ')}]`);
        totalReceived = 0;
        lastReport = Date.now();
      }
    }
  } catch (error) {
    // Handle errors
  }
};

// High-frequency polling for chunks
setInterval(receiveChunks, 10);
```

### Stream Metadata

#### Rich Metadata Example

```javascript
// metadata-example.js
import { StreamInfo, StreamOutlet } from 'node-labstreaminglayer';

// Create stream with comprehensive metadata
const info = new StreamInfo(
  'RichMetadataStream',
  'Biosignals',
  8,
  250,
  'float32',
  'bio_001'
);

// Build comprehensive metadata tree
const desc = info.desc();

// Acquisition setup
const acq = desc.appendChild('acquisition');
acq.appendChildValue('manufacturer', 'BioDevices Inc');
acq.appendChildValue('model', 'BioAmp-8');
acq.appendChildValue('serial_number', 'BA8-2024-001');
acq.appendChildValue('sampling_rate', '250');
acq.appendChildValue('resolution', '24');

// Channel descriptions
const channels = desc.appendChild('channels');
const channelInfo = [
  { label: 'ECG_I', type: 'ECG', unit: 'millivolts', position: 'Lead I' },
  { label: 'ECG_II', type: 'ECG', unit: 'millivolts', position: 'Lead II' },
  { label: 'EMG_L', type: 'EMG', unit: 'microvolts', position: 'Left Bicep' },
  { label: 'EMG_R', type: 'EMG', unit: 'microvolts', position: 'Right Bicep' },
  { label: 'EDA', type: 'EDA', unit: 'microsiemens', position: 'Fingers' },
  { label: 'RESP', type: 'Respiration', unit: 'arbitrary', position: 'Chest' },
  { label: 'TEMP', type: 'Temperature', unit: 'celsius', position: 'Forehead' },
  { label: 'PPG', type: 'PPG', unit: 'arbitrary', position: 'Finger' }
];

channelInfo.forEach((ch, index) => {
  const channel = channels.appendChild('channel');
  channel.appendChildValue('label', ch.label);
  channel.appendChildValue('type', ch.type);
  channel.appendChildValue('unit', ch.unit);
  channel.appendChildValue('position', ch.position);
  channel.appendChildValue('index', String(index));
});

// Subject information
const subject = desc.appendChild('subject');
subject.appendChildValue('id', 'SUB001');
subject.appendChildValue('age', '25');
subject.appendChildValue('gender', 'F');
subject.appendChildValue('handedness', 'right');

// Experiment information
const experiment = desc.appendChild('experiment');
experiment.appendChildValue('paradigm', 'resting_state');
experiment.appendChildValue('duration', '300');
experiment.appendChildValue('date', new Date().toISOString());
experiment.appendChildValue('researcher', 'Dr. Smith');

// Synchronization info
const sync = desc.appendChild('synchronization');
sync.appendChildValue('offset_mean', '0.0');
sync.appendChildValue('offset_rms', '0.001');
sync.appendChildValue('offset_median', '0.0');
sync.appendChildValue('offset_5_percentile', '-0.002');
sync.appendChildValue('offset_95_percentile', '0.002');

// Print the complete XML
console.log('Stream metadata:');
console.log(info.asXml());

const outlet = new StreamOutlet(info);
console.log('\nStream created with rich metadata');
```

### Time Synchronization

#### Synchronized Multi-stream Recording

```javascript
// time-sync-example.js
import { 
  StreamInfo, 
  StreamOutlet, 
  StreamInlet,
  resolveStreams,
  localClock,
  proc_clocksync,
  proc_dejitter
} from 'node-labstreaminglayer';

// Create multiple synchronized streams
function createSyncedStream(name, type, channels, rate) {
  const info = new StreamInfo(name, type, channels, rate, 'float32');
  const outlet = new StreamOutlet(info);
  
  // Synchronized data generation
  const startTime = localClock();
  let sampleIndex = 0;
  
  const sendData = () => {
    const currentTime = localClock();
    const elapsed = currentTime - startTime;
    const targetSamples = Math.floor(elapsed * rate);
    
    while (sampleIndex < targetSamples) {
      const sample = new Float32Array(channels);
      const t = sampleIndex / rate;
      
      for (let ch = 0; ch < channels; ch++) {
        sample[ch] = Math.sin(2 * Math.PI * (ch + 1) * t);
      }
      
      // Use precise timestamp
      const timestamp = startTime + (sampleIndex / rate);
      outlet.pushSample(sample, timestamp, true);
      sampleIndex++;
    }
  };
  
  setInterval(sendData, 10);
  return outlet;
}

// Create synchronized streams
const outlets = [
  createSyncedStream('SyncedEEG', 'EEG', 32, 256),
  createSyncedStream('SyncedEMG', 'EMG', 8, 1000),
  createSyncedStream('SyncedECG', 'ECG', 3, 500)
];

console.log('Created 3 synchronized streams');

// Synchronized receiver
setTimeout(() => {
  console.log('\nConnecting to all streams...');
  
  const streams = resolveStreams(2.0);
  const inlets = streams.map(stream => {
    console.log(`Found: ${stream.name()} (${stream.type()})`);
    return new StreamInlet(
      stream,
      360,
      0,
      true,
      proc_clocksync | proc_dejitter  // Enable time correction
    );
  });
  
  // Check time correction
  setTimeout(() => {
    console.log('\nTime corrections:');
    inlets.forEach((inlet, i) => {
      const correction = inlet.timeCorrection(1.0);
      console.log(`${streams[i].name()}: ${(correction * 1000).toFixed(3)} ms`);
    });
    
    // Synchronized data reception
    console.log('\nReceiving synchronized data...');
    
    const receiveSync = () => {
      const samples = [];
      
      inlets.forEach((inlet, i) => {
        try {
          const [sample, timestamp] = inlet.pullSample(0.0);
          samples.push({
            stream: streams[i].name(),
            timestamp: timestamp,
            data: sample[0]  // First channel only
          });
        } catch (e) {
          // No data available
        }
      });
      
      // Check synchronization
      if (samples.length > 1) {
        const timeDiffs = [];
        for (let i = 1; i < samples.length; i++) {
          timeDiffs.push(samples[i].timestamp - samples[0].timestamp);
        }
        
        console.log(`Sync: ${samples.map(s => s.stream).join(', ')}`);
        console.log(`Time diffs (ms): ${timeDiffs.map(d => (d * 1000).toFixed(1)).join(', ')}`);
      }
    };
    
    setInterval(receiveSync, 100);
  }, 2000);
}, 1000);
```

### Performance Testing

#### Throughput and Latency Test

```javascript
// performance-test.js
import { 
  StreamInfo, 
  StreamOutlet, 
  StreamInlet,
  localClock,
  resolveByProp
} from 'node-labstreaminglayer';

// Test configuration
const TEST_DURATION = 10; // seconds
const CHANNEL_COUNT = 64;
const SAMPLE_RATE = 1000;
const CHUNK_SIZE = 100;

console.log('LSL Performance Test');
console.log(`Channels: ${CHANNEL_COUNT}, Rate: ${SAMPLE_RATE} Hz, Duration: ${TEST_DURATION}s`);

// Create test stream
const info = new StreamInfo(
  'PerfTest',
  'Performance',
  CHANNEL_COUNT,
  SAMPLE_RATE,
  'float32',
  'perf_test'
);

const outlet = new StreamOutlet(info, CHUNK_SIZE);

// Performance metrics
let sentSamples = 0;
let sentBytes = 0;
const startTime = localClock();

// Producer
const producer = setInterval(() => {
  const chunk = [];
  for (let i = 0; i < CHUNK_SIZE; i++) {
    const sample = new Float32Array(CHANNEL_COUNT);
    // Include timestamp in first channel for latency measurement
    sample[0] = localClock();
    for (let ch = 1; ch < CHANNEL_COUNT; ch++) {
      sample[ch] = Math.random();
    }
    chunk.push(sample);
  }
  
  outlet.pushChunk(chunk);
  sentSamples += CHUNK_SIZE;
  sentBytes += CHUNK_SIZE * CHANNEL_COUNT * 4; // float32 = 4 bytes
}, 100); // Send chunks at 10 Hz

// Consumer
setTimeout(() => {
  console.log('\nStarting consumer...');
  
  const streams = resolveByProp('name', 'PerfTest', 1, 2.0);
  if (streams.length === 0) {
    console.error('Test stream not found!');
    return;
  }
  
  const inlet = new StreamInlet(streams[0], 360, 1000);
  
  let receivedSamples = 0;
  let totalLatency = 0;
  let minLatency = Infinity;
  let maxLatency = -Infinity;
  
  const consumer = setInterval(() => {
    try {
      const [samples, timestamps] = inlet.pullChunk(0.0, 1000);
      
      for (const sample of samples) {
        const sendTime = sample[0];
        const receiveTime = localClock();
        const latency = (receiveTime - sendTime) * 1000; // Convert to ms
        
        totalLatency += latency;
        minLatency = Math.min(minLatency, latency);
        maxLatency = Math.max(maxLatency, latency);
        receivedSamples++;
      }
    } catch (e) {
      // No data
    }
  }, 10);
  
  // Report results
  setTimeout(() => {
    clearInterval(producer);
    clearInterval(consumer);
    
    const duration = localClock() - startTime;
    const throughput = sentBytes / duration / (1024 * 1024); // MB/s
    const avgLatency = totalLatency / receivedSamples;
    const lossRate = (1 - receivedSamples / sentSamples) * 100;
    
    console.log('\n=== Performance Results ===');
    console.log(`Duration: ${duration.toFixed(2)}s`);
    console.log(`Sent: ${sentSamples} samples (${(sentBytes / 1024 / 1024).toFixed(2)} MB)`);
    console.log(`Received: ${receivedSamples} samples`);
    console.log(`Loss rate: ${lossRate.toFixed(2)}%`);
    console.log(`Throughput: ${throughput.toFixed(2)} MB/s`);
    console.log(`Latency - Avg: ${avgLatency.toFixed(2)}ms, Min: ${minLatency.toFixed(2)}ms, Max: ${maxLatency.toFixed(2)}ms`);
    
    outlet.destroy();
    inlet.destroy();
    process.exit(0);
  }, TEST_DURATION * 1000);
}, 1000);
```

## Real-World Applications

### BCI Application

#### Motor Imagery BCI System

```javascript
// bci-motor-imagery.js
import { 
  StreamInfo, 
  StreamOutlet, 
  StreamInlet,
  resolveByProp,
  localClock
} from 'node-labstreaminglayer';

// BCI Configuration
const EEG_CHANNELS = ['C3', 'C4', 'Cz', 'FC3', 'FC4', 'CP3', 'CP4', 'FCz'];
const SAMPLE_RATE = 256;
const WINDOW_SIZE = 256 * 2; // 2 second window
const OVERLAP = 128; // 0.5 second overlap

class MotorImageryBCI {
  constructor() {
    this.eegInlet = null;
    this.markerOutlet = null;
    this.buffer = [];
    this.setupStreams();
  }
  
  async setupStreams() {
    // Connect to EEG stream
    console.log('Connecting to EEG stream...');
    const eegStreams = resolveByProp('type', 'EEG', 1, 5.0);
    
    if (eegStreams.length === 0) {
      throw new Error('No EEG stream found!');
    }
    
    this.eegInlet = new StreamInlet(eegStreams[0]);
    console.log(`Connected to: ${eegStreams[0].name()}`);
    
    // Create BCI output stream
    const bciInfo = new StreamInfo(
      'BCIOutput',
      'BCI',
      1,
      0, // Irregular rate
      'string',
      'bci_mi_001'
    );
    
    this.markerOutlet = new StreamOutlet(bciInfo);
    console.log('BCI output stream created');
    
    // Start processing
    this.startProcessing();
  }
  
  startProcessing() {
    console.log('BCI system running...\n');
    
    // Data acquisition loop
    setInterval(() => {
      try {
        // Pull available samples
        const [samples, timestamps] = this.eegInlet.pullChunk(0.0, 100);
        
        // Add to buffer
        for (let i = 0; i < samples.length; i++) {
          this.buffer.push({
            data: samples[i],
            timestamp: timestamps[i]
          });
        }
        
        // Process when enough data
        if (this.buffer.length >= WINDOW_SIZE) {
          this.processWindow();
          
          // Slide window
          this.buffer = this.buffer.slice(OVERLAP);
        }
      } catch (error) {
        // No data available
      }
    }, 10);
  }
  
  processWindow() {
    const window = this.buffer.slice(0, WINDOW_SIZE);
    
    // Extract C3 and C4 channels (motor cortex)
    const c3Index = 0; // Assuming C3 is first channel
    const c4Index = 1; // Assuming C4 is second channel
    
    const c3Data = window.map(s => s.data[c3Index]);
    const c4Data = window.map(s => s.data[c4Index]);
    
    // Calculate band power (8-12 Hz alpha, 13-30 Hz beta)
    const c3Alpha = this.calculateBandPower(c3Data, 8, 12);
    const c3Beta = this.calculateBandPower(c3Data, 13, 30);
    const c4Alpha = this.calculateBandPower(c4Data, 8, 12);
    const c4Beta = this.calculateBandPower(c4Data, 13, 30);
    
    // Simple lateralization index
    const lateralizationAlpha = (c3Alpha - c4Alpha) / (c3Alpha + c4Alpha);
    const lateralizationBeta = (c3Beta - c4Beta) / (c3Beta + c4Beta);
    
    // Classification (simplified)
    let classification = 'rest';
    
    if (lateralizationAlpha > 0.2 && lateralizationBeta > 0.1) {
      classification = 'right_hand';
    } else if (lateralizationAlpha < -0.2 && lateralizationBeta < -0.1) {
      classification = 'left_hand';
    }
    
    // Send classification
    const timestamp = window[window.length - 1].timestamp;
    this.markerOutlet.pushSample([classification], timestamp);
    
    // Log results
    console.log(`[${timestamp.toFixed(3)}] Classification: ${classification}`);
    console.log(`  Alpha: C3=${c3Alpha.toFixed(2)}, C4=${c4Alpha.toFixed(2)}, Lat=${lateralizationAlpha.toFixed(3)}`);
    console.log(`  Beta:  C3=${c3Beta.toFixed(2)}, C4=${c4Beta.toFixed(2)}, Lat=${lateralizationBeta.toFixed(3)}\n`);
  }
  
  calculateBandPower(data, lowFreq, highFreq) {
    // Simplified band power calculation
    // In practice, use proper FFT (e.g., fft.js library)
    
    // Mock calculation for demonstration
    let power = 0;
    for (let i = 0; i < data.length; i++) {
      power += data[i] * data[i];
    }
    
    // Normalize and add frequency-based variation
    power = power / data.length;
    power *= (1 + Math.random() * 0.5); // Add variability
    
    return power;
  }
}

// Run BCI system
const bci = new MotorImageryBCI();

// Cleanup on exit
process.on('SIGINT', () => {
  console.log('\nShutting down BCI system...');
  if (bci.eegInlet) bci.eegInlet.destroy();
  if (bci.markerOutlet) bci.markerOutlet.destroy();
  process.exit(0);
});
```

### Data Logger

#### Multi-stream Data Logger to CSV

```javascript
// data-logger.js
import { 
  ContinuousResolver,
  StreamInlet,
  localClock
} from 'node-labstreaminglayer';
import { createWriteStream } from 'fs';
import { join } from 'path';

class LSLDataLogger {
  constructor(outputDir = './recordings') {
    this.outputDir = outputDir;
    this.resolver = new ContinuousResolver();
    this.inlets = new Map();
    this.files = new Map();
    this.startTime = localClock();
    
    // Create output directory
    if (!require('fs').existsSync(outputDir)) {
      require('fs').mkdirSync(outputDir, { recursive: true });
    }
    
    console.log(`LSL Data Logger - Output: ${outputDir}`);
    this.startMonitoring();
  }
  
  startMonitoring() {
    // Check for new streams periodically
    setInterval(() => {
      const streams = this.resolver.results();
      
      streams.forEach(stream => {
        const uid = stream.uid();
        
        if (!this.inlets.has(uid)) {
          this.connectToStream(stream);
        }
      });
    }, 1000);
    
    // Log data from all connected streams
    setInterval(() => {
      this.logData();
    }, 10);
  }
  
  connectToStream(streamInfo) {
    const uid = streamInfo.uid();
    const name = streamInfo.name();
    const type = streamInfo.type();
    
    console.log(`Connecting to: ${name} (${type})`);
    
    // Create inlet
    const inlet = new StreamInlet(streamInfo, 360, 0, true);
    this.inlets.set(uid, { inlet, info: streamInfo });
    
    // Create CSV file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${name}_${type}_${timestamp}.csv`;
    const filepath = join(this.outputDir, filename);
    
    const file = createWriteStream(filepath);
    this.files.set(uid, file);
    
    // Write header
    const channels = streamInfo.channelCount();
    const headers = ['timestamp'];
    
    for (let i = 0; i < channels; i++) {
      headers.push(`ch${i}`);
    }
    
    file.write(headers.join(',') + '\n');
    console.log(`Logging to: ${filename}`);
  }
  
  logData() {
    this.inlets.forEach((stream, uid) => {
      const { inlet, info } = stream;
      const file = this.files.get(uid);
      
      try {
        // Pull all available samples
        const [samples, timestamps] = inlet.pullChunk(0.0, 1000);
        
        // Write to CSV
        for (let i = 0; i < samples.length; i++) {
          const row = [timestamps[i].toFixed(6), ...samples[i]];
          file.write(row.join(',') + '\n');
        }
        
        if (samples.length > 0) {
          const elapsed = localClock() - this.startTime;
          console.log(`[${elapsed.toFixed(1)}s] ${info.name()}: ${samples.length} samples logged`);
        }
      } catch (error) {
        // No data available
      }
    });
  }
  
  stop() {
    console.log('\nStopping logger...');
    
    // Close all files
    this.files.forEach(file => file.end());
    
    // Destroy inlets
    this.inlets.forEach(stream => stream.inlet.destroy());
    
    // Stop resolver
    this.resolver.destroy();
    
    const duration = localClock() - this.startTime;
    console.log(`Recording duration: ${duration.toFixed(1)}s`);
    console.log(`Files saved to: ${this.outputDir}`);
  }
}

// Run logger
const logger = new LSLDataLogger('./recordings');

// Stop on Ctrl+C
process.on('SIGINT', () => {
  logger.stop();
  process.exit(0);
});

// Log for specified duration
const DURATION = 60; // seconds
console.log(`Logging for ${DURATION} seconds...`);

setTimeout(() => {
  logger.stop();
  process.exit(0);
}, DURATION * 1000);
```

### Stream Bridge

#### Bridge Between Different Protocols

```javascript
// websocket-bridge.js
import { 
  resolveByProp,
  StreamInlet,
  StreamInfo,
  StreamOutlet
} from 'node-labstreaminglayer';
import { WebSocketServer } from 'ws';

class LSLWebSocketBridge {
  constructor(lslStreamName, wsPort = 8080) {
    this.lslStreamName = lslStreamName;
    this.wsPort = wsPort;
    this.inlet = null;
    this.clients = new Set();
    
    this.setupLSL();
    this.setupWebSocket();
  }
  
  async setupLSL() {
    console.log(`Connecting to LSL stream: ${this.lslStreamName}`);
    
    const streams = resolveByProp('name', this.lslStreamName, 1, 10.0);
    
    if (streams.length === 0) {
      throw new Error(`Stream '${this.lslStreamName}' not found!`);
    }
    
    this.streamInfo = streams[0];
    this.inlet = new StreamInlet(this.streamInfo);
    
    console.log(`Connected to: ${this.streamInfo.name()}`);
    console.log(`Channels: ${this.streamInfo.channelCount()}`);
    console.log(`Sample rate: ${this.streamInfo.nominalSrate()} Hz`);
    
    // Start data relay
    this.startRelay();
  }
  
  setupWebSocket() {
    this.wss = new WebSocketServer({ port: this.wsPort });
    
    this.wss.on('connection', (ws) => {
      console.log('New WebSocket client connected');
      this.clients.add(ws);
      
      // Send stream info on connection
      ws.send(JSON.stringify({
        type: 'streamInfo',
        name: this.streamInfo.name(),
        channels: this.streamInfo.channelCount(),
        sampleRate: this.streamInfo.nominalSrate(),
        dataType: this.streamInfo.channelFormat()
      }));
      
      ws.on('close', () => {
        console.log('Client disconnected');
        this.clients.delete(ws);
      });
      
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.clients.delete(ws);
      });
    });
    
    console.log(`WebSocket server running on port ${this.wsPort}`);
  }
  
  startRelay() {
    // High-frequency data relay
    setInterval(() => {
      try {
        // Pull all available samples
        const [samples, timestamps] = this.inlet.pullChunk(0.0, 100);
        
        if (samples.length > 0 && this.clients.size > 0) {
          // Package data
          const data = {
            type: 'samples',
            samples: samples,
            timestamps: timestamps
          };
          
          const message = JSON.stringify(data);
          
          // Broadcast to all clients
          this.clients.forEach(client => {
            if (client.readyState === 1) { // WebSocket.OPEN
              client.send(message);
            }
          });
        }
      } catch (error) {
        // No data available
      }
    }, 10); // 100 Hz polling
  }
  
  stop() {
    if (this.inlet) this.inlet.destroy();
    if (this.wss) this.wss.close();
    console.log('Bridge stopped');
  }
}

// Example: Create bidirectional bridge
class BidirectionalBridge extends LSLWebSocketBridge {
  constructor(lslStreamName, wsPort) {
    super(lslStreamName, wsPort);
    this.setupReverseChannel();
  }
  
  setupReverseChannel() {
    // Create LSL outlet for data from WebSocket
    const info = new StreamInfo(
      'WebSocketInput',
      'Control',
      1,
      0, // Irregular rate
      'string',
      'ws_bridge'
    );
    
    this.outlet = new StreamOutlet(info);
    console.log('Created reverse channel: WebSocketInput');
  }
  
  setupWebSocket() {
    super.setupWebSocket();
    
    // Handle incoming messages
    this.wss.on('connection', (ws) => {
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          
          if (data.type === 'command') {
            // Forward to LSL
            this.outlet.pushSample([data.value]);
            console.log(`Command received: ${data.value}`);
          }
        } catch (error) {
          console.error('Invalid message:', error);
        }
      });
    });
  }
}

// Run bridge
const bridge = new BidirectionalBridge('TestStream', 8080);

// Example WebSocket client (for testing)
console.log('\nExample WebSocket client code:');
console.log(`
const ws = new WebSocket('ws://localhost:8080');

ws.on('open', () => {
  console.log('Connected to LSL bridge');
  
  // Send command
  ws.send(JSON.stringify({
    type: 'command',
    value: 'start_recording'
  }));
});

ws.on('message', (data) => {
  const msg = JSON.parse(data);
  
  if (msg.type === 'samples') {
    console.log(\`Received \${msg.samples.length} samples\`);
  }
});
`);

// Cleanup
process.on('SIGINT', () => {
  bridge.stop();
  process.exit(0);
});
```

## Running the Examples

1. **Install the package:**
   ```bash
   npm install node-labstreaminglayer
   ```

2. **Save any example to a file** (e.g., `example.js`)

3. **Run with Node.js:**
   ```bash
   node example.js
   ```

4. **For multi-stream examples**, run producer and consumer in separate terminals

## Tips for Examples

- Always handle errors gracefully, especially `TimeoutError`
- Use appropriate buffer sizes for your data rate
- Enable time correction flags for synchronized recording
- Use chunks for high-frequency data (>100 Hz)
- Clean up resources (destroy outlets/inlets) on exit
- Add proper signal handlers for Ctrl+C

## Next Steps

- Explore the [API Reference](./api-reference.md) for detailed documentation
- Learn about [Advanced Usage](./advanced-usage.md) for optimization
- Check [Data Types](./data-types.md) for format specifications
- See [Troubleshooting](./troubleshooting.md) for common issues