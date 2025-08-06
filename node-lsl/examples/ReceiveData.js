/**
 * Example program to show how to read a multi-channel time series from LSL.
 * 
 * This example will look for an EEG stream on the network and continuously
 * receive and display samples from it.
 * 
 * Usage: node ReceiveData.js [stream_type]
 *   stream_type: Type of stream to look for (default: "EEG")
 */

const lsl = require('../dist/index.js');

async function main() {
  // Get stream type from command line or use default
  const streamType = process.argv[2] || 'EEG';
  
  console.log(`Looking for a ${streamType} stream...`);
  
  // Resolve streams on the network
  // This will wait up to 5 seconds to find streams
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
  
  console.log('\nReceiving data... Press Ctrl+C to stop\n');
  
  // Continuously pull and display samples
  const pullSamples = () => {
    // Pull a sample with timeout of 0 (non-blocking)
    const [sample, timestamp] = inlet.pullSample(0.0);
    
    if (sample) {
      // Format the sample data for display
      const formattedSample = sample.map(v => v.toFixed(4)).join(', ');
      console.log(`[${timestamp.toFixed(6)}] ${formattedSample}`);
    }
  };
  
  // Pull samples at regular intervals
  const interval = setInterval(pullSamples, 10); // 10ms intervals
  
  // Handle cleanup on exit
  process.on('SIGINT', () => {
    console.log('\nCleaning up...');
    clearInterval(interval);
    inlet.destroy();
    streams.forEach(s => s.destroy());
    process.exit(0);
  });
}

// Run the example
main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});