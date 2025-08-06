import {
  IRREGULAR_RATE,
  DEDUCED_TIMESTAMP,
  FOREVER,
  procNone,
  procClocksync,
  procDejitter,
  procMonotonize,
  procThreadsafe,
  procAll,
  cfFloat32,
  cfDouble64,
  cfString,
  cfInt32,
  cfInt16,
  cfInt8,
  cfInt64,
  cfUndefined,
  string2fmt,
  fmt2string,
  protocolVersion,
  libraryVersion,
  libraryInfo,
  localClock,
  TimeoutError,
  LostError,
  InvalidArgumentError,
  InternalError,
  handleError
} from '../src';

describe('Utility Functions and Constants', () => {
  describe('Constants', () => {
    it('should have correct time constants', () => {
      expect(IRREGULAR_RATE).toBe(0.0);
      expect(DEDUCED_TIMESTAMP).toBe(-1.0);
      expect(FOREVER).toBe(32000000.0);
    });

    it('should have correct processing flags', () => {
      expect(procNone).toBe(0);
      expect(procClocksync).toBe(1);
      expect(procDejitter).toBe(2);
      expect(procMonotonize).toBe(4);
      expect(procThreadsafe).toBe(8);
      expect(procAll).toBe(15); // All flags combined
    });

    it('should have correct channel format constants', () => {
      expect(cfFloat32).toBe(1);
      expect(cfDouble64).toBe(2);
      expect(cfString).toBe(3);
      expect(cfInt32).toBe(4);
      expect(cfInt16).toBe(5);
      expect(cfInt8).toBe(6);
      expect(cfInt64).toBe(7);
      expect(cfUndefined).toBe(0);
    });
  });

  describe('Format conversion', () => {
    it('should convert string to format', () => {
      expect(string2fmt['float32']).toBe(cfFloat32);
      expect(string2fmt['double64']).toBe(cfDouble64);
      expect(string2fmt['string']).toBe(cfString);
      expect(string2fmt['int32']).toBe(cfInt32);
      expect(string2fmt['int16']).toBe(cfInt16);
      expect(string2fmt['int8']).toBe(cfInt8);
      expect(string2fmt['int64']).toBe(cfInt64);
    });

    it('should convert format to string', () => {
      expect(fmt2string[cfFloat32]).toBe('float32');
      expect(fmt2string[cfDouble64]).toBe('double64');
      expect(fmt2string[cfString]).toBe('string');
      expect(fmt2string[cfInt32]).toBe('int32');
      expect(fmt2string[cfInt16]).toBe('int16');
      expect(fmt2string[cfInt8]).toBe('int8');
      expect(fmt2string[cfInt64]).toBe('int64');
      expect(fmt2string[cfUndefined]).toBe('undefined');
    });
  });

  describe('Library information', () => {
    it('should return protocol version', () => {
      const version = protocolVersion();
      expect(version).toBeGreaterThan(0);
      expect(version).toBeLessThan(10000); // Reasonable range
    });

    it('should return library version', () => {
      const version = libraryVersion();
      expect(version).toBeGreaterThan(0);
      expect(version).toBeLessThan(10000); // Reasonable range
    });

    it('should return library info string', () => {
      const info = libraryInfo();
      expect(typeof info).toBe('string');
      expect(info.length).toBeGreaterThan(0);
      // Usually contains version info
      expect(info.toLowerCase()).toMatch(/lsl|lib|version/);
    });
  });

  describe('Local clock', () => {
    it('should return monotonically increasing timestamps', () => {
      const t1 = localClock();
      const t2 = localClock();
      const t3 = localClock();
      
      expect(t2).toBeGreaterThanOrEqual(t1);
      expect(t3).toBeGreaterThanOrEqual(t2);
      expect(t1).toBeGreaterThan(0);
    });

    it('should have reasonable precision', () => {
      const times: number[] = [];
      for (let i = 0; i < 10; i++) {
        times.push(localClock());
      }
      
      // Check that we get different values (sub-millisecond precision)
      const uniqueTimes = new Set(times);
      expect(uniqueTimes.size).toBeGreaterThan(1);
    });
  });

  describe('Error classes', () => {
    it('should create TimeoutError', () => {
      const error = new TimeoutError();
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('TimeoutError');
      expect(error.message).toBe('The operation failed due to a timeout.');
      
      const customError = new TimeoutError('Custom timeout message');
      expect(customError.message).toBe('Custom timeout message');
    });

    it('should create LostError', () => {
      const error = new LostError();
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('LostError');
      expect(error.message).toBe('The stream has been lost.');
    });

    it('should create InvalidArgumentError', () => {
      const error = new InvalidArgumentError();
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('InvalidArgumentError');
      expect(error.message).toBe('An argument was incorrectly specified.');
    });

    it('should create InternalError', () => {
      const error = new InternalError();
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('InternalError');
      expect(error.message).toBe('An internal error has occurred.');
    });
  });

  describe('Error handler', () => {
    it('should not throw for success code', () => {
      expect(() => handleError(0)).not.toThrow();
    });

    it('should throw TimeoutError for -1', () => {
      expect(() => handleError(-1)).toThrow(TimeoutError);
    });

    it('should throw LostError for -2', () => {
      expect(() => handleError(-2)).toThrow(LostError);
    });

    it('should throw InvalidArgumentError for -3', () => {
      expect(() => handleError(-3)).toThrow(InvalidArgumentError);
    });

    it('should throw InternalError for -4', () => {
      expect(() => handleError(-4)).toThrow(InternalError);
    });

    it('should throw generic error for other negative codes', () => {
      expect(() => handleError(-99)).toThrow('An unknown error has occurred.');
    });
  });

  describe('Processing flags combinations', () => {
    it('should combine flags correctly', () => {
      const combined = procClocksync | procDejitter;
      expect(combined).toBe(3);
      
      const allManual = procNone | procClocksync | procDejitter | procMonotonize | procThreadsafe;
      expect(allManual).toBe(procAll);
    });

    it('should check individual flags in combination', () => {
      const flags = procClocksync | procDejitter | procThreadsafe;
      
      expect(flags & procClocksync).toBeTruthy();
      expect(flags & procDejitter).toBeTruthy();
      expect(flags & procThreadsafe).toBeTruthy();
      expect(flags & procMonotonize).toBeFalsy();
    });
  });
});