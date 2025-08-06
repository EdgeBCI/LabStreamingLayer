/**
 * Example program to demonstrate how to send a multi-channel time-series
 * with proper meta-data to LSL using chunk-based transmission.
 * 
 * This advanced example shows:
 * - Complete channel metadata including 3D locations
 * - Chunk-based sending for efficiency
 * - Simulated hardware latency compensation
 * - Command-line argument parsing
 * 
 * Usage: node SendDataAdvanced.js [options]
 *   --name <name>     Stream name (default: "LSLExampleAmp")
 *   --type <type>     Stream type (default: "EEG")
 *   --srate <rate>    Sampling rate (default: 100)
 *   --help            Show help
 */

const lsl = require('../dist/index.js');

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    name: 'LSLExampleAmp',
    type: 'EEG',
    srate: 100
  };
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--help':
        console.log(`Usage: node SendDataAdvanced.js [options]
  --name <name>     Stream name (default: "LSLExampleAmp")
  --type <type>     Stream type (default: "EEG")  
  --srate <rate>    Sampling rate (default: 100)
  --help            Show help`);
        process.exit(0);
        break;
      case '--name':
        options.name = args[++i];
        break;
      case '--type':
        options.type = args[++i];
        break;
      case '--srate':
        options.srate = parseFloat(args[++i]);
        break;
    }
  }
  
  return options;
}

