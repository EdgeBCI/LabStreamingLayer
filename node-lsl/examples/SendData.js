/**
 * Example program to demonstrate how to send a multi-channel time series to LSL.
 * 
 * Usage: node SendData.js [options]
 *   -s, --srate <rate>      Sampling rate (default: 100)
 *   -n, --name <name>       Stream name (default: "BioSemi")
 *   -t, --type <type>       Stream type (default: "EEG")
 *   -c, --channels <count>  Number of channels (default: 8)
 *   -h, --help              Show help
 */

const lsl = require('../dist/index.js');

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    srate: 100,
    name: 'BioSemi',
    type: 'EEG',
    channels: 8
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '-h':
      case '--help':
        console.log(`Usage: node SendData.js [options]
  -s, --srate <rate>      Sampling rate (default: 100)
  -n, --name <name>       Stream name (default: "BioSemi")
  -t, --type <type>       Stream type (default: "EEG")
  -c, --channels <count>  Number of channels (default: 8)
  -h, --help              Show help`);
        process.exit(0);
        break;
      case '-s':
      case '--srate':
        options.srate = parseFloat(args[++i]);
        break;
      case '-n':
      case '--name':
        options.name = args[++i];
        break;
      case '-t':
      case '--type':
        options.type = args[++i];
        break;
      case '-c':
      case '--channels':
        options.channels = parseInt(args[++i]);
        break;
    }
  }
  
  return options;
}

function main() {
  const options = parseArgs();
  
  console.log(`Creating LSL stream:
  Name: ${options.name}
  Type: ${options.type}
  Channels: ${options.channels}
  Sampling rate: ${options.srate} Hz`);

  // Create a new stream info
  // Here we set the name, content-type, channel count, sampling rate, 
  // data format, and source id
  const info = new lsl.StreamInfo(
    options.name,
    options.type,
    options.channels,
    options.srate,
    lsl.cfFloat32,
    'myuid34234'
  );

  // Create an outlet
  const outlet = new lsl.StreamOutlet(info);

  console.log('Now sending data...');
  console.log('Press Ctrl+C to stop');

  const startTime = lsl.localClock();
  let sentSamples = 0;

  // Send data continuously
  const sendData = () => {
    const elapsedTime = lsl.localClock() - startTime;
    const requiredSamples = Math.floor(options.srate * elapsedTime) - sentSamples;
    
    for (let i = 0; i < requiredSamples; i++) {
      // Generate random sample data
      const sample = [];
      for (let ch = 0; ch < options.channels; ch++) {
        sample.push(Math.random());
      }
      
      // Send the sample
      outlet.pushSample(sample);
    }
    
    sentSamples += requiredSamples;
  };

  // Send data at regular intervals
  setInterval(sendData, 10); // 10ms intervals

  // Handle cleanup on exit
  process.on('SIGINT', () => {
    console.log('\nCleaning up...');
    outlet.destroy();
    info.destroy();
    process.exit(0);
  });
}

// Run the example
main();