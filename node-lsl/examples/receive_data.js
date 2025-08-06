/**
 * Example: Receiving data through LSL
 * This example connects to an EEG stream and receives data
 */

const lsl = require('../dist');

console.log('Looking for EEG streams...');

// Resolve EEG streams
const streams = lsl.resolveByProp('type', 'EEG', 1, 5.0);

if (streams.length === 0) {
  console.log('No EEG streams found. Make sure a stream is running (e.g., run send_data.js)');
  process.exit(1);
}

// Use the first stream found
const streamInfo = streams[0];
console.log('\nFound stream:');
console.log('  Name:', streamInfo.name());
console.log('  Type:', streamInfo.type());
console.log('  Channels:', streamInfo.channelCount());
console.log('  Sampling rate:', streamInfo.nominalSrate(), 'Hz');
console.log('  Source ID:', streamInfo.sourceId());

// Get channel labels if available
const desc = streamInfo.desc();
const channels = desc.child('channels');
if (channels) {
  console.log('\nChannel labels:');
  let channel = channels.firstChild();
  let channelIndex = 0;
  while (channel && !channel.isEmpty()) {
    const label = channel.childValue('label');
    if (label) {
      console.log(`  ${channelIndex}: ${label}`);
    }
    channel = channel.nextSibling();
    channelIndex++;
  }
}

// Create inlet
const inlet = new lsl.StreamInlet(streamInfo, 360, 0, true);

// Open stream
console.log('\nOpening stream...');
inlet.openStream(5.0);

// Method 1: Pull individual samples
console.log('\nReceiving individual samples for 5 seconds...');
const startTime = Date.now();
let sampleCount = 0;

const pullSamples = setInterval(() => {
  const result = inlet.pullSample(0.0); // Non-blocking pull
  
  if (result.sample) {
    sampleCount++;
    
    // Print every 100th sample
    if (sampleCount % 100 === 0) {
      console.log(`Sample ${sampleCount}:`);
      console.log('  Data:', result.sample.map(v => v.toFixed(2)).join(', '));
      console.log('  Timestamp:', result.timestamp.toFixed(6));
    }
  }
  
  // Stop after 5 seconds
  if (Date.now() - startTime > 5000) {
    clearInterval(pullSamples);
    console.log(`\nReceived ${sampleCount} samples in 5 seconds`);
    
    // Switch to chunk mode
    receiveChunks();
  }
}, 1); // Pull as fast as possible

// Method 2: Pull chunks
function receiveChunks() {
  console.log('\nSwitching to chunk mode for 5 seconds...');
  
  const chunkInterval = setInterval(() => {
    const result = inlet.pullChunk(100, 0.0); // Pull up to 100 samples
    
    if (result.samples.length > 0) {
      console.log(`Received chunk with ${result.samples.length} samples`);
      console.log('  First sample:', result.samples[0].map(v => v.toFixed(2)).join(', '));
      console.log('  Last sample:', result.samples[result.samples.length - 1].map(v => v.toFixed(2)).join(', '));
      console.log('  Time range:', result.timestamps[0].toFixed(6), '-', 
                  result.timestamps[result.timestamps.length - 1].toFixed(6));
    }
  }, 100); // Check every 100ms
  
  // Stop after 5 seconds
  setTimeout(() => {
    clearInterval(chunkInterval);
    
    // Switch to streaming mode
    streamData();
  }, 5000);
}

// Method 3: Stream with EventEmitter
function streamData() {
  console.log('\nSwitching to streaming mode with EventEmitter...');
  console.log('Press Ctrl+C to stop.\n');
  
  let totalSamples = 0;
  
  // Listen for chunk events
  inlet.on('chunk', (result) => {
    totalSamples += result.samples.length;
    
    // Print status every 250 samples (approximately 1 second at 250 Hz)
    if (totalSamples % 250 === 0) {
      console.log(`Streaming: received ${totalSamples} total samples`);
      const lastSample = result.samples[result.samples.length - 1];
      console.log('  Latest values:', lastSample.map(v => v.toFixed(2)).join(', '));
    }
  });
  
  inlet.on('error', (error) => {
    console.error('Stream error:', error);
  });
  
  // Start streaming with chunk size of 25 samples
  inlet.startStreaming(25);
}

// Get time correction (clock sync)
console.log('\nTime correction with sender:', inlet.timeCorrection().toFixed(6), 'seconds');

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  inlet.stopStreaming();
  inlet.closeStream();
  inlet.destroy();
  process.exit(0);
});