function main() {
  const options = parseArgs();
  
  // EEG channel configuration
  const channelNames = ['Fp1', 'Fp2', 'C3', 'C4', 'Cz', 'P3', 'P4', 'Pz', 'O1', 'O2'];
  
  // 3D channel locations (x, y, z coordinates)
  const channelLocations = [
    [-0.0307, 0.0949, -0.0047],   // Fp1
    [0.0307, 0.0949, -0.0047],     // Fp2
    [-0.0742, 0.0, 0.0668],        // C3
    [0.0743, 0.0, 0.0669],         // C4
    [0.0, 0.0, 0.1],               // Cz
    [-0.0567, -0.0677, 0.0469],    // P3
    [0.0566, -0.0677, 0.0469],     // P4
    [0.0, -0.0714, 0.0699],        // Pz
    [-0.0307, -0.0949, -0.0047],   // O1
    [0.0307, -0.0949, -0.0047]     // O2
  ];
  
  const nChannels = channelNames.length;
  
  console.log(`Creating advanced LSL stream:
  Name: ${options.name}
  Type: ${options.type}
  Channels: ${nChannels}
  Sampling rate: ${options.srate} Hz\n`);
  
  // Create stream info with detailed metadata
  const info = new lsl.StreamInfo(
    options.name,
    options.type,
    nChannels,
    options.srate,
    lsl.cfFloat32,
    'myuid2424'
  );
  
  // Add comprehensive metadata
  // Following XDF EEG metadata specification:
  // https://github.com/sccn/xdf/wiki/EEG-Meta-Data
  const desc = info.desc();
  desc.appendChildValue('manufacturer', 'LSLExampleAmp');
  
  // Add channel descriptions with locations
  const channels = desc.appendChild('channels');
  for (let i = 0; i < channelNames.length; i++) {
    const ch = channels.appendChild('channel');
    ch.appendChildValue('label', channelNames[i]);
    ch.appendChildValue('unit', 'microvolts');
    ch.appendChildValue('type', 'EEG');
    ch.appendChildValue('scaling_factor', '1');
    
    // Add 3D location
    const loc = ch.appendChild('location');
    loc.appendChildValue('X', channelLocations[i][0].toString());
    loc.appendChildValue('Y', channelLocations[i][1].toString());
    loc.appendChildValue('Z', channelLocations[i][2].toString());
  }
  
  // Add cap information
  const cap = desc.appendChild('cap');
  cap.appendChildValue('name', 'ComfyCap');
  cap.appendChildValue('size', '54');
  cap.appendChildValue('labelscheme', '10-20');
  
  // Create outlet with chunk size of 32 samples and max buffer of 360 seconds
  const outlet = new lsl.StreamOutlet(info, 32, 360);
  
  // Verify stream info (optional sanity check)
  const checkInfo = outlet.getInfo();
  console.log('Stream created successfully:');
  console.log(`  Verified name: ${checkInfo.getName()}`);
  console.log(`  Verified type: ${checkInfo.getType()}`);
  console.log(`  Verified channels: ${checkInfo.getChannelCount()}`);
  console.log(`  Verified rate: ${checkInfo.getNominalSrate()} Hz`);
  checkInfo.destroy();
  
  console.log('\nNow sending data in chunks...');
  console.log('Press Ctrl+C to stop\n');
  
  const startTime = lsl.localClock();
  let sentSamples = 0;
  let chunkCount = 0;
  
  // Send data in chunks for efficiency
  const sendChunk = () => {
    const elapsedTime = lsl.localClock() - startTime;
    const requiredSamples = Math.floor(options.srate * elapsedTime) - sentSamples;
    
    if (requiredSamples > 0) {
      // Create a chunk of samples
      const chunk = [];
      for (let s = 0; s < requiredSamples; s++) {
        const sample = [];
        for (let ch = 0; ch < nChannels; ch++) {
          // Generate realistic EEG-like data (random walk)
          const noise = (Math.random() - 0.5) * 10;
          const signal = Math.sin(2 * Math.PI * 10 * (sentSamples + s) / options.srate) * 5;
          sample.push(signal + noise);
        }
        chunk.push(sample);
      }
      
      // Simulate hardware latency (pretend samples are 125ms old)
      const timestamp = lsl.localClock() - 0.125;
      
      // Send the chunk
      outlet.pushChunk(chunk, timestamp);
      
      sentSamples += requiredSamples;
      chunkCount++;
      
      // Display progress
      if (chunkCount % 10 === 0) {
        const rate = sentSamples / elapsedTime;
        console.log(`Sent ${sentSamples} samples in ${chunkCount} chunks (effective rate: ${rate.toFixed(2)} Hz)`);
      }
    }
  };
  
  // Send chunks at regular intervals
  const interval = setInterval(sendChunk, 20); // 20ms intervals
  
  // Display statistics periodically
  const statsInterval = setInterval(() => {
    const elapsed = lsl.localClock() - startTime;
    const rate = sentSamples / elapsed;
    const efficiency = (rate / options.srate * 100).toFixed(1);
    
    console.log('\n' + '='.repeat(60));
    console.log(`Statistics after ${elapsed.toFixed(1)} seconds:`);
    console.log(`  Total samples sent: ${sentSamples}`);
    console.log(`  Total chunks sent: ${chunkCount}`);
    console.log(`  Average chunk size: ${(sentSamples / chunkCount).toFixed(1)} samples`);
    console.log(`  Effective sampling rate: ${rate.toFixed(2)} Hz`);
    console.log(`  Efficiency: ${efficiency}%`);
    console.log('='.repeat(60) + '\n');
  }, 10000); // Every 10 seconds
  
  // Handle cleanup on exit
  process.on('SIGINT', () => {
    const elapsed = lsl.localClock() - startTime;
    const rate = sentSamples / elapsed;
    
    console.log('\n\nFinal Statistics:');
    console.log(`  Total samples sent: ${sentSamples}`);
    console.log(`  Total chunks sent: ${chunkCount}`);
    console.log(`  Total time: ${elapsed.toFixed(2)} seconds`);
    console.log(`  Effective sampling rate: ${rate.toFixed(2)} Hz`);
    
    console.log('\nCleaning up...');
    clearInterval(interval);
    clearInterval(statsInterval);
    outlet.destroy();
    info.destroy();
    process.exit(0);
  });
}

// Run the example
if (require.main === module) {
  main();
}