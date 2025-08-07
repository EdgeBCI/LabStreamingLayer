/**
 * Example: Receive data from LSL
 * 
 * This example shows how to resolve streams on the network and receive data.
 * It connects to the first available EEG stream and prints received samples.
 */

import { resolveByProp, StreamInlet } from '../index.js';

async function main() {
  console.log('Looking for an EEG stream...');
  
  // Resolve EEG streams on the network
  const streams = resolveByProp('type', 'EEG', 1, 10.0);
  
  if (streams.length === 0) {
    console.log('No EEG stream found. Please start a data source first.');
    console.log('You can run SendData.js in another terminal to create a test stream.');
    process.exit(1);
  }
  
  // Get the first stream
  const streamInfo = streams[0];
  console.log(`Found stream: ${streamInfo.name()} (${streamInfo.type()})`);
  console.log(`  Channels: ${streamInfo.channelCount()}`);
  console.log(`  Sampling rate: ${streamInfo.nominalSrate()} Hz`);
  console.log(`  Source ID: ${streamInfo.sourceId()}`);
  
  // Create an inlet to receive data
  const inlet = new StreamInlet(streamInfo);
  
  console.log('\nReceiving data... Press Ctrl+C to stop\n');
  
  let sampleCount = 0;
  const startTime = Date.now();
  
  // Main receiving loop
  const receiveData = () => {
    // Try to pull a sample with 0 timeout (non-blocking)
    const [sample, timestamp] = inlet.pullSample(0.0);
    
    if (sample !== null) {
      sampleCount++;
      
      // Print every 100th sample to avoid flooding console
      if (sampleCount % 100 === 0) {
        const elapsedSeconds = (Date.now() - startTime) / 1000;
        const effectiveRate = sampleCount / elapsedSeconds;
        
        console.log(`Sample ${sampleCount} @ ${timestamp.toFixed(3)}s:`);
        console.log(`  Data: [${sample.map(v => v.toFixed(4)).join(', ')}]`);
        console.log(`  Effective rate: ${effectiveRate.toFixed(1)} Hz\n`);
      }
    }
    
    // Schedule next receive
    setImmediate(receiveData);
  };
  
  // Start receiving
  receiveData();
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    const elapsedSeconds = (Date.now() - startTime) / 1000;
    console.log('\n\nShutting down...');
    console.log(`Received ${sampleCount} samples in ${elapsedSeconds.toFixed(1)} seconds`);
    console.log(`Average rate: ${(sampleCount / elapsedSeconds).toFixed(1)} Hz`);
    inlet.destroy();
    process.exit(0);
  });
}

// Run the example
main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});