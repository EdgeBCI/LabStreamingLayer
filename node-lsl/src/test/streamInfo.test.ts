import { describe, it } from 'node:test';
import assert from 'node:assert';
import { StreamInfo, cf_float32, cf_string, IRREGULAR_RATE } from '../index.js';

describe('StreamInfo', () => {
  it('should create a StreamInfo with all parameters', () => {
    const info = new StreamInfo(
      'TestStream',
      'Test',
      8,
      100,
      cf_float32,
      'test123'
    );
    
    assert.strictEqual(info.name(), 'TestStream');
    assert.strictEqual(info.type(), 'Test');
    assert.strictEqual(info.channelCount(), 8);
    assert.strictEqual(info.nominalSrate(), 100);
    assert.strictEqual(info.channelFormat(), cf_float32);
    assert.strictEqual(info.sourceId(), 'test123');
    
    info.destroy();
  });

  it('should create a StreamInfo with default parameters', () => {
    const info = new StreamInfo();
    
    assert.strictEqual(info.name(), 'untitled');
    assert.strictEqual(info.type(), '');
    assert.strictEqual(info.channelCount(), 1);
    assert.strictEqual(info.nominalSrate(), IRREGULAR_RATE);
    assert.strictEqual(info.channelFormat(), cf_float32);
    assert.ok(info.sourceId()); // Should have auto-generated ID
    
    info.destroy();
  });

  it('should accept string channel format', () => {
    const info = new StreamInfo(
      'StringFormat',
      'Test',
      1,
      0,
      'string'
    );
    
    assert.strictEqual(info.channelFormat(), cf_string);
    info.destroy();
  });

  it('should auto-generate source ID when not provided', () => {
    const info1 = new StreamInfo('Stream1', 'Type1', 4, 250);
    const info2 = new StreamInfo('Stream1', 'Type1', 4, 250);
    
    assert.ok(info1.sourceId());
    assert.strictEqual(info1.sourceId(), info2.sourceId()); // Same params = same ID
    
    info1.destroy();
    info2.destroy();
  });

  it('should handle channel metadata', () => {
    const info = new StreamInfo('MetaStream', 'EEG', 4, 250);
    
    // Set channel labels
    const labels = ['Fp1', 'Fp2', 'C3', 'C4'];
    info.setChannelLabels(labels);
    
    // Set channel types
    info.setChannelTypes('EEG');
    
    // Set channel units
    info.setChannelUnits('microvolts');
    
    // Verify metadata was set
    const desc = info.desc();
    assert.ok(!desc.empty());
    assert.ok(!desc.child('channels').empty());
    
    info.destroy();
  });

  it('should throw error for invalid channel format string', () => {
    assert.throws(() => {
      new StreamInfo('Test', 'Test', 1, 0, 'invalid_format');
    }, /Unknown channel format/);
  });

  it('should get hosting information', () => {
    const info = new StreamInfo('HostInfo', 'Test', 1);
    
    // These should return values (even if defaults)
    assert.ok(typeof info.version() === 'number');
    assert.ok(typeof info.createdAt() === 'number');
    assert.ok(typeof info.uid() === 'string');
    assert.ok(typeof info.sessionId() === 'string');
    assert.ok(typeof info.hostname() === 'string');
    
    info.destroy();
  });

  it('should get XML representation', () => {
    const info = new StreamInfo('XMLTest', 'Test', 2, 100);
    
    const xml = info.asXml();
    assert.ok(typeof xml === 'string');
    assert.ok(xml.includes('XMLTest'));
    assert.ok(xml.includes('Test'));
    
    info.destroy();
  });
});