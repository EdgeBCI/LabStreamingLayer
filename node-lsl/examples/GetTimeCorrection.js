/**
 * Example program to show how to obtain the time correction offset for a stream.
 * 
 * Time correction is important for synchronizing timestamps between different
 * computers on the network. The time correction value should be added to 
 * remote timestamps to convert them to the local clock domain.
 * 
 * Usage: node GetTimeCorrection.js [stream_type]
 *   stream_type: Type of stream to connect to (default: "EEG")
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
  
  const streamInfo = streams[0];
  
  console.log(`\nConnected to stream: ${streamInfo.getName()} @ ${streamInfo.getHostname()}`);
  console.log(`  Type: ${streamInfo.getType()}`);
  console.log(`  Channels: ${streamInfo.getChannelCount()}`);
  console.log(`  Sampling rate: ${streamInfo.getNominalSrate()} Hz`);
  console.log(`  Source ID: ${streamInfo.getSourceId()}`);
  
  // Create an inlet to read from the stream
  const inlet = new lsl.StreamInlet(streamInfo);
  
  console.log('\nGetting time correction offset...');
  console.log('(First measurement may take a few seconds to stabilize)\n');
  console.log('Press Ctrl+C to stop\n');
  
  let measurementCount = 0;
  let minOffset = Infinity;
  let maxOffset = -Infinity;
  let sumOffset = 0;
  
  // Function to get and display time correction
  const measureTimeCorrection = () => {
    measurementCount++;
    
    // Get the time correction offset
    // This is the value that needs to be added to remote timestamps
    // to convert them to local clock time
    const offset = inlet.timeCorrection();
    
    // Update statistics
    minOffset = Math.min(minOffset, offset);
    maxOffset = Math.max(maxOffset, offset);
    sumOffset += offset;
    const avgOffset = sumOffset / measurementCount;
    
    // Convert to milliseconds for easier reading
    const offsetMs = offset * 1000;
    const avgOffsetMs = avgOffset * 1000;
    const minOffsetMs = minOffset * 1000;
    const maxOffsetMs = maxOffset * 1000;
    
    // Display current measurement
    console.log(`Measurement #${measurementCount}:`);
    console.log(`  Current offset: ${offsetMs.toFixed(3)} ms`);
    console.log(`  Average offset: ${avgOffsetMs.toFixed(3)} ms`);
    console.log(`  Range: [${minOffsetMs.toFixed(3)}, ${maxOffsetMs.toFixed(3)}] ms`);
    console.log(`  Jitter: ${(maxOffsetMs - minOffsetMs).toFixed(3)} ms\n`);
    
    // Also pull and display a sample to show synchronized timestamps
    const [sample, remoteTimestamp] = inlet.pullSample(0.0);
    if (sample) {
      const localTimestamp = remoteTimestamp + offset;
      const currentTime = lsl.localClock();
      const latency = (currentTime - localTimestamp) * 1000;
      
      console.log('  Sample timestamp comparison:');
      console.log(`    Remote timestamp: ${remoteTimestamp.toFixed(6)}`);
      console.log(`    Local timestamp:  ${localTimestamp.toFixed(6)}`);
      console.log(`    Current time:     ${currentTime.toFixed(6)}`);
      console.log(`    Estimated latency: ${latency.toFixed(3)} ms\n`);
    }
  };
  
  // Take initial measurement (may take a few seconds)
  console.log('Waiting for initial time synchronization...');
  measureTimeCorrection();
  
  // Continue measuring at regular intervals
  const interval = setInterval(measureTimeCorrection, 1000); // Every second
  
  // Display summary statistics periodically
  const statsInterval = setInterval(() => {
    const avgOffset = sumOffset / measurementCount;
    const avgOffsetMs = avgOffset * 1000;
    const jitterMs = (maxOffset - minOffset) * 1000;
    
    console.log('='.repeat(60));
    console.log('Time Synchronization Statistics:');
    console.log(`  Measurements taken: ${measurementCount}`);
    console.log(`  Average offset: ${avgOffsetMs.toFixed(3)} ms`);
    console.log(`  Offset stability (jitter): ${jitterMs.toFixed(3)} ms`);
    
    if (Math.abs(avgOffsetMs) < 1) {
      console.log('  Status: Excellent (< 1ms offset)');
    } else if (Math.abs(avgOffsetMs) < 10) {
      console.log('  Status: Good (< 10ms offset)');
    } else if (Math.abs(avgOffsetMs) < 100) {
      console.log('  Status: Acceptable (< 100ms offset)');
    } else {
      console.log('  Status: Poor (> 100ms offset) - check network/clock sync');
    }
    console.log('='.repeat(60) + '\n');
  }, 10000); // Every 10 seconds
  
  // Handle cleanup on exit
  process.on('SIGINT', () => {
    const avgOffset = sumOffset / measurementCount;
    const avgOffsetMs = avgOffset * 1000;
    
    console.log('\n\nFinal Time Correction Statistics:');
    console.log(`  Total measurements: ${measurementCount}`);
    console.log(`  Average offset: ${avgOffsetMs.toFixed(3)} ms`);
    console.log(`  Minimum offset: ${(minOffset * 1000).toFixed(3)} ms`);
    console.log(`  Maximum offset: ${(maxOffset * 1000).toFixed(3)} ms`);
    console.log(`  Offset range: ${((maxOffset - minOffset) * 1000).toFixed(3)} ms`);
    
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