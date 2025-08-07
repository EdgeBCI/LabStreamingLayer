import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  IRREGULAR_RATE,
  DEDUCED_TIMESTAMP,
  FOREVER,
  proc_none,
  proc_clocksync,
  proc_dejitter,
  proc_monotonize,
  proc_threadsafe,
  proc_ALL,
  protocolVersion,
  libraryVersion,
  libraryInfo,
  localClock,
  TimeoutError,
  LostError,
  InvalidArgumentError,
  InternalError,
  handleError
} from '../index.js';

describe('Utility Functions and Constants', () => {
  it('should have correct constant values', () => {
    assert.strictEqual(IRREGULAR_RATE, 0.0);
    assert.strictEqual(DEDUCED_TIMESTAMP, -1.0);
    assert.strictEqual(FOREVER, 32000000.0);
    
    assert.strictEqual(proc_none, 0);
    assert.strictEqual(proc_clocksync, 1);
    assert.strictEqual(proc_dejitter, 2);
    assert.strictEqual(proc_monotonize, 4);
    assert.strictEqual(proc_threadsafe, 8);
    assert.strictEqual(proc_ALL, 15); // All flags combined
  });

  it('should get protocol version', () => {
    const version = protocolVersion();
    assert.ok(typeof version === 'number');
    assert.ok(version > 0);
  });

  it('should get library version', () => {
    const version = libraryVersion();
    assert.ok(typeof version === 'number');
    assert.ok(version > 0);
  });

  it('should get library info', () => {
    const info = libraryInfo();
    assert.ok(typeof info === 'string');
    assert.ok(info.length > 0);
  });

  it('should get local clock', () => {
    const time1 = localClock();
    const time2 = localClock();
    
    assert.ok(typeof time1 === 'number');
    assert.ok(typeof time2 === 'number');
    assert.ok(time2 >= time1); // Time should not go backwards
  });

  it('should handle error codes correctly', () => {
    // No error (code 0)
    assert.doesNotThrow(() => handleError(0));
    
    // Timeout error (code -1)
    assert.throws(() => handleError(-1), TimeoutError);
    
    // Lost error (code -2)
    assert.throws(() => handleError(-2), LostError);
    
    // Invalid argument error (code -3)
    assert.throws(() => handleError(-3), InvalidArgumentError);
    
    // Internal error (code -4)
    assert.throws(() => handleError(-4), InternalError);
    
    // Unknown error (other negative codes)
    assert.throws(() => handleError(-99), /unknown error/);
  });

  it('should handle error object with value property', () => {
    // Test with object containing value property
    assert.doesNotThrow(() => handleError({ value: 0 }));
    assert.throws(() => handleError({ value: -1 }), TimeoutError);
    assert.throws(() => handleError({ value: -2 }), LostError);
  });

  it('should create custom error instances', () => {
    const timeout = new TimeoutError();
    assert.ok(timeout instanceof Error);
    assert.ok(timeout instanceof TimeoutError);
    assert.strictEqual(timeout.name, 'TimeoutError');
    assert.ok(timeout.message.includes('timeout'));
    
    const lost = new LostError();
    assert.ok(lost instanceof Error);
    assert.ok(lost instanceof LostError);
    assert.strictEqual(lost.name, 'LostError');
    assert.ok(lost.message.includes('lost'));
    
    const invalid = new InvalidArgumentError();
    assert.ok(invalid instanceof Error);
    assert.ok(invalid instanceof InvalidArgumentError);
    assert.strictEqual(invalid.name, 'InvalidArgumentError');
    assert.ok(invalid.message.includes('incorrectly specified'));
    
    const internal = new InternalError();
    assert.ok(internal instanceof Error);
    assert.ok(internal instanceof InternalError);
    assert.strictEqual(internal.name, 'InternalError');
    assert.ok(internal.message.includes('internal error'));
  });

  it('should accept custom error messages', () => {
    const timeout = new TimeoutError('Custom timeout message');
    assert.strictEqual(timeout.message, 'Custom timeout message');
    
    const lost = new LostError('Custom lost message');
    assert.strictEqual(lost.message, 'Custom lost message');
    
    const invalid = new InvalidArgumentError('Custom invalid message');
    assert.strictEqual(invalid.message, 'Custom invalid message');
    
    const internal = new InternalError('Custom internal message');
    assert.strictEqual(internal.message, 'Custom internal message');
  });

  it('should measure time difference with local clock', async () => {
    const start = localClock();
    
    // Wait 100ms
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const end = localClock();
    const diff = end - start;
    
    // Should be approximately 0.1 seconds (100ms)
    assert.ok(diff > 0.05); // At least 50ms
    assert.ok(diff < 0.5);  // Less than 500ms
  });

  it('should handle positive error codes gracefully', () => {
    // Positive error codes should not throw
    assert.doesNotThrow(() => handleError(1));
    assert.doesNotThrow(() => handleError(100));
  });
});