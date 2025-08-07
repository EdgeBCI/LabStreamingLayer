/**
 * Example: Send string markers through LSL
 * 
 * This example shows how to create a marker stream and send string events.
 * Marker streams are irregular (no fixed sampling rate) and carry string data.
 */

import { StreamInfo, StreamOutlet, IRREGULAR_RATE, localClock } from '../index.js';

function main() {
  console.log('Creating marker stream...');
  
  // Create a marker stream info (irregular rate, 1 channel, string type)
  const info = new StreamInfo(
    'MyMarkerStream',
    'Markers',
    1,
    IRREGULAR_RATE,
    'string',
    'myuidw43536'
  );
  
  // Create outlet
  const outlet = new StreamOutlet(info);
  
  console.log('Now sending markers...');
  console.log('Press Ctrl+C to stop\n');
  
  // List of possible markers
  const markerTypes = [
    'Test',
    'Blah',
    'Marker',
    'XXX',
    'Testtest',
    'Test-1-2-3'
  ];
  
  let markerCount = 0;
  
  // Send markers at random intervals
  const sendMarker = () => {
    // Pick a random marker
    const markerIndex = Math.floor(Math.random() * markerTypes.length);
    const marker = markerTypes[markerIndex];
    
    // Send it with current timestamp
    const timestamp = localClock();
    outlet.pushSample([marker], timestamp);
    
    markerCount++;
    console.log(`Sent marker #${markerCount}: "${marker}" at ${timestamp.toFixed(3)}s`);
    
    // Schedule next marker at random interval (0.5 to 2.5 seconds)
    const nextInterval = 500 + Math.random() * 2000;
    setTimeout(sendMarker, nextInterval);
  };
  
  // Start sending markers
  sendMarker();
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log(`\nShutting down... Sent ${markerCount} markers total.`);
    outlet.destroy();
    process.exit(0);
  });
}

// Run the example
main();