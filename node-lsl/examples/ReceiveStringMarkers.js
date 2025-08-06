/**
 * Example program to demonstrate how to read string-valued markers from LSL.
 * 
 * This example will look for a Markers stream and display any markers it receives.
 * Markers are typically used to mark events in experiments.
 * 
 * Usage: node ReceiveStringMarkers.js
 */

const lsl = require('../dist/index.js');

async function main() {
  console.log('Looking for a marker stream...');
  
  // Resolve marker streams on the network
  const streams = lsl.resolveByProp('type', 'Markers', 1, 5.0);
  
  if (streams.length === 0) {
    console.error('No marker stream found!');
    console.log('Make sure a marker stream is running (e.g., run SendStringMarkers.js)');
    process.exit(1);
  }
  
  console.log(`Found ${streams.length} marker stream(s)`);
  const streamInfo = streams[0];
  
  // Display stream information
  console.log(`\nConnecting to marker stream:
  Name: ${streamInfo.getName()}
  Type: ${streamInfo.getType()}
  Source ID: ${streamInfo.getSourceId()}`);
  
  // Create an inlet to read from the stream
  const inlet = new lsl.StreamInlet(streamInfo);
  
  console.log('\nWaiting for markers... Press Ctrl+C to stop\n');
  
  let markerCount = 0;
  const startTime = lsl.localClock();
  
  // Continuously check for markers
  const checkForMarkers = () => {
    // Try to pull a sample with 0 timeout (non-blocking)
    const [sample, timestamp] = inlet.pullSample(0.0);
    
    if (sample) {
      markerCount++;
      const relativeTime = timestamp - startTime;
      
      // Display the marker with timestamp
      console.log(`[${timestamp.toFixed(6)}] Marker #${markerCount}: "${sample[0]}" (t+${relativeTime.toFixed(3)}s)`);
    }
  };
  
  // Check for markers frequently
  const interval = setInterval(checkForMarkers, 1); // Check every 1ms
  
  // Also display statistics periodically
  const statsInterval = setInterval(() => {
    const elapsed = lsl.localClock() - startTime;
    const rate = markerCount / elapsed;
    console.log(`\n--- Stats: ${markerCount} markers received in ${elapsed.toFixed(1)}s (${rate.toFixed(2)} markers/sec) ---\n`);
  }, 10000); // Every 10 seconds
  
  // Handle cleanup on exit
  process.on('SIGINT', () => {
    const elapsed = lsl.localClock() - startTime;
    console.log(`\n\nReceived ${markerCount} markers in ${elapsed.toFixed(1)} seconds`);
    console.log('Cleaning up...');
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