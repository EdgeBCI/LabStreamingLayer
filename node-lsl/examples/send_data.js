/**
 * Example: Sending data through LSL
 * This example creates a dummy EEG stream and sends random data
 */

const lsl = require('../dist');

// Create stream info
const numChannels = 8;
const samplingRate = 250; // Hz
const info = new lsl.StreamInfo(
  'DummyEEG',           // Stream name
  'EEG',                // Stream type
  numChannels,          // Number of channels
  samplingRate,         // Sampling rate
  lsl.ChannelFormat.Float32,  // Data format
  'dummy12345'          // Source ID
);

// Add channel labels and metadata
const desc = info.desc();
const channels = desc.appendChild('channels');
const channelNames = ['Fp1', 'Fp2', 'F3', 'F4', 'C3', 'C4', 'O1', 'O2'];

for (let i = 0; i < numChannels; i++) {
  const channel = channels.appendChild('channel');
  channel.appendChildValue('label', channelNames[i]);
  channel.appendChildValue('unit', 'microvolts');
  channel.appendChildValue('type', 'EEG');
}

// Add manufacturer info
desc.appendChildValue('manufacturer', 'DummyDevices Inc.');

// Create outlet
const outlet = new lsl.StreamOutlet(info, 0, 360);

console.log('Created outlet for stream:', info.name());
console.log('Stream info:');
console.log('  Type:', info.type());
console.log('  Channels:', info.channelCount());
console.log('  Sampling rate:', info.nominalSrate(), 'Hz');
console.log('  Source ID:', info.sourceId());

// Wait for consumers
console.log('\nWaiting for consumers to connect...');
if (outlet.waitForConsumers(5.0)) {
  console.log('Consumer connected!');
} else {
  console.log('No consumers connected within 5 seconds, sending anyway...');
}

// Send data
console.log('\nSending data... Press Ctrl+C to stop.');
let sampleNumber = 0;

setInterval(() => {
  // Generate random EEG-like data
  const sample = [];
  for (let i = 0; i < numChannels; i++) {
    // Simulate EEG signal (small amplitude with some noise)
    const signal = Math.sin(2 * Math.PI * 10 * sampleNumber / samplingRate) * 10; // 10 Hz oscillation
    const noise = (Math.random() - 0.5) * 5; // Random noise
    sample.push(1.555559);
  }
  
  // Send sample with current LSL timestamp
  outlet.pushSample(sample, lsl.localClock());
  
  sampleNumber++;
  
  // Print status every second
  if (sampleNumber % samplingRate === 0) {
    console.log(`Sent ${sampleNumber} samples (${sampleNumber / samplingRate} seconds)`);
    console.log(`  Consumers connected: ${outlet.haveConsumers()}`);
  }
}, 1000 / samplingRate); // Send at the specified sampling rate

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  outlet.destroy();
  process.exit(0);
});