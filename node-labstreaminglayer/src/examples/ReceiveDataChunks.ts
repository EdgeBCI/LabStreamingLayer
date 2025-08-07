/**
 * Example: Receive data in chunks through LSL
 * 
 * This example demonstrates efficient batch reception using pullChunk.
 * Pulling chunks is more efficient than individual samples for high-throughput streams.
 */

import { 
  resolveStreams, 
  StreamInlet, 
  localClock,
  FOREVER
} from '../index.js';

function main() {
  console.log('Looking for streams...');
  const streams = resolveStreams(2.0);
  
  if (streams.length === 0) {
    console.log('No streams found. Make sure a sender is running.');
    process.exit(1);
  }
  
  // Display available streams
  console.log(`\nFound ${streams.length} stream(s):`);
  streams.forEach((stream, index) => {
    console.log(`  [${index}] ${stream.name()} (${stream.type()}) - ` +
                `${stream.channelCount()} channels at ${stream.nominalSrate()} Hz`);
  });
  
  // Select the first stream (or find specific one)
  let selectedStream = streams[0];
  
  // Try to find ChunkedEEG stream if available
  for (const stream of streams) {
    if (stream.name() === 'ChunkedEEG') {
      selectedStream = stream;
      console.log('\nAutoselected ChunkedEEG stream');
      break;
    }
  }
  
  console.log(`\nConnecting to: ${selectedStream.name()}`);
  
  // Create inlet with large buffer
  const inlet = new StreamInlet(
    selectedStream,
    360,  // max_buflen in seconds
    32,   // max_chunklen (0 = use outlet chunk size)
    true  // recover from lost streams
  );
  
  // Open the stream
  console.log('Opening stream...');
  inlet.openStream(5.0);
  
  const info = inlet.info(1.0);
  const channelCount = info.channelCount();
  const srate = info.nominalSrate();
  
  console.log(`Stream opened: ${channelCount} channels at ${srate} Hz`);
  console.log('Now receiving data in chunks...');
  console.log('Press Ctrl+C to stop\n');
  
  let totalSamples = 0;
  let totalChunks = 0;
  const startTime = localClock();
  let lastPrintTime = startTime;
  
  // Statistics tracking
  let minChunkSize = Infinity;
  let maxChunkSize = 0;
  let totalLatency = 0;
  let latencyCount = 0;
  
  // Main chunk receiving loop
  const receiveChunks = () => {
    try {
      // Pull chunk with timeout
      // Using small timeout for responsive updates
      const [samples, timestamps] = inlet.pullChunk(
        0.01,  // 10ms timeout
        100    // max 100 samples per pull
      );
      
      if (samples && samples.length > 0) {
        const chunkSize = samples.length;
        totalSamples += chunkSize;
        totalChunks++;
        
        // Track chunk size statistics
        minChunkSize = Math.min(minChunkSize, chunkSize);
        maxChunkSize = Math.max(maxChunkSize, chunkSize);
        
        // Calculate latency (if stream provides timestamps)
        if (timestamps.length > 0 && timestamps[timestamps.length - 1] > 0) {
          const currentTime = localClock();
          const latency = currentTime - timestamps[timestamps.length - 1];
          if (latency > 0 && latency < 1.0) { // Reasonable latency range
            totalLatency += latency;
            latencyCount++;
          }
        }
        
        // Process the data (example: calculate RMS for each channel)
        const rms: number[] = new Array(channelCount).fill(0);
        for (const sample of samples) {
          for (let ch = 0; ch < channelCount; ch++) {
            rms[ch] += sample[ch] * sample[ch];
          }
        }
        
        // Calculate RMS values
        for (let ch = 0; ch < channelCount; ch++) {
          rms[ch] = Math.sqrt(rms[ch] / chunkSize);
        }
        
        // Print detailed info for first few chunks
        if (totalChunks <= 3) {
          console.log(`Chunk ${totalChunks}: ${chunkSize} samples`);
          console.log(`  First sample: [${samples[0].slice(0, 4).map(v => v.toFixed(2)).join(', ')}...]`);
          console.log(`  RMS values: [${rms.slice(0, 4).map(v => v.toFixed(2)).join(', ')}...]`);
        }
      }
      
      // Print statistics every second
      const currentTime = localClock();
      if (currentTime - lastPrintTime >= 1.0) {
        const elapsedTime = currentTime - startTime;
        const throughput = totalSamples / elapsedTime;
        const avgLatency = latencyCount > 0 ? (totalLatency / latencyCount) * 1000 : 0;
        
        console.log(`Received ${totalChunks} chunks (${totalSamples} samples) | ` +
                    `Throughput: ${throughput.toFixed(1)} samples/sec | ` +
                    `Chunk size: ${minChunkSize}-${maxChunkSize} | ` +
                    `Avg latency: ${avgLatency.toFixed(1)}ms`);
        
        lastPrintTime = currentTime;
      }
      
    } catch (error) {
      console.error('Error receiving chunk:', error);
    }
    
    // Schedule next receive immediately for continuous processing
    setImmediate(receiveChunks);
  };
  
  // Check how many samples are buffered
  const checkBuffer = () => {
    const available = inlet.samplesAvailable();
    if (available > 0) {
      console.log(`\nBuffer contains ${available} samples ready to pull`);
    }
    setTimeout(checkBuffer, 5000); // Check every 5 seconds
  };
  
  // Start receiving
  receiveChunks();
  checkBuffer();
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    const elapsedTime = localClock() - startTime;
    const avgLatency = latencyCount > 0 ? (totalLatency / latencyCount) * 1000 : 0;
    
    console.log('\n\nShutting down...');
    console.log(`Final statistics:`);
    console.log(`  Total chunks received: ${totalChunks}`);
    console.log(`  Total samples received: ${totalSamples}`);
    console.log(`  Average throughput: ${(totalSamples / elapsedTime).toFixed(1)} samples/sec`);
    console.log(`  Chunk size range: ${minChunkSize}-${maxChunkSize} samples`);
    console.log(`  Average latency: ${avgLatency.toFixed(2)} ms`);
    console.log(`  Total time: ${elapsedTime.toFixed(2)} seconds`);
    
    inlet.destroy();
    streams.forEach(s => s.destroy());
    process.exit(0);
  });
}

// Run the example
main();