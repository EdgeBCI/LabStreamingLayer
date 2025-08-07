import { describe, it } from 'node:test';
import assert from 'node:assert';
import { 
  StreamInfo,
  StreamOutlet,
  resolveStreams,
  resolveByProp,
  resolveByPred,
  ContinuousResolver,
  cf_float32
} from '../index.js';

describe('Stream Resolution', () => {
  it('should resolve all streams', async () => {
    // Create test streams
    const info1 = new StreamInfo('Resolver1', 'Test', 1, 100, cf_float32, 'resolver1');
    const info2 = new StreamInfo('Resolver2', 'EEG', 8, 250, cf_float32, 'resolver2');
    
    const outlet1 = new StreamOutlet(info1);
    const outlet2 = new StreamOutlet(info2);
    
    // Wait a bit for streams to be discoverable
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Resolve all streams
    const streams = resolveStreams(0.5);
    
    assert.ok(Array.isArray(streams));
    assert.ok(streams.length >= 2);
    
    // Find our test streams
    const names = streams.map(s => s.name());
    assert.ok(names.includes('Resolver1'));
    assert.ok(names.includes('Resolver2'));
    
    // Clean up resolved streams
    streams.forEach(s => s.destroy());
    outlet1.destroy();
    outlet2.destroy();
    info1.destroy();
    info2.destroy();
  });

  it('should resolve by property', async () => {
    const info = new StreamInfo('PropTest', 'UniqueType', 4, 100, cf_float32, 'prop_test');
    const outlet = new StreamOutlet(info);
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Resolve by type property
    const streams = resolveByProp('type', 'UniqueType', 1, 1.0);
    
    assert.ok(Array.isArray(streams));
    assert.ok(streams.length >= 1);
    assert.strictEqual(streams[0].type(), 'UniqueType');
    
    streams.forEach(s => s.destroy());
    outlet.destroy();
    info.destroy();
  });

  it('should resolve by predicate', async () => {
    const info = new StreamInfo('PredTest', 'PredType', 16, 500, cf_float32, 'pred_test');
    const outlet = new StreamOutlet(info);
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Resolve by predicate
    const predicate = "name='PredTest' and type='PredType'";
    const streams = resolveByPred(predicate, 1, 1.0);
    
    assert.ok(Array.isArray(streams));
    assert.ok(streams.length >= 1);
    assert.strictEqual(streams[0].name(), 'PredTest');
    assert.strictEqual(streams[0].type(), 'PredType');
    
    streams.forEach(s => s.destroy());
    outlet.destroy();
    info.destroy();
  });

  it('should handle timeout when no streams found', () => {
    // Try to find a stream that doesn't exist
    const streams = resolveByProp('type', 'NonExistentType', 1, 0.1);
    
    // Should return empty array after timeout
    assert.ok(Array.isArray(streams));
    assert.strictEqual(streams.length, 0);
  });

  it('should use ContinuousResolver', async () => {
    // Create a continuous resolver
    const resolver = new ContinuousResolver('type', 'ContinuousTest');
    
    // Initially no results
    let results = resolver.results();
    assert.ok(Array.isArray(results));
    assert.strictEqual(results.length, 0);
    
    // Create a matching stream
    const info = new StreamInfo('ContTest', 'ContinuousTest', 1, 100);
    const outlet = new StreamOutlet(info);
    
    // Wait for resolver to find it
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check results again
    results = resolver.results();
    assert.ok(results.length >= 1);
    assert.strictEqual(results[0].type(), 'ContinuousTest');
    
    results.forEach(s => s.destroy());
    resolver.destroy();
    outlet.destroy();
    info.destroy();
  });

  it('should create ContinuousResolver without parameters', () => {
    const resolver = new ContinuousResolver();
    
    // Should not throw
    const results = resolver.results();
    assert.ok(Array.isArray(results));
    
    resolver.destroy();
  });

  it('should create ContinuousResolver with predicate', () => {
    const resolver = new ContinuousResolver(undefined, undefined, "type='Test'");
    
    // Should not throw
    const results = resolver.results();
    assert.ok(Array.isArray(results));
    
    resolver.destroy();
  });

  it('should throw error for conflicting ContinuousResolver parameters', () => {
    assert.throws(() => {
      new ContinuousResolver('type', 'Test', "name='Conflict'");
    }, /You can only either pass the prop\/value argument or the pred argument/);
  });

  it('should throw error for incomplete property specification', () => {
    assert.throws(() => {
      new ContinuousResolver('type'); // Missing value
    }, /If prop is specified, then value must be specified too/);
  });

  it('should handle multiple stream resolution', async () => {
    // Create multiple streams
    const outlets: StreamOutlet[] = [];
    const infos: StreamInfo[] = [];
    
    for (let i = 0; i < 3; i++) {
      const info = new StreamInfo(`Multi${i}`, 'MultiTest', i + 1, 100 * (i + 1));
      infos.push(info);
      outlets.push(new StreamOutlet(info));
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Resolve by type
    const streams = resolveByProp('type', 'MultiTest', 3, 1.0);
    
    assert.ok(streams.length >= 3);
    
    // Verify all our streams were found
    const names = streams.map(s => s.name());
    assert.ok(names.includes('Multi0'));
    assert.ok(names.includes('Multi1'));
    assert.ok(names.includes('Multi2'));
    
    // Clean up
    streams.forEach(s => s.destroy());
    outlets.forEach(o => o.destroy());
    infos.forEach(i => i.destroy());
  });
});