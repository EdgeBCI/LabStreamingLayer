/**
 * Test for outlet.ts pushChunk() with different input formats
 * This test verifies that both 2D array and flattened array formats work correctly.
 */

const lsl = require('./dist/index.js');

async function test() {
  console.log('Testing pushChunk() with different input formats...\n');

  try {
    // Create a test stream
    const info = new lsl.StreamInfo(
      'TestStream',
      'Test',
      3,  // 3 channels
      100,  // 100 Hz sampling rate
      lsl.cfFloat32,
      'test1234'
    );

    const outlet = new lsl.StreamOutlet(info);

    // Test 1: 2D array format (traditional)
    console.log('1. Testing 2D array format:');
    const samples2D = [
      [1.0, 2.0, 3.0],  // Sample 1
      [4.0, 5.0, 6.0],  // Sample 2
      [7.0, 8.0, 9.0],  // Sample 3
    ];
    outlet.pushChunk(samples2D);
    console.log('   ✓ Pushed 3 samples in 2D array format\n');

    // Test 2: Flattened/multiplexed array format
    console.log('2. Testing flattened array format:');
    const samplesFlat = [
      1.0, 2.0, 3.0,  // Sample 1: ch1=1.0, ch2=2.0, ch3=3.0
      4.0, 5.0, 6.0,  // Sample 2: ch1=4.0, ch2=5.0, ch3=6.0
      7.0, 8.0, 9.0,  // Sample 3: ch1=7.0, ch2=8.0, ch3=9.0
    ];
    outlet.pushChunk(samplesFlat);
    console.log('   ✓ Pushed 3 samples in flattened array format\n');

    // Test 3: With timestamps array
    console.log('3. Testing with multiple timestamps:');
    const timestamps = [0.1, 0.2, 0.3];
    outlet.pushChunk(samples2D, timestamps);
    console.log('   ✓ Pushed 3 samples with individual timestamps\n');

    // Test 4: Error handling - incorrect flattened array length
    console.log('4. Testing error handling for invalid flattened array:');
    try {
      const invalidFlat = [1.0, 2.0, 3.0, 4.0];  // 4 values, not divisible by 3 channels
      outlet.pushChunk(invalidFlat);
      console.log('   ❌ Should have thrown an error!');
    } catch (e) {
      console.log('   ✓ Correctly threw error:', e.message);
    }

    // Clean up
    outlet.destroy();
    info.destroy();

    console.log('\n✅ All tests passed successfully!');

  } catch (error) {
    console.error('❌ Test failed with error:');
    console.error(error);
    process.exit(1);
  }
}

// Run the test
test().catch(console.error);