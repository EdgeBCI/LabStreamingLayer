import { 
  StreamInfo, 
  StreamOutlet, 
  StreamInlet, 
  cfFloat32, 
  cfDouble64,
  cfString,
  cfInt32,
  resolveStreams,
  localClock
} from '../src';

describe('StreamOutlet and StreamInlet', () => {
  jest.setTimeout(10000); // Increase timeout for network operations

  describe('Basic push and pull', () => {
    it('should push and pull float32 samples', (done) => {
      const info = new StreamInfo('TestFloat32', 'Test', 3, 100, cfFloat32, 'test_float32');
      const outlet = new StreamOutlet(info);
      
      // Wait a bit for outlet to be discoverable
      setTimeout(() => {
        const streams = resolveStreams(1.0);
        const testStream = streams.find(s => s.getSourceId() === 'test_float32');
        
        if (!testStream) {
          outlet.destroy();
          info.destroy();
          done(new Error('Could not find test stream'));
          return;
        }
        
        const inlet = new StreamInlet(testStream);
        
        // Push a sample
        const sample = [1.5, 2.5, 3.5];
        outlet.pushSample(sample);
        
        // Pull the sample
        setTimeout(() => {
          const [received, timestamp] = inlet.pullSample(0.0);
          
          expect(received).toBeTruthy();
          expect(received).toHaveLength(3);
          expect(received![0]).toBeCloseTo(1.5);
          expect(received![1]).toBeCloseTo(2.5);
          expect(received![2]).toBeCloseTo(3.5);
          expect(timestamp).toBeGreaterThan(0);
          
          inlet.destroy();
          outlet.destroy();
          info.destroy();
          done();
        }, 100);
      }, 500);
    });

    it('should push and pull string samples', (done) => {
      const info = new StreamInfo('TestString', 'Markers', 1, 0, cfString, 'test_string');
      const outlet = new StreamOutlet(info);
      
      setTimeout(() => {
        const streams = resolveStreams(1.0);
        const testStream = streams.find(s => s.getSourceId() === 'test_string');
        
        if (!testStream) {
          outlet.destroy();
          info.destroy();
          done(new Error('Could not find test stream'));
          return;
        }
        
        const inlet = new StreamInlet(testStream);
        
        // Push string samples
        outlet.pushSample(['marker1']);
        outlet.pushSample(['marker2']);
        outlet.pushSample(['marker3']);
        
        setTimeout(() => {
          const [sample1] = inlet.pullSample(0.0);
          const [sample2] = inlet.pullSample(0.0);
          const [sample3] = inlet.pullSample(0.0);
          
          expect(sample1).toEqual(['marker1']);
          expect(sample2).toEqual(['marker2']);
          expect(sample3).toEqual(['marker3']);
          
          inlet.destroy();
          outlet.destroy();
          info.destroy();
          done();
        }, 100);
      }, 500);
    });
  });

  describe('Chunk operations', () => {
    it('should push and pull chunks', (done) => {
      const info = new StreamInfo('TestChunk', 'Test', 2, 100, cfFloat32, 'test_chunk');
      const outlet = new StreamOutlet(info);
      
      setTimeout(() => {
        const streams = resolveStreams(1.0);
        const testStream = streams.find(s => s.getSourceId() === 'test_chunk');
        
        if (!testStream) {
          outlet.destroy();
          info.destroy();
          done(new Error('Could not find test stream'));
          return;
        }
        
        const inlet = new StreamInlet(testStream);
        
        // Push a chunk of samples
        const samples = [
          [1.0, 2.0],
          [3.0, 4.0],
          [5.0, 6.0]
        ];
        outlet.pushChunk(samples);
        
        setTimeout(() => {
          const [received, timestamps] = inlet.pullChunk(0.0, 10);
          
          expect(received).toBeTruthy();
          expect(received).toHaveLength(3);
          expect(timestamps).toHaveLength(3);
          
          expect(received![0]).toEqual([1.0, 2.0]);
          expect(received![1]).toEqual([3.0, 4.0]);
          expect(received![2]).toEqual([5.0, 6.0]);
          
          inlet.destroy();
          outlet.destroy();
          info.destroy();
          done();
        }, 100);
      }, 500);
    });

    it('should handle flattened array format', (done) => {
      const info = new StreamInfo('TestFlat', 'Test', 3, 100, cfFloat32, 'test_flat');
      const outlet = new StreamOutlet(info);
      
      setTimeout(() => {
        const streams = resolveStreams(1.0);
        const testStream = streams.find(s => s.getSourceId() === 'test_flat');
        
        if (!testStream) {
          outlet.destroy();
          info.destroy();
          done(new Error('Could not find test stream'));
          return;
        }
        
        const inlet = new StreamInlet(testStream);
        
        // Push flattened array
        const flatSamples = [
          1.0, 2.0, 3.0,  // Sample 1
          4.0, 5.0, 6.0,  // Sample 2
        ];
        outlet.pushChunk(flatSamples);
        
        setTimeout(() => {
          const [received, timestamps] = inlet.pullChunk(0.0, 10);
          
          expect(received).toBeTruthy();
          expect(received).toHaveLength(2);
          expect(received![0]).toEqual([1.0, 2.0, 3.0]);
          expect(received![1]).toEqual([4.0, 5.0, 6.0]);
          
          inlet.destroy();
          outlet.destroy();
          info.destroy();
          done();
        }, 100);
      }, 500);
    });
  });

  describe('Timestamp handling', () => {
    it('should handle custom timestamps', (done) => {
      const info = new StreamInfo('TestTimestamp', 'Test', 1, 0, cfFloat32, 'test_ts');
      const outlet = new StreamOutlet(info);
      
      setTimeout(() => {
        const streams = resolveStreams(1.0);
        const testStream = streams.find(s => s.getSourceId() === 'test_ts');
        
        if (!testStream) {
          outlet.destroy();
          info.destroy();
          done(new Error('Could not find test stream'));
          return;
        }
        
        const inlet = new StreamInlet(testStream);
        
        // Push with custom timestamp
        const customTime = localClock();
        outlet.pushSample([42.0], customTime);
        
        setTimeout(() => {
          const [sample, timestamp] = inlet.pullSample(0.0);
          
          expect(sample).toEqual([42.0]);
          // Timestamp should be close to our custom time
          expect(Math.abs(timestamp! - customTime)).toBeLessThan(1.0);
          
          inlet.destroy();
          outlet.destroy();
          info.destroy();
          done();
        }, 100);
      }, 500);
    });
  });

  describe('Stream info from inlet/outlet', () => {
    it('should get stream info from outlet', () => {
      const info = new StreamInfo('TestInfo', 'Test', 4, 250, cfDouble64, 'test_info');
      const outlet = new StreamOutlet(info);
      
      const retrievedInfo = outlet.getInfo();
      expect(retrievedInfo.getName()).toBe('TestInfo');
      expect(retrievedInfo.getType()).toBe('Test');
      expect(retrievedInfo.getChannelCount()).toBe(4);
      expect(retrievedInfo.getNominalSrate()).toBe(250);
      expect(retrievedInfo.getChannelFormat()).toBe(cfDouble64);
      
      outlet.destroy();
      info.destroy();
      retrievedInfo.destroy();
    });
  });
});