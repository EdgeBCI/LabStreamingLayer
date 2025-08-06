/**
 * Basic test for node-lsl functionality
 * This test creates an outlet, pushes some data, and verifies the library is working.
 */

const lsl = require('./dist/index.js');

async function test() {
  console.log('Testing node-lsl basic functionality...\n');

  try {
    // Test 1: Library info
    console.log('1. Testing library info functions:');
    console.log(`   Protocol version: ${lsl.protocolVersion()}`);
    console.log(`   Library version: ${lsl.libraryVersion()}`);
    console.log(`   Library info: ${lsl.libraryInfo()}`);
    console.log(`   Local clock: ${lsl.localClock()}`);
    console.log('   ✓ Library functions working\n');

    // Test 2: Create StreamInfo
    console.log('2. Testing StreamInfo creation:');
    const info = new lsl.StreamInfo(
      'TestStream',
      'EEG',
      8,  // 8 channels
      250,  // 250 Hz sampling rate
      lsl.cfFloat32,
      'test1234'
    );
    console.log(`   Stream name: ${info.getName()}`);
    console.log(`   Stream type: ${info.getType()}`);
    console.log(`   Channel count: ${info.getChannelCount()}`);
    console.log(`   Sampling rate: ${info.getNominalSrate()}`);
    console.log(`   Channel format: ${info.getChannelFormat()}`);
    console.log(`   Source ID: ${info.getSourceId()}`);
    console.log('   ✓ StreamInfo created successfully\n');

    // Test 3: Create StreamOutlet
    console.log('3. Testing StreamOutlet creation:');
    const outlet = new lsl.StreamOutlet(info);
    console.log('   ✓ StreamOutlet created successfully');
    console.log(`   Has consumers: ${outlet.haveConsumers()}`);
    
    // Test 4: Push sample data
    console.log('\n4. Testing data push:');
    const sample = [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0];
    outlet.pushSample(sample);
    console.log(`   Pushed sample: [${sample.join(', ')}]`);
    console.log('   ✓ Sample pushed successfully');

    // Test 5: Push chunk data
    console.log('\n5. Testing chunk push:');
    const chunk = [
      [1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8],
      [2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8],
      [3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8],
    ];
    outlet.pushChunk(chunk);
    console.log(`   Pushed ${chunk.length} samples as chunk`);
    console.log('   ✓ Chunk pushed successfully');

    // Test 6: Test resolver
    console.log('\n6. Testing stream resolver:');
    const streams = lsl.resolveStreams(0.5);
    console.log(`   Found ${streams.length} stream(s) on the network`);
    for (const stream of streams) {
      console.log(`   - ${stream.getName()} (${stream.getType()})`);
    }
    console.log('   ✓ Resolver working\n');

    // Clean up
    outlet.destroy();
    info.destroy();

    console.log('✅ All tests passed successfully!');

  } catch (error) {
    console.error('❌ Test failed with error:');
    console.error(error);
    process.exit(1);
  }
}

// Run the test
test().catch(console.error);