/**
 * Example program that shows how to attach meta-data to a stream, 
 * and how to later retrieve the meta-data again at the receiver side.
 * 
 * This example demonstrates:
 * - Adding channel descriptions (labels, units, types)
 * - Adding manufacturer and equipment information
 * - Retrieving and parsing metadata on the receiver side
 * 
 * Usage: node HandleMetadata.js
 */

const lsl = require('../dist/index.js');

// Function to create a stream with rich metadata
function createStreamWithMetadata() {
  console.log('Creating stream with metadata...');
  
  // Create a new StreamInfo object
  const info = new lsl.StreamInfo(
    'MetaTester',
    'EEG', 
    8,  // 8 channels
    100,  // 100 Hz
    lsl.cfFloat32,
    'myuid56872'
  );
  
  // Add channel descriptions
  // Following XDF format: https://github.com/sccn/xdf/wiki/Meta-Data
  const desc = info.desc();
  const channels = desc.appendChild('channels');
  
  const channelLabels = ['C3', 'C4', 'Cz', 'FPz', 'POz', 'CPz', 'O1', 'O2'];
  
  for (const label of channelLabels) {
    const channel = channels.appendChild('channel');
    channel.appendChildValue('label', label);
    channel.appendChildValue('unit', 'microvolts');
    channel.appendChildValue('type', 'EEG');
  }
  
  // Add manufacturer information
  desc.appendChildValue('manufacturer', 'SCCN');
  
  // Add cap/equipment information
  const cap = desc.appendChild('cap');
  cap.appendChildValue('name', 'EasyCap');
  cap.appendChildValue('size', '54');
  cap.appendChildValue('labelscheme', '10-20');
  
  // Create outlet for the stream
  const outlet = new lsl.StreamOutlet(info);
  
  // Send a sample to make the stream active
  const dummySample = [];
  for (let i = 0; i < channelLabels.length; i++) {
    dummySample.push(i);
  }
  outlet.pushSample(dummySample);
  
  console.log('Stream created with metadata');
  
  return { info, outlet };
}

// Function to receive and display metadata
async function receiveAndDisplayMetadata() {
  console.log('\nLooking for MetaTester stream...');
  
  // Resolve the stream by name
  const results = lsl.resolveByProp('name', 'MetaTester', 1, 5.0);
  
  if (results.length === 0) {
    throw new Error('Could not find MetaTester stream');
  }
  
  // Create an inlet to read from the stream
  const inlet = new lsl.StreamInlet(results[0]);
  
  // Get the full stream info (including custom metadata)
  const info = inlet.info();
  
  console.log('\n' + '='.repeat(60));
  console.log('Stream Metadata:');
  console.log('='.repeat(60));
  
  // Display basic stream information
  console.log('\nBasic Information:');
  console.log(`  Name: ${info.getName()}`);
  console.log(`  Type: ${info.getType()}`);
  console.log(`  Channel Count: ${info.getChannelCount()}`);
  console.log(`  Sampling Rate: ${info.getNominalSrate()} Hz`);
  console.log(`  Source ID: ${info.getSourceId()}`);
  
  // Display manufacturer
  const manufacturer = info.desc().childValue('manufacturer');
  console.log(`\nManufacturer: ${manufacturer}`);
  
  // Display cap information
  const capInfo = info.desc().child('cap');
  if (capInfo) {
    console.log('\nCap Information:');
    console.log(`  Name: ${capInfo.childValue('name')}`);
    console.log(`  Size: ${capInfo.childValue('size')}`);
    console.log(`  Label Scheme: ${capInfo.childValue('labelscheme')}`);
  }
  
  // Display channel information
  console.log('\nChannel Labels:');
  const channelsNode = info.desc().child('channels');
  if (channelsNode) {
    let channel = channelsNode.child('channel');
    let channelIndex = 1;
    
    while (channel && !channel.empty()) {
      const label = channel.childValue('label');
      const unit = channel.childValue('unit');
      const type = channel.childValue('type');
      console.log(`  Channel ${channelIndex}: ${label} (${unit}, ${type})`);
      
      channel = channel.nextSibling();
      channelIndex++;
    }
  }
  
  // Display the full XML
  console.log('\n' + '='.repeat(60));
  console.log('Full XML Description:');
  console.log('='.repeat(60));
  console.log(info.asXml());
  
  // Clean up
  inlet.destroy();
  results.forEach(s => s.destroy());
}

async function main() {
  console.log('LSL Metadata Handling Example');
  console.log('=' * 40);
  
  // Create stream with metadata
  const { info, outlet } = createStreamWithMetadata();
  
  // Small delay to ensure stream is discoverable
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Receive and display the metadata
  try {
    await receiveAndDisplayMetadata();
  } catch (err) {
    console.error('Error receiving metadata:', err.message);
  }
  
  // Keep sending data for a few seconds to demonstrate the stream is active
  console.log('\nSending sample data for 3 seconds...');
  const startTime = lsl.localClock();
  let sampleCount = 0;
  
  const sendInterval = setInterval(() => {
    const sample = [];
    for (let i = 0; i < 8; i++) {
      sample.push(Math.random() * 100);
    }
    outlet.pushSample(sample);
    sampleCount++;
    
    if (lsl.localClock() - startTime > 3) {
      clearInterval(sendInterval);
      console.log(`\nSent ${sampleCount} samples`);
      console.log('Cleaning up...');
      outlet.destroy();
      info.destroy();
      process.exit(0);
    }
  }, 10);
}

// Run the example
if (require.main === module) {
  main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
}