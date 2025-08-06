/**
 * Debug script to test LSL network discovery
 */

const lsl = require('../dist/index.js');

async function debugNetwork() {
  console.log('LSL Network Discovery Debug Tool');
  console.log('================================\n');
  
  // Display library info
  console.log('Library Information:');
  console.log(`  Protocol version: ${lsl.protocolVersion()}`);
  console.log(`  Library version: ${lsl.libraryVersion()}`);
  console.log(`  Library info: ${lsl.libraryInfo()}\n`);
  
  // Test 1: Try to resolve all streams with longer timeout
  console.log('Test 1: Resolving ALL streams (10 second timeout)...');
  let streams = lsl.resolveStreams(10.0);
  console.log(`  Found ${streams.length} stream(s)`);
  
  if (streams.length > 0) {
    console.log('  Stream details:');
    streams.forEach((stream, index) => {
      console.log(`    Stream ${index + 1}:`);
      console.log(`      Name: ${stream.getName()}`);
      console.log(`      Type: ${stream.getType()}`);
      console.log(`      UID: ${stream.getUid()}`);
      console.log(`      Hostname: ${stream.getHostname()}`);
      stream.destroy();
    });
  }
  console.log('');
  
  // Test 2: Try to resolve EEG streams specifically
  console.log('Test 2: Resolving EEG streams (10 second timeout)...');
  streams = lsl.resolveByProp('type', 'EEG', 1, 10.0);
  console.log(`  Found ${streams.length} EEG stream(s)`);
  
  if (streams.length > 0) {
    console.log('  EEG Stream details:');
    streams.forEach((stream, index) => {
      console.log(`    Stream ${index + 1}:`);
      console.log(`      Name: ${stream.getName()}`);
      console.log(`      Source ID: ${stream.getSourceId()}`);
      console.log(`      Channels: ${stream.getChannelCount()}`);
      console.log(`      Sample rate: ${stream.getNominalSrate()} Hz`);
      stream.destroy();
    });
  }
  console.log('');
  
  // Test 3: Create a local stream and see if we can discover it
  console.log('Test 3: Creating a local test stream...');
  const testInfo = new lsl.StreamInfo(
    'TestStream',
    'Test',
    1,
    100,
    lsl.cfFloat32,
    'test123'
  );
  const testOutlet = new lsl.StreamOutlet(testInfo);
  console.log('  Test stream created: TestStream (type: Test)');
  
  // Wait a bit for the stream to be registered
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  console.log('  Attempting to discover our own test stream...');
  streams = lsl.resolveByProp('name', 'TestStream', 1, 5.0);
  
  if (streams.length > 0) {
    console.log('  ✓ Successfully discovered our own test stream!');
    console.log('  Network discovery is working locally.');
    streams.forEach(s => s.destroy());
  } else {
    console.log('  ✗ Could not discover our own test stream.');
    console.log('  This suggests a network/firewall issue.');
  }
  
  // Clean up
  testOutlet.destroy();
  testInfo.destroy();
  console.log('');
  
  // Test 4: Check with continuous resolver
  console.log('Test 4: Using continuous resolver for 5 seconds...');
  const resolver = new lsl.ContinuousResolver();
  
  let checkCount = 0;
  const checkInterval = setInterval(() => {
    const results = resolver.results();
    checkCount++;
    console.log(`  Check ${checkCount}: Found ${results.length} stream(s)`);
    
    if (results.length > 0) {
      results.forEach((stream, index) => {
        console.log(`    - ${stream.getName()} (${stream.getType()})`);
        stream.destroy();
      });
    }
    
    if (checkCount >= 5) {
      clearInterval(checkInterval);
      resolver.destroy();
      console.log('\nDebug complete.');
      console.log('\nTroubleshooting tips:');
      console.log('1. Make sure Windows Firewall allows the Node.js process');
      console.log('2. Check if Windows Defender or antivirus is blocking LSL');
      console.log('3. Ensure both sender and receiver are on the same network');
      console.log('4. Try disabling Windows Firewall temporarily to test');
      console.log('5. Make sure multicast is enabled on your network adapter');
    }
  }, 1000);
}

// Run the debug tool
debugNetwork().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});