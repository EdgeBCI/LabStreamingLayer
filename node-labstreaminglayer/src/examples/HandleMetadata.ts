/**
 * Example: Handle stream metadata
 * 
 * This example shows how to work with stream metadata using the XMLElement API.
 * It creates a stream with channel labels and units, then reads them back.
 */

import { StreamInfo, StreamOutlet, cf_float32 } from '../index.js';

function main() {
  console.log('Creating stream with metadata...\n');
  
  // Create a stream info with channel metadata
  const info = new StreamInfo(
    'MetadataTest',
    'EEG',
    4,
    250,
    cf_float32,
    'myuid78563'
  );
  
  // Set channel labels
  const labels = ['Fz', 'Cz', 'Pz', 'Oz'];
  info.setChannelLabels(labels);
  console.log('Set channel labels:', labels);
  
  // Set channel types (all EEG)
  info.setChannelTypes('eeg');
  console.log('Set channel type: eeg (for all channels)');
  
  // Set channel units (microvolts, represented as 1e-6)
  info.setChannelUnits('microvolts');
  console.log('Set channel units: microvolts\n');
  
  // Add custom metadata using XML element API
  const desc = info.desc();
  
  // Add acquisition information
  const acq = desc.appendChild('acquisition');
  acq.appendChildValue('manufacturer', 'BioSemi');
  acq.appendChildValue('model', 'ActiveTwo');
  acq.appendChildValue('precision', '24');
  acq.appendChildValue('compensated_lag', '0');
  
  console.log('Added acquisition metadata:');
  console.log('  Manufacturer: BioSemi');
  console.log('  Model: ActiveTwo');
  console.log('  Precision: 24 bits');
  console.log('  Compensated lag: 0\n');
  
  // Create outlet (this makes the stream discoverable)
  const outlet = new StreamOutlet(info);
  
  // Now read back the metadata
  console.log('Reading metadata back from stream info:\n');
  
  // Get channel information
  const readLabels = info.getChannelLabels();
  console.log('Channel labels:', readLabels);
  
  const readTypes = info.getChannelTypes();
  console.log('Channel types:', readTypes);
  
  const readUnits = info.getChannelUnits();
  console.log('Channel units:', readUnits);
  
  // Read custom metadata
  console.log('\nAcquisition metadata:');
  const acqNode = info.desc().child('acquisition');
  if (!acqNode.empty()) {
    console.log('  Manufacturer:', acqNode.childValue('manufacturer'));
    console.log('  Model:', acqNode.childValue('model'));
    console.log('  Precision:', acqNode.childValue('precision'));
    console.log('  Compensated lag:', acqNode.childValue('compensated_lag'));
  }
  
  // Print full XML representation
  console.log('\nFull XML representation:');
  console.log('------------------------');
  const xml = info.asXml();
  // Pretty print XML (basic indentation)
  const lines = xml.split('>');
  let indent = 0;
  for (const line of lines) {
    if (line.includes('</')) indent--;
    if (line.trim()) {
      console.log('  '.repeat(Math.max(0, indent)) + line.trim() + '>');
    }
    if (line.includes('<') && !line.includes('</') && !line.includes('/>')) indent++;
  }
  
  console.log('\nStream is now discoverable on the network.');
  console.log('Press Ctrl+C to stop.');
  
  // Keep the outlet alive
  process.on('SIGINT', () => {
    console.log('\nShutting down...');
    outlet.destroy();
    process.exit(0);
  });
}

// Run the example
main();