/**
 * Example: Send data in chunks through LSL
 * 
 * This example demonstrates efficient batch transmission using pushChunk.
 * Chunks are more efficient than individual samples for high-throughput streams.
 */

import { StreamInfo, StreamOutlet, localClock, cf_float32 } from '../index.js';

function main() {
  // Stream configuration
  const srate = 500; // 500 Hz sampling rate
  const name = 'ChunkedEEG';
  const type = 'EEG';
  const nChannels = 32; // 32-channel EEG
  const chunkSize = 25; // Send 25 samples at a time (50ms at 500Hz)
  
  console.log(`Creating chunked stream: ${name} (${type})`);
  console.log(`Configuration: ${nChannels} channels at ${srate} Hz`);
  console.log(`Chunk size: ${chunkSize} samples per chunk`);
  
  // Create stream info with chunk size hint
  const info = new StreamInfo(
    name,
    type,
    nChannels,
    srate,
    cf_float32,
    'chunked_eeg_demo'
  );
  
  // Create outlet with chunk size optimization
  const outlet = new StreamOutlet(info, chunkSize);
  
  console.log('\nNow sending data in chunks...');
  console.log('Press Ctrl+C to stop\n');
  
  let totalSamples = 0;
  let totalChunks = 0;
  const startTime = localClock();
  
  // Main chunk sending loop
  const sendChunk = () => {
    const currentTime = localClock();
    const elapsedTime = currentTime - startTime;
    
    // Generate a chunk of samples (2D array format)
    const chunk: number[][] = [];
    const timestamps: number[] = [];
    
    for (let s = 0; s < chunkSize; s++) {
      // Generate one sample (all channels)
      const sample: number[] = [];
      for (let ch = 0; ch < nChannels; ch++) {
        // Simulate EEG data: sine wave + noise
        const signal = Math.sin(2 * Math.PI * 10 * (totalSamples / srate)) * 50;
        const noise = (Math.random() - 0.5) * 10;
        sample.push(signal + noise);
      }
      chunk.push(sample);
      
      // Calculate timestamp for this sample
      timestamps.push(startTime + (totalSamples / srate));
      totalSamples++;
    }
    
    // Method 1: Push chunk with individual timestamps
    outlet.pushChunk(chunk, timestamps);
    
    // Alternative Method 2: Push chunk with single timestamp (commented out)
    // outlet.pushChunk(chunk, currentTime);
    
    // Alternative Method 3: Push as flattened array (commented out)
    // const flatData = chunk.flat();
    // outlet.pushChunk(flatData, timestamps);
    
    totalChunks++;
    
    // Print statistics every second
    if (totalChunks % (srate / chunkSize) === 0) {
      const throughput = totalSamples / elapsedTime;
      console.log(`Sent ${totalChunks} chunks (${totalSamples} samples) | ` +
                  `Throughput: ${throughput.toFixed(1)} samples/sec | ` +
                  `Elapsed: ${elapsedTime.toFixed(1)}s`);
    }
    
    // Schedule next chunk (20 Hz for 25-sample chunks at 500 Hz)
    setTimeout(sendChunk, chunkSize * 1000 / srate);
  };
  
  // Wait for consumers before starting
  console.log('Waiting for consumers...');
  if (outlet.waitForConsumers(5.0)) {
    console.log('Consumer connected! Starting transmission.\n');
    sendChunk();
  } else {
    console.log('No consumers found. Starting anyway...\n');
    sendChunk();
  }
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    const elapsedTime = localClock() - startTime;
    console.log('\n\nShutting down...');
    console.log(`Final statistics:`);
    console.log(`  Total chunks sent: ${totalChunks}`);
    console.log(`  Total samples sent: ${totalSamples}`);
    console.log(`  Average throughput: ${(totalSamples / elapsedTime).toFixed(1)} samples/sec`);
    console.log(`  Total time: ${elapsedTime.toFixed(2)} seconds`);
    
    outlet.destroy();
    info.destroy();
    process.exit(0);
  });
}

// Run the example
main();