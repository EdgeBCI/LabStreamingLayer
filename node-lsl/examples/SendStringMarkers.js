/**
 * Example program to demonstrate how to send string-valued markers into LSL.
 * 
 * Markers are typically used to mark events in an experiment, such as
 * stimulus onset, button presses, or other significant events.
 * 
 * Usage: node SendStringMarkers.js
 */

const lsl = require('../dist/index.js');

function main() {
  console.log('Creating marker stream...');
  
  // Create a new stream info for markers
  // Important: Set the type to 'Markers' so other programs know how to interpret it
  // - Name: MyMarkerStream
  // - Type: Markers (this is important!)
  // - Channels: 1 (markers are typically single-channel)
  // - Sampling rate: 0 (irregular rate, markers are sent when events occur)
  // - Format: string (for text markers)
  // - Source ID: unique identifier for this stream
  const info = new lsl.StreamInfo(
    'MyMarkerStream',
    'Markers',
    1,
    0, // Irregular sampling rate
    lsl.cfString,
    'myuidw43536'
  );
  
  // Create an outlet
  const outlet = new lsl.StreamOutlet(info);
  
  console.log('Now sending markers...');
  console.log('Press Ctrl+C to stop\n');
  
  // List of possible marker names
  const markerNames = [
    'Test',
    'Stimulus_Onset',
    'Stimulus_Offset', 
    'Button_Press',
    'Trial_Start',
    'Trial_End',
    'Response',
    'Correct',
    'Incorrect',
    'Marker_1',
    'Marker_2',
    'Marker_3'
  ];
  
  let markerCount = 0;
  
  // Send markers at random intervals
  const sendMarker = () => {
    // Pick a random marker
    const marker = markerNames[Math.floor(Math.random() * markerNames.length)];
    
    // Send the marker
    outlet.pushSample([marker]);
    
    markerCount++;
    const timestamp = lsl.localClock();
    console.log(`[${timestamp.toFixed(6)}] Sent marker #${markerCount}: "${marker}"`);
    
    // Schedule next marker at random interval (0.5 to 3 seconds)
    const nextInterval = 500 + Math.random() * 2500;
    setTimeout(sendMarker, nextInterval);
  };
  
  // Start sending markers
  sendMarker();
  
  // Handle cleanup on exit
  process.on('SIGINT', () => {
    console.log(`\nSent ${markerCount} markers total`);
    console.log('Cleaning up...');
    outlet.destroy();
    info.destroy();
    process.exit(0);
  });
}

// Run the example
if (require.main === module) {
  main();
}