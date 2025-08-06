/**
 * Example program to demonstrate how to read a multi-channel time-series
 * from LSL in a chunk-by-chunk manner (which is more efficient).
 * 
 * Instead of pulling samples one by one, this example pulls multiple samples
 * at once, which is more efficient for high-throughput streams.
 * 
 * Usage: node ReceiveDataInChunks.js [stream_type]
 *   stream_type: Type of stream to look for (default: "EEG")
 */

const lsl = require('../dist/index.js');

async function main() {
  // Get stream type from command line or use default
  const streamType = process.argv[2] || 'EEG';
  
  console.log(`Looking for a ${streamType} stream...`);
  
  // Resolve streams on the network
  const streams = lsl.resolveByProp('type', streamType, 1, 5.0);
  
  if (streams.length === 0) {
    console.error(`No ${streamType} stream found!`);
    console.log('Make sure a stream is running (e.g., run SendData.js in another terminal)');
    process.exit(1);
  }
  
  console.log(`Found ${streams.length} stream(s)`);
  const streamInfo = streams[0];
  
  // Display stream information
  console.log(`\nConnecting to stream:
  Name: ${streamInfo.getName()}
  Type: ${streamInfo.getType()}
  Channels: ${streamInfo.getChannelCount()}
  Sampling rate: ${streamInfo.getNominalSrate()} Hz
  Source ID: ${streamInfo.getSourceId()}`);
  
  // Create an inlet to read from the stream
  const inlet = new lsl.StreamInlet(streamInfo);
  
  console.log('\nReceiving data in chunks... Press Ctrl+C to stop\n');
  
  let totalSamples = 0;
  const startTime = lsl.localClock();
  
  // Continuously pull chunks of samples
  const pullChunks = () => {
    // Pull a chunk of samples (up to 1024 samples at once)
    // Using timeout of 0.0 for non-blocking operation
    const [chunk, timestamps] = inlet.pullChunk(0.0, 1024);
    
    if (chunk && chunk.length > 0) {
      totalSamples += chunk.length;
      
      // Display information about the chunk
      console.log(`Received chunk with ${chunk.length} samples`);
      
      // Show first and last samples from the chunk
      if (chunk.length > 0) {
        const firstSample = chunk[0].map(v => v.toFixed(4)).join(', ');
        console.log(`  First sample [${timestamps[0].toFixed(6)}]: ${firstSample}`);
        
        if (chunk.length > 1) {
          const lastSample = chunk[chunk.length - 1].map(v => v.toFixed(4)).join(', ');
          console.log(`  Last sample  [${timestamps[timestamps.length - 1].toFixed(6)}]: ${lastSample}`);
        }
      }
      
      // Calculate and display statistics
      const elapsed = lsl.localClock() - startTime;
      const effectiveRate = totalSamples / elapsed;
      console.log(`  Total: ${totalSamples} samples, Effective rate: ${effectiveRate.toFixed(2)} Hz\n`);
    }
  };
  
  // Pull chunks at regular intervals
  // Using a longer interval since we're pulling multiple samples at once
  const interval = setInterval(pullChunks, 100); // 100ms intervals
  
  // Display periodic statistics
  const statsInterval = setInterval(() => {
    const elapsed = lsl.localClock() - startTime;
    const effectiveRate = totalSamples / elapsed;
    const expectedSamples = streamInfo.getNominalSrate() * elapsed;
    const efficiency = (totalSamples / expectedSamples * 100).toFixed(1);
    
    console.log('='.repeat(60));
    console.log(`Statistics after ${elapsed.toFixed(1)} seconds:`);
    console.log(`  Total samples received: ${totalSamples}`);
    console.log(`  Expected samples: ${Math.floor(expectedSamples)}`);
    console.log(`  Efficiency: ${efficiency}%`);
    console.log(`  Effective sampling rate: ${effectiveRate.toFixed(2)} Hz`);
    console.log('='.repeat(60) + '\n');
  }, 5000); // Every 5 seconds
  
  // Handle cleanup on exit
  process.on('SIGINT', () => {
    const elapsed = lsl.localClock() - startTime;
    const effectiveRate = totalSamples / elapsed;
    
    console.log('\n\nFinal Statistics:');
    console.log(`  Total samples received: ${totalSamples}`);
    console.log(`  Total time: ${elapsed.toFixed(2)} seconds`);
    console.log(`  Effective sampling rate: ${effectiveRate.toFixed(2)} Hz`);
    console.log('\nCleaning up...');
    
    clearInterval(interval);
    clearInterval(statsInterval);
    inlet.destroy();
    streams.forEach(s => s.destroy());
    process.exit(0);
  });
}

// Run the example
if (require.main === module) {
  main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
}