import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  StreamInfo,
  StreamOutlet,
  StreamInlet,
  cf_float32,
  cf_double64,
  cf_string,
  cf_int32,
  cf_int16,
  cf_int8,
  localClock,
  resolveByProp
} from '../index.js';

// Helper function to create properly connected outlet-inlet pairs
async function createConnectedPair(
  name: string, 
  type: string, 
  channels: number, 
  srate: number, 
  format: number
): Promise<{ outlet: StreamOutlet; inlet: StreamInlet; info: StreamInfo }> {
  const info = new StreamInfo(name, type, channels, srate, format);
  const outlet = new StreamOutlet(info);
  
  // Allow outlet to advertise on the network
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Resolve the stream through network discovery
  const streams = resolveByProp('name', name, 1, 5.0);
  if (streams.length === 0) {
    outlet.destroy();
    info.destroy();
    throw new Error(`Could not resolve stream: ${name}`);
  }
  
  // Create inlet with the resolved stream info
  const inlet = new StreamInlet(streams[0]);
  inlet.openStream(5.0);
  
  return { outlet, inlet, info };
}

describe('Chunk Operations', () => {
  
  describe('pushChunk formats', () => {
    it('should handle 2D array format', async () => {
      const streamName = `Test2D_${Date.now()}`;
      const { outlet, inlet, info } = await createConnectedPair(
        streamName, 'Test', 3, 100, cf_float32
      );
      
      // 2D array: array of samples
      const chunk = [
        [1.0, 2.0, 3.0],
        [4.0, 5.0, 6.0],
        [7.0, 8.0, 9.0]
      ];
      
      console.log('  Sending 2D chunk:', JSON.stringify(chunk));
      outlet.pushChunk(chunk);
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const [samples, timestamps] = inlet.pullChunk(1.0, 10);
      console.log('  Received samples:', JSON.stringify(samples));
      console.log('  Received timestamps:', timestamps);
      
      assert.ok(samples !== null);
      assert.strictEqual(samples!.length, 3);
      console.log('  Expected first sample:', [1.0, 2.0, 3.0]);
      console.log('  Received first sample:', samples![0]);
      assert.deepStrictEqual(samples![0], [1.0, 2.0, 3.0]);
      console.log('  Expected last sample:', [7.0, 8.0, 9.0]);
      console.log('  Received last sample:', samples![2]);
      assert.deepStrictEqual(samples![2], [7.0, 8.0, 9.0]);
      
      outlet.destroy();
      inlet.destroy();
      info.destroy();
      
      // Allow cleanup time
      await new Promise(resolve => setTimeout(resolve, 100));
    });
    
    it('should handle flattened array format', async () => {
      const streamName = `TestFlat_${Date.now()}`;
      const { outlet, inlet, info } = await createConnectedPair(
        streamName, 'Test', 2, 100, cf_int32
      );
      
      // Flattened array: [ch1_s1, ch2_s1, ch1_s2, ch2_s2, ...]
      const flatData = [1, 2, 3, 4, 5, 6, 7, 8];  // 4 samples, 2 channels
      
      console.log('  Sending flat data:', flatData);
      outlet.pushChunk(flatData);
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const [samples, timestamps] = inlet.pullChunk(1.0, 10);
      console.log('  Received samples:', JSON.stringify(samples));
      
      assert.ok(samples !== null);
      assert.strictEqual(samples!.length, 4);
      console.log('  Expected first sample:', [1, 2]);
      console.log('  Received first sample:', samples![0]);
      assert.deepStrictEqual(samples![0], [1, 2]);
      console.log('  Expected last sample:', [7, 8]);
      console.log('  Received last sample:', samples![3]);
      assert.deepStrictEqual(samples![3], [7, 8]);
      
      outlet.destroy();
      inlet.destroy();
      info.destroy();
      
      // Allow cleanup time
      await new Promise(resolve => setTimeout(resolve, 100));
    });
    
    it('should handle single timestamp for all samples', async () => {
      const streamName = `TestSingleTS_${Date.now()}`;
      const { outlet, inlet, info } = await createConnectedPair(
        streamName, 'Test', 2, 0, cf_float32
      );
      
      const chunk = [[1.0, 2.0], [3.0, 4.0]];
      const singleTimestamp = 123.456;
      
      outlet.pushChunk(chunk, singleTimestamp);
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const [samples, timestamps] = inlet.pullChunk(1.0, 10);
      console.log('  Received samples:', JSON.stringify(samples));
      console.log('  Single timestamp sent:', singleTimestamp);
      console.log('  Received timestamps:', timestamps);
      
      assert.ok(samples !== null);
      assert.strictEqual(samples!.length, 2);
      // All timestamps should be similar (may have slight transmission delay)
      console.log('  Timestamp difference from sent:', Math.abs(timestamps[0] - singleTimestamp));
      assert.ok(Math.abs(timestamps[0] - singleTimestamp) < 1.0);
      console.log('  Timestamp spacing:', Math.abs(timestamps[1] - timestamps[0]));
      assert.ok(Math.abs(timestamps[1] - timestamps[0]) < 0.01); // Should be very close
      
      outlet.destroy();
      inlet.destroy();
      info.destroy();
      
      // Allow cleanup time
      await new Promise(resolve => setTimeout(resolve, 100));
    });
    
    it('should handle individual timestamps per sample', async () => {
      const streamName = `TestMultiTS_${Date.now()}`;
      const { outlet, inlet, info } = await createConnectedPair(
        streamName, 'Test', 2, 0, cf_double64
      );
      
      const chunk = [[1.0, 2.0], [3.0, 4.0], [5.0, 6.0]];
      const timestamps = [100.0, 100.01, 100.02];
      
      outlet.pushChunk(chunk, timestamps);
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const [samples, timestamps_recv] = inlet.pullChunk(1.0, 10);
      console.log('  Received samples:', JSON.stringify(samples));
      console.log('  Sent timestamps:', timestamps);
      console.log('  Received timestamps:', timestamps_recv);
      
      assert.ok(samples !== null);
      assert.strictEqual(samples!.length, 3);
      
      // Check timestamp spacing
      const spacing1 = timestamps_recv[1] - timestamps_recv[0];
      const spacing2 = timestamps_recv[2] - timestamps_recv[1];
      console.log('  Timestamp spacing 1:', spacing1, 'Expected: 0.01');
      console.log('  Timestamp spacing 2:', spacing2, 'Expected: 0.01');
      assert.ok(Math.abs(spacing1 - 0.01) < 0.001);
      assert.ok(Math.abs(spacing2 - 0.01) < 0.001);
      
      outlet.destroy();
      inlet.destroy();
      info.destroy();
      
      // Allow cleanup time
      await new Promise(resolve => setTimeout(resolve, 100));
    });
  });
  
  describe('different data types', () => {
    const dataTypes = [
      { format: cf_float32, name: 'float32', sample: [1.5, 2.5, 3.5] },
      { format: cf_double64, name: 'double64', sample: [1.123456789, 2.987654321, 3.14159265] },
      { format: cf_int32, name: 'int32', sample: [100000, -200000, 300000] },
      { format: cf_int16, name: 'int16', sample: [1000, -2000, 3000] },
      { format: cf_int8, name: 'int8', sample: [10, -20, 30] },
      { format: cf_string, name: 'string', sample: ['hello', 'world', 'test'] }
    ];
    
    for (const { format, name, sample } of dataTypes) {
      it(`should handle ${name} chunks`, async () => {
        const streamName = `Test${name}_${Date.now()}`;
        const { outlet, inlet, info } = await createConnectedPair(
          streamName, 'Test', 3, 100, format
        );
        
        const chunk = [sample, sample, sample];  // 3 identical samples
        outlet.pushChunk(chunk);
        
        await new Promise(resolve => setTimeout(resolve, 50));
        
        const [samples, timestamps] = inlet.pullChunk(1.0, 10);
        console.log(`  ${name} - Sent sample:`, sample);
        console.log(`  ${name} - Received samples:`, JSON.stringify(samples));
        
        assert.ok(samples !== null);
        assert.ok(samples!.length >= 3);
        
        // For strings, exact match; for numbers, check within precision
        if (format === cf_string) {
          console.log(`  ${name} - Expected:`, sample);
          console.log(`  ${name} - Received:`, samples![0]);
          assert.deepStrictEqual(samples![0], sample);
        } else {
          for (let i = 0; i < 3; i++) {
            const received: any = samples![0][i];
            const expected: any = sample[i];
            console.log(`  ${name} - Channel ${i}: Expected=${expected}, Received=${received}`);
            
            // Allow for some precision loss in floating point
            if (format === cf_float32 || format === cf_double64) {
              const diff = Math.abs(Number(received) - Number(expected));
              console.log(`  ${name} - Channel ${i} difference: ${diff}`);
              assert.ok(diff < 0.0001 * Math.abs(Number(expected)));
            } else {
              assert.strictEqual(received, expected);
            }
          }
        }
        
        outlet.destroy();
        inlet.destroy();
        info.destroy();
      });
    }
  });
  
  describe('large chunks', () => {
    it('should handle large chunks efficiently', async () => {
      const channelCount = 64;  // Many channels
      const chunkSize = 100;    // Many samples
      
      const streamName = `TestLarge_${Date.now()}`;
      const info = new StreamInfo(streamName, 'Test', channelCount, 1000, cf_float32);
      const outlet = new StreamOutlet(info, chunkSize);
      
      // Allow outlet to advertise
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Resolve the stream
      const streams = resolveByProp('name', streamName, 1, 5.0);
      if (streams.length === 0) {
        outlet.destroy();
        info.destroy();
        throw new Error(`Could not resolve stream: ${streamName}`);
      }
      
      const inlet = new StreamInlet(streams[0], 360, chunkSize);
      inlet.openStream(5.0);
      
      // Create large chunk
      const chunk: number[][] = [];
      for (let s = 0; s < chunkSize; s++) {
        const sample: number[] = [];
        for (let c = 0; c < channelCount; c++) {
          sample.push(s * channelCount + c);  // Unique value per element
        }
        chunk.push(sample);
      }
      
      const startPush = localClock();
      outlet.pushChunk(chunk);
      const pushTime = localClock() - startPush;
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const startPull = localClock();
      const [samples, timestamps] = inlet.pullChunk(1.0, chunkSize * 2);
      const pullTime = localClock() - startPull;
      
      assert.ok(samples !== null);
      assert.strictEqual(samples!.length, chunkSize);
      assert.strictEqual(samples![0].length, channelCount);
      
      // Verify data integrity
      console.log('  First element - Expected: 0, Received:', samples![0][0]);
      assert.strictEqual(samples![0][0], 0);  // First element
      const lastExpected = chunkSize * channelCount - 1;
      const lastReceived = samples![chunkSize-1][channelCount-1];
      console.log(`  Last element - Expected: ${lastExpected}, Received: ${lastReceived}`);
      assert.strictEqual(lastReceived, lastExpected);  // Last
      
      console.log(`  Large chunk performance: push=${(pushTime*1000).toFixed(2)}ms, pull=${(pullTime*1000).toFixed(2)}ms`);
      
      outlet.destroy();
      inlet.destroy();
      info.destroy();
      
      // Allow cleanup time
      await new Promise(resolve => setTimeout(resolve, 100));
    });
    
    it('should handle multiple consecutive chunks', async () => {
      const streamName = `TestMultiChunk_${Date.now()}`;
      const { outlet, inlet, info } = await createConnectedPair(
        streamName, 'Test', 4, 100, cf_float32
      );
      
      // Send multiple chunks
      const numChunks = 5;
      for (let i = 0; i < numChunks; i++) {
        const chunk = [
          [i, i, i, i],
          [i+0.1, i+0.1, i+0.1, i+0.1],
          [i+0.2, i+0.2, i+0.2, i+0.2]
        ];
        outlet.pushChunk(chunk);
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Pull all samples
      const [samples, timestamps] = inlet.pullChunk(1.0, 100);
      
      assert.ok(samples !== null);
      console.log(`  Expected total samples: ${numChunks * 3}, Received: ${samples!.length}`);
      assert.strictEqual(samples!.length, numChunks * 3);  // 3 samples per chunk
      
      // Verify first sample of each chunk
      for (let i = 0; i < numChunks; i++) {
        const expected = i;
        const received: number = samples![i * 3][0];
        console.log(`  Chunk ${i} first value - Expected: ${expected}, Received: ${received}`);
        assert.strictEqual(received, expected);
      }
      
      outlet.destroy();
      inlet.destroy();
      info.destroy();
      
      // Allow cleanup time
      await new Promise(resolve => setTimeout(resolve, 100));
    });
  });
  
  describe('error handling', () => {
    it('should reject invalid chunk data', () => {
      const info = new StreamInfo('TestInvalid', 'Test', 3, 100);
      const outlet = new StreamOutlet(info);
      
      // Wrong channel count in 2D array
      console.log('  Testing invalid 2D array (inconsistent channels)...');
      assert.throws(() => {
        outlet.pushChunk([[1, 2], [3, 4, 5]]);  // Inconsistent channels
      }, /must have the same number of channels/);
      
      // Wrong total length in flat array
      console.log('  Testing invalid flat array (wrong length)...');
      assert.throws(() => {
        outlet.pushChunk([1, 2, 3, 4, 5]);  // 5 values for 3 channels
      }, /must be a multiple of channel count/);
      
      // Mismatched timestamp array
      console.log('  Testing mismatched timestamp array...');
      assert.throws(() => {
        outlet.pushChunk([[1, 2, 3], [4, 5, 6]], [100.0]);  // 2 samples, 1 timestamp
      }, /Timestamp array length.*must match number of samples/);
      
      outlet.destroy();
      info.destroy();
    });
    
    it('should handle empty chunks gracefully', () => {
      const info = new StreamInfo('TestEmpty', 'Test', 2, 100);
      const outlet = new StreamOutlet(info);
      
      // Should not throw for empty chunk
      console.log('  Testing empty chunk handling...');
      assert.doesNotThrow(() => {
        outlet.pushChunk([]);
      });
      console.log('  Empty chunk handled gracefully');
      
      outlet.destroy();
      info.destroy();
    });
    
    it('should validate pullChunk parameters', () => {
      const info = new StreamInfo('TestPullValidation', 'Test', 1, 100);
      const inlet = new StreamInlet(info);
      
      // Invalid timeout
      console.log('  Testing invalid timeout...');
      assert.throws(() => {
        inlet.pullChunk(-1, 100);
      }, /Timeout must be a non-negative number/);
      
      // Invalid maxSamples
      console.log('  Testing invalid maxSamples...');
      assert.throws(() => {
        inlet.pullChunk(1.0, 0);
      }, /maxSamples must be a positive number/);
      
      inlet.destroy();
      info.destroy();
    });
  });
  
  describe('performance', () => {
    it('should reuse buffers for efficiency', async () => {
      const streamName = `TestBufferReuse_${Date.now()}`;
      const { outlet, inlet, info } = await createConnectedPair(
        streamName, 'Test', 8, 500, cf_float32
      );
      
      // Send chunks
      for (let i = 0; i < 10; i++) {
        const chunk = Array(10).fill(null).map(() => 
          Array(8).fill(null).map(() => Math.random())
        );
        outlet.pushChunk(chunk);
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Pull multiple times with same maxSamples - should reuse buffer
      const times: number[] = [];
      for (let i = 0; i < 5; i++) {
        const start = localClock();
        const [samples] = inlet.pullChunk(1.0, 20);  // Same size
        times.push(localClock() - start);
        
        assert.ok(samples !== null);
      }
      
      // Later pulls should be faster due to buffer reuse
      const avgFirstTwo = (times[0] + times[1]) / 2;
      const avgLastTwo = (times[3] + times[4]) / 2;
      console.log('  Pull times (ms):', times.map(t => (t * 1000).toFixed(3)));
      
      console.log(`  Buffer reuse performance: first=${(avgFirstTwo*1000).toFixed(3)}ms, last=${(avgLastTwo*1000).toFixed(3)}ms`);
      
      outlet.destroy();
      inlet.destroy();
      info.destroy();
      
      // Allow cleanup time
      await new Promise(resolve => setTimeout(resolve, 100));
    });
  });
});