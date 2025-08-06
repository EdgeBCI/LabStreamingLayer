import {
  StreamInfo,
  StreamOutlet,
  resolveStreams,
  resolveByProp,
  resolveByPred,
  resolveStream,
  ContinuousResolver,
  cfFloat32,
  cfString
} from '../src';

describe('Resolver Functions', () => {
  let testOutlets: StreamOutlet[] = [];
  let testInfos: StreamInfo[] = [];

  beforeAll((done) => {
    // Create test streams
    const info1 = new StreamInfo('TestEEG', 'EEG', 32, 250, cfFloat32, 'test_eeg_1');
    const info2 = new StreamInfo('TestEMG', 'EMG', 8, 1000, cfFloat32, 'test_emg_1');
    const info3 = new StreamInfo('TestMarkers', 'Markers', 1, 0, cfString, 'test_markers_1');
    
    testInfos.push(info1, info2, info3);
    
    testOutlets.push(
      new StreamOutlet(info1),
      new StreamOutlet(info2),
      new StreamOutlet(info3)
    );
    
    // Wait for outlets to be discoverable
    setTimeout(done, 1000);
  });

  afterAll(() => {
    // Clean up
    testOutlets.forEach(outlet => outlet.destroy());
    testInfos.forEach(info => info.destroy());
  });

  describe('resolveStreams', () => {
    it('should resolve all available streams', () => {
      const streams = resolveStreams(2.0);
      
      expect(streams).toBeInstanceOf(Array);
      expect(streams.length).toBeGreaterThanOrEqual(3);
      
      // Check if our test streams are found
      const sourceIds = streams.map(s => s.getSourceId());
      expect(sourceIds).toContain('test_eeg_1');
      expect(sourceIds).toContain('test_emg_1');
      expect(sourceIds).toContain('test_markers_1');
      
      // Clean up
      streams.forEach(s => s.destroy());
    });

    it('should respect timeout parameter', () => {
      const startTime = Date.now();
      const streams = resolveStreams(0.1);
      const elapsed = Date.now() - startTime;
      
      expect(elapsed).toBeLessThan(200);
      expect(streams).toBeInstanceOf(Array);
      
      streams.forEach(s => s.destroy());
    });
  });

  describe('resolveByProp', () => {
    it('should resolve streams by type property', () => {
      const eegStreams = resolveByProp('type', 'EEG', 1, 2.0);
      
      expect(eegStreams.length).toBeGreaterThanOrEqual(1);
      expect(eegStreams[0].getType()).toBe('EEG');
      
      eegStreams.forEach(s => s.destroy());
    });

    it('should resolve streams by name property', () => {
      const streams = resolveByProp('name', 'TestEMG', 1, 2.0);
      
      expect(streams.length).toBeGreaterThanOrEqual(1);
      expect(streams[0].getName()).toBe('TestEMG');
      expect(streams[0].getSourceId()).toBe('test_emg_1');
      
      streams.forEach(s => s.destroy());
    });

    it('should return empty array when no matches found', () => {
      const streams = resolveByProp('type', 'NonExistent', 1, 0.5);
      
      expect(streams).toEqual([]);
    });
  });

  describe('resolveByPred', () => {
    it('should resolve streams by XPath predicate', () => {
      // Find streams with high sampling rate
      const highRateStreams = resolveByPred("nominal_srate>500", 1, 2.0);
      
      expect(highRateStreams.length).toBeGreaterThanOrEqual(1);
      expect(highRateStreams[0].getNominalSrate()).toBeGreaterThan(500);
      
      highRateStreams.forEach(s => s.destroy());
    });

    it('should resolve streams with complex predicate', () => {
      const streams = resolveByPred("type='EEG' and channel_count=32", 1, 2.0);
      
      expect(streams.length).toBeGreaterThanOrEqual(1);
      expect(streams[0].getType()).toBe('EEG');
      expect(streams[0].getChannelCount()).toBe(32);
      
      streams.forEach(s => s.destroy());
    });
  });

  describe('resolveStream (polymorphic)', () => {
    it('should resolve all streams with no arguments', () => {
      const streams = resolveStream();
      
      expect(streams).toBeInstanceOf(Array);
      expect(streams.length).toBeGreaterThanOrEqual(3);
      
      streams.forEach(s => s.destroy());
    });

    it('should resolve all streams with timeout', () => {
      const streams = resolveStream(0.5);
      
      expect(streams).toBeInstanceOf(Array);
      
      streams.forEach(s => s.destroy());
    });

    it('should resolve by predicate with single string', () => {
      const streams = resolveStream("type='Markers'");
      
      expect(streams.length).toBeGreaterThanOrEqual(1);
      expect(streams[0].getType()).toBe('Markers');
      
      streams.forEach(s => s.destroy());
    });

    it('should resolve by property with two strings', () => {
      const streams = resolveStream('name', 'TestEEG');
      
      expect(streams.length).toBeGreaterThanOrEqual(1);
      expect(streams[0].getName()).toBe('TestEEG');
      
      streams.forEach(s => s.destroy());
    });
  });

  describe('ContinuousResolver', () => {
    it('should continuously resolve all streams', (done) => {
      const resolver = new ContinuousResolver();
      
      // Initial results
      setTimeout(() => {
        const results1 = resolver.results();
        expect(results1.length).toBeGreaterThanOrEqual(3);
        results1.forEach(s => s.destroy());
        
        // Create a new stream
        const newInfo = new StreamInfo('NewStream', 'Test', 1, 100, cfFloat32, 'new_stream_1');
        const newOutlet = new StreamOutlet(newInfo);
        
        // Check if resolver picks up the new stream
        setTimeout(() => {
          const results2 = resolver.results();
          const sourceIds = results2.map(s => s.getSourceId());
          expect(sourceIds).toContain('new_stream_1');
          
          results2.forEach(s => s.destroy());
          newOutlet.destroy();
          newInfo.destroy();
          resolver.destroy();
          done();
        }, 1000);
      }, 500);
    });

    it('should resolve by property continuously', (done) => {
      const resolver = new ContinuousResolver('type', 'EEG');
      
      setTimeout(() => {
        const results = resolver.results();
        
        expect(results.length).toBeGreaterThanOrEqual(1);
        results.forEach(stream => {
          expect(stream.getType()).toBe('EEG');
        });
        
        results.forEach(s => s.destroy());
        resolver.destroy();
        done();
      }, 500);
    });

    it('should resolve by predicate continuously', (done) => {
      const resolver = new ContinuousResolver(null, null, "channel_count>1");
      
      setTimeout(() => {
        const results = resolver.results();
        
        expect(results.length).toBeGreaterThanOrEqual(2);
        results.forEach(stream => {
          expect(stream.getChannelCount()).toBeGreaterThan(1);
        });
        
        results.forEach(s => s.destroy());
        resolver.destroy();
        done();
      }, 500);
    });

    it('should throw error for invalid parameter combinations', () => {
      expect(() => {
        new ContinuousResolver('type', null);
      }).toThrow('If prop is specified, then value must be specified');

      expect(() => {
        new ContinuousResolver('type', 'EEG', "predicate");
      }).toThrow('You can only either pass the prop/value argument or the pred argument');
    });
  });
});