/**
 * Example: Send data through LSL
 * 
 * This example shows how to create a stream outlet and send data.
 * It creates an 8-channel EEG stream at 100 Hz and sends random data.
 */

import { StreamInfo, StreamOutlet, localClock } from '../index.js';

function main() {
  // Stream configuration
  const srate = 100; // Sampling rate in Hz
  const name = 'BioSemi';
  const type = 'EEG';
  const nChannels = 8;
  
  console.log(`Creating stream: ${name} (${type}) with ${nChannels} channels at ${srate} Hz`);
  
  // Create stream info
  const info = new StreamInfo(
    name,
    type,
    nChannels,
    srate,
    'float32',
    'myuid34234'
  );
  
  // Create stream outlet
  const outlet = new StreamOutlet(info);
  
  console.log('Now sending data...');
  console.log('Press Ctrl+C to stop');
  
  const startTime = localClock();
  let sentSamples = 0;
  
  // Main sending loop
  const sendData = () => {
    const elapsedTime = localClock() - startTime;
    const requiredSamples = Math.floor(srate * elapsedTime) - sentSamples;
    
    for (let sampleIx = 0; sampleIx < requiredSamples; sampleIx++) {
      // Generate random sample across channels
      const mySample = Array.from({ length: nChannels }, () => Math.random());
      
      // Send the sample with current timestamp
      outlet.pushSample(mySample);
      sentSamples++;
    }
    
    // Schedule next batch
    setTimeout(sendData, 10); // Check every 10ms
  };
  
  // Start sending
  sendData();
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\nShutting down...');
    outlet.destroy();
    process.exit(0);
  });
}

// Run the example
main();