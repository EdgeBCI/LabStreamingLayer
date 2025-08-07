import { describe, it } from 'node:test';
import assert from 'node:assert';
import { 
  StreamInfo, 
  StreamOutlet, 
  StreamInlet,
  cf_float32,
  cf_string,
  cf_int32,
  localClock
} from '../index.js';

describe('StreamOutlet and StreamInlet', () => {
  it('should send and receive float32 samples', async () => {
    const info = new StreamInfo('TestFloat', 'Test', 3, 100, cf_float32, 'test_float');
    const outlet = new StreamOutlet(info);
    const inlet = new StreamInlet(info);
    
    // Open the inlet stream
    inlet.openStream(1.0);
    
    // Send a sample
    const sample = [1.5, 2.5, 3.5];
    const sendTime = localClock();
    outlet.pushSample(sample, sendTime);
    
    // Receive the sample
    const [received, timestamp] = inlet.pullSample(1.0);
    
    assert.ok(received !== null);
    assert.strictEqual(received!.length, 3);
    assert.strictEqual(received![0], 1.5);
    assert.strictEqual(received![1], 2.5);
    assert.strictEqual(received![2], 3.5);
    assert.ok(Math.abs(timestamp - sendTime) < 1.0); // Within 1 second
    
    outlet.destroy();
    inlet.destroy();
    info.destroy();
  });

  it('should send and receive string samples', async () => {
    const info = new StreamInfo('TestString', 'Markers', 1, 0, cf_string, 'test_string');
    const outlet = new StreamOutlet(info);
    const inlet = new StreamInlet(info);
    
    inlet.openStream(1.0);
    
    const marker = ['start_trial'];
    outlet.pushSample(marker);
    
    const [received, timestamp] = inlet.pullSample(1.0);
    
    assert.ok(received !== null);
    assert.strictEqual(received!.length, 1);
    assert.strictEqual(received![0], 'start_trial');
    
    outlet.destroy();
    inlet.destroy();
    info.destroy();
  });

  it('should send and receive chunks', async () => {
    const info = new StreamInfo('TestChunk', 'Test', 2, 100, cf_int32, 'test_chunk');
    const outlet = new StreamOutlet(info);
    const inlet = new StreamInlet(info);
    
    inlet.openStream(1.0);
    
    // Send a chunk of 5 samples
    const chunk = [
      [1, 2],
      [3, 4],
      [5, 6],
      [7, 8],
      [9, 10]
    ];
    outlet.pushChunk(chunk);
    
    // Wait a bit for data to arrive
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Receive the chunk
    const [samples, timestamps] = inlet.pullChunk(0.0, 10);
    
    assert.ok(samples !== null);
    assert.ok(samples!.length >= 5);
    assert.deepStrictEqual(samples![0], [1, 2]);
    assert.deepStrictEqual(samples![4], [9, 10]);
    assert.strictEqual(timestamps.length, samples!.length);
    
    outlet.destroy();
    inlet.destroy();
    info.destroy();
  });

  it('should handle pushChunk with timestamps array', async () => {
    const info = new StreamInfo('TestChunkTime', 'Test', 2, 0, cf_float32, 'test_chunk_time');
    const outlet = new StreamOutlet(info);
    const inlet = new StreamInlet(info);
    
    inlet.openStream(1.0);
    
    const chunk = [[1.0, 2.0], [3.0, 4.0]];
    const timestamps = [100.0, 100.01];
    outlet.pushChunk(chunk, timestamps);
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const [samples, receivedTimestamps] = inlet.pullChunk(0.0, 10);
    
    assert.ok(samples !== null);
    assert.ok(samples!.length >= 2);
    assert.ok(Math.abs(receivedTimestamps[0] - 100.0) < 1.0);
    assert.ok(Math.abs(receivedTimestamps[1] - 100.01) < 1.0);
    
    outlet.destroy();
    inlet.destroy();
    info.destroy();
  });

  it('should check for consumers', () => {
    const info = new StreamInfo('TestConsumers', 'Test', 1, 0, cf_float32);
    const outlet = new StreamOutlet(info);
    
    // Initially no consumers
    assert.strictEqual(outlet.haveConsumers(), false);
    
    // Create an inlet (consumer)
    const inlet = new StreamInlet(info);
    inlet.openStream(1.0);
    
    // Wait for consumer to be detected
    const hasConsumer = outlet.waitForConsumers(1.0);
    assert.ok(hasConsumer || outlet.haveConsumers());
    
    inlet.destroy();
    outlet.destroy();
    info.destroy();
  });

  it('should handle inlet time correction', () => {
    const info = new StreamInfo('TestTimeCorrection', 'Test', 1, 100);
    const inlet = new StreamInlet(info);
    
    // Time correction should return a number
    const correction = inlet.timeCorrection(1.0);
    assert.ok(typeof correction === 'number');
    
    inlet.destroy();
    info.destroy();
  });

  it('should flush inlet buffer', async () => {
    const info = new StreamInfo('TestFlush', 'Test', 1, 100, cf_float32);
    const outlet = new StreamOutlet(info);
    const inlet = new StreamInlet(info);
    
    inlet.openStream(1.0);
    
    // Send multiple samples
    for (let i = 0; i < 10; i++) {
      outlet.pushSample([i]);
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Flush the buffer
    const flushed = inlet.flush();
    assert.ok(typeof flushed === 'number');
    assert.ok(flushed >= 0);
    
    // After flush, no samples should be available immediately
    const available = inlet.samplesAvailable();
    assert.strictEqual(available, 0);
    
    outlet.destroy();
    inlet.destroy();
    info.destroy();
  });

  it('should get inlet info', () => {
    const info = new StreamInfo('TestInletInfo', 'Test', 4, 250, cf_float32, 'inlet_info');
    const inlet = new StreamInlet(info);
    
    const inletInfo = inlet.info(1.0);
    assert.strictEqual(inletInfo.name(), 'TestInletInfo');
    assert.strictEqual(inletInfo.type(), 'Test');
    assert.strictEqual(inletInfo.channelCount(), 4);
    
    inletInfo.destroy();
    inlet.destroy();
    info.destroy();
  });

  it('should validate sample array length', () => {
    const info = new StreamInfo('TestValidation', 'Test', 3, 100);
    const outlet = new StreamOutlet(info);
    
    // Wrong number of channels should throw
    assert.throws(() => {
      outlet.pushSample([1, 2]); // Only 2 channels instead of 3
    }, /must correspond to the stream's channel count/);
    
    outlet.destroy();
    info.destroy();
  });

  it('should handle different channel formats', () => {
    const formats = [
      { format: cf_float32, sample: [1.5, 2.5] },
      { format: cf_int32, sample: [100, 200] },
      { format: cf_string, sample: ['hello', 'world'] }
    ];
    
    for (const { format, sample } of formats) {
      const info = new StreamInfo(`Test${format}`, 'Test', 2, 0, format);
      const outlet = new StreamOutlet(info);
      
      // Should not throw
      assert.doesNotThrow(() => {
        outlet.pushSample(sample);
      });
      
      outlet.destroy();
      info.destroy();
    }
  });
});