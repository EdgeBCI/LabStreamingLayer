/**
 * Example: Receive string markers from LSL
 * 
 * This example shows how to receive string marker events from a marker stream.
 */

import { resolveByProp, StreamInlet } from '../index.js';

async function main() {
  console.log('Looking for a marker stream...');
  
  // Resolve marker streams on the network
  const streams = resolveByProp('type', 'Markers', 1, 10.0);
  
  if (streams.length === 0) {
    console.log('No marker stream found. Please start SendStringMarkers.js first.');
    process.exit(1);
  }
  
  // Get the first stream
  const streamInfo = streams[0];
  console.log(`Found marker stream: ${streamInfo.name()}`);
  console.log(`  Source ID: ${streamInfo.sourceId()}`);
  
  // Create an inlet to receive markers
  const inlet = new StreamInlet(streamInfo);
  
  console.log('\nWaiting for markers... Press Ctrl+C to stop\n');
  
  let markerCount = 0;
  
  // Main receiving loop
  const receiveMarkers = () => {
    // Try to pull a sample with 0 timeout (non-blocking)
    const [marker, timestamp] = inlet.pullSample(0.0);
    
    if (marker !== null) {
      markerCount++;
      console.log(`Marker ${markerCount}: "${marker[0]}" at ${timestamp.toFixed(3)}s`);
    }
    
    // Schedule next receive
    setTimeout(receiveMarkers, 10); // Check every 10ms
  };
  
  // Start receiving
  receiveMarkers();
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log(`\nShutting down... Received ${markerCount} markers total.`);
    inlet.destroy();
    process.exit(0);
  });
}

// Run the example
main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});