import * as ref from 'ref-napi';
import RefArray from 'ref-array-napi';
import { EventEmitter } from 'events';
import { lib, StreamInletHandle, FloatArray, DoubleArray, IntArray, CharArray, StringArray } from './lib';
import { StreamInfo } from './streaminfo';
import { ChannelFormat, ProcessingOptions, ErrorCode, FOREVER } from './constants';

/**
 * Result of pull operations
 */
export interface PullResult<T> {
  sample: T | null;
  timestamp: number;
}

export interface ChunkResult<T> {
  samples: T[];
  timestamps: number[];
}

/**
 * StreamInlet represents a stream inlet for receiving data
 */
export class StreamInlet extends EventEmitter {
  private handle: Buffer;
  private info: StreamInfo;
  private channelCount: number;
  private channelFormat: ChannelFormat;
  private isOpen: boolean;
  private streamingInterval?: NodeJS.Timeout;

  /**
   * Create a new StreamInlet
   * @param info StreamInfo object describing the stream
   * @param maxBuflen Maximum buffer length in seconds (or samples if rate is irregular)
   * @param maxChunklen Maximum chunk size for pulling chunks (0 = no limit)
   * @param recover Whether to try to recover lost streams
   */
  constructor(
    info: StreamInfo,
    maxBuflen = 360,
    maxChunklen = 0,
    recover = true
  ) {
    super();
    this.info = info;
    this.channelCount = info.channelCount();
    this.channelFormat = info.channelFormat();
    this.isOpen = false;

    const recoverFlag = recover ? 1 : 0;
    this.handle = lib.lsl_create_inlet(info.getHandle(), maxBuflen, maxChunklen, recoverFlag);

    if (ref.isNull(this.handle)) {
      throw new Error('Failed to create stream inlet');
    }

    // Set up finalizer for automatic cleanup
    if (typeof FinalizationRegistry !== 'undefined') {
      const registry = new FinalizationRegistry((handle: Buffer) => {
        try {
          lib.lsl_destroy_inlet(handle);
        } catch (e) {
          // Ignore errors during cleanup
        }
      });
      registry.register(this, this.handle);
    }
  }

  /**
   * Destroy the inlet explicitly
   */
  destroy(): void {
    this.stopStreaming();
    if (this.handle) {
      lib.lsl_destroy_inlet(this.handle);
    }
  }

  /**
   * Open the stream for receiving data
   * @param timeout Timeout in seconds
   */
  openStream(timeout = FOREVER): void {
    const errorCode = ref.alloc(ref.types.int32);
    lib.lsl_open_stream(this.handle, timeout, errorCode);
    
    const error = errorCode.deref();
    if (error < 0) {
      throw new Error(`Failed to open stream: error code ${error}`);
    }
    this.isOpen = true;
  }

  /**
   * Close the stream
   */
  closeStream(): void {
    lib.lsl_close_stream(this.handle);
    this.isOpen = false;
  }

  /**
   * Set post-processing options
   * @param flags Processing options flags
   */
  setPostprocessing(flags: ProcessingOptions): void {
    lib.lsl_set_postprocessing(this.handle, flags);
  }

  /**
   * Pull a single sample
   * @param timeout Timeout in seconds (0 = non-blocking)
   * @returns Sample data and timestamp, or null if no sample available
   */
  pullSample(timeout = 0.0): PullResult<number[] | string[]> {
    const errorCode = ref.alloc(ref.types.int32);
    let timestamp: number;
    let sample: number[] | string[];

    switch (this.channelFormat) {
      case ChannelFormat.Float32: {
        const FloatArrayType = RefArray(ref.types.float);
        const buffer = new FloatArrayType(this.channelCount);
        timestamp = lib.lsl_pull_sample_f(this.handle, buffer.buffer, this.channelCount, timeout, errorCode);
        sample = Array.from(buffer.toArray());
        break;
      }
      case ChannelFormat.Double64: {
        const DoubleArrayType = RefArray(ref.types.double);
        const buffer = new DoubleArrayType(this.channelCount);
        timestamp = lib.lsl_pull_sample_d(this.handle, buffer.buffer, this.channelCount, timeout, errorCode);
        sample = Array.from(buffer.toArray());
        break;
      }
      case ChannelFormat.Int32: {
        const IntArrayType = RefArray(ref.types.int32);
        const buffer = new IntArrayType(this.channelCount);
        timestamp = lib.lsl_pull_sample_i(this.handle, buffer.buffer, this.channelCount, timeout, errorCode);
        sample = Array.from(buffer.toArray());
        break;
      }
      case ChannelFormat.Int16: {
        const ShortArrayType = RefArray(ref.types.int16);
        const buffer = new ShortArrayType(this.channelCount);
        timestamp = lib.lsl_pull_sample_s(this.handle, buffer.buffer, this.channelCount, timeout, errorCode);
        sample = Array.from(buffer.toArray());
        break;
      }
      case ChannelFormat.Int8: {
        const CharArrayType = RefArray(ref.types.int8);
        const buffer = new CharArrayType(this.channelCount);
        timestamp = lib.lsl_pull_sample_c(this.handle, buffer.buffer, this.channelCount, timeout, errorCode);
        sample = Array.from(buffer.toArray());
        break;
      }
      case ChannelFormat.String: {
        const StringArrayType = RefArray(ref.types.CString);
        const buffer = new StringArrayType(this.channelCount);
        timestamp = lib.lsl_pull_sample_str(this.handle, buffer.buffer, this.channelCount, timeout, errorCode);
        sample = buffer.toArray();
        break;
      }
      default:
        throw new Error(`Unsupported channel format: ${this.channelFormat}`);
    }

    const error = errorCode.deref();
    if (error === ErrorCode.TimeoutError || timestamp === 0.0) {
      return { sample: null, timestamp: 0 };
    }
    if (error < 0) {
      throw new Error(`Pull sample error: ${error}`);
    }

    return { sample, timestamp };
  }

  /**
   * Pull a chunk of samples
   * @param maxSamples Maximum number of samples to pull
   * @param timeout Timeout in seconds (0 = non-blocking)
   * @returns Array of samples and timestamps
   */
  pullChunk(maxSamples = 1024, timeout = 0.0): ChunkResult<number[] | string[]> {
    const errorCode = ref.alloc(ref.types.int32);
    const DoubleArrayType = RefArray(ref.types.double);
    const timestampBuffer = new DoubleArrayType(maxSamples);
    const bufferLength = maxSamples * this.channelCount;
    let samplesRetrieved: number;
    let flatData: number[] | string[];

    switch (this.channelFormat) {
      case ChannelFormat.Float32: {
        const FloatArrayType = RefArray(ref.types.float);
        const dataBuffer = new FloatArrayType(bufferLength);
        samplesRetrieved = lib.lsl_pull_chunk_f(
          this.handle,
          dataBuffer.buffer,
          timestampBuffer.buffer,
          bufferLength,
          maxSamples,
          timeout,
          errorCode
        );
        flatData = dataBuffer.toArray();
        break;
      }
      case ChannelFormat.Double64: {
        const DoubleArrayType = RefArray(ref.types.double);
        const dataBuffer = new DoubleArrayType(bufferLength);
        samplesRetrieved = lib.lsl_pull_chunk_d(
          this.handle,
          dataBuffer.buffer,
          timestampBuffer.buffer,
          bufferLength,
          maxSamples,
          timeout,
          errorCode
        );
        flatData = dataBuffer.toArray();
        break;
      }
      case ChannelFormat.Int32: {
        const IntArrayType = RefArray(ref.types.int32);
        const dataBuffer = new IntArrayType(bufferLength);
        samplesRetrieved = lib.lsl_pull_chunk_i(
          this.handle,
          dataBuffer.buffer,
          timestampBuffer.buffer,
          bufferLength,
          maxSamples,
          timeout,
          errorCode
        );
        flatData = dataBuffer.toArray();
        break;
      }
      case ChannelFormat.Int16: {
        const ShortArrayType = RefArray(ref.types.int16);
        const dataBuffer = new ShortArrayType(bufferLength);
        samplesRetrieved = lib.lsl_pull_chunk_s(
          this.handle,
          dataBuffer.buffer,
          timestampBuffer.buffer,
          bufferLength,
          maxSamples,
          timeout,
          errorCode
        );
        flatData = dataBuffer.toArray();
        break;
      }
      case ChannelFormat.Int8: {
        const CharArrayType = RefArray(ref.types.int8);
        const dataBuffer = new CharArrayType(bufferLength);
        samplesRetrieved = lib.lsl_pull_chunk_c(
          this.handle,
          dataBuffer.buffer,
          timestampBuffer.buffer,
          bufferLength,
          maxSamples,
          timeout,
          errorCode
        );
        flatData = dataBuffer.toArray();
        break;
      }
      case ChannelFormat.String: {
        const StringArrayType = RefArray(ref.types.CString);
        const dataBuffer = new StringArrayType(bufferLength);
        samplesRetrieved = lib.lsl_pull_chunk_str(
          this.handle,
          dataBuffer.buffer,
          timestampBuffer.buffer,
          bufferLength,
          maxSamples,
          timeout,
          errorCode
        );
        flatData = dataBuffer.toArray();
        break;
      }
      default:
        throw new Error(`Unsupported channel format: ${this.channelFormat}`);
    }

    const error = errorCode.deref();
    if (error < 0 && error !== ErrorCode.TimeoutError) {
      throw new Error(`Pull chunk error: ${error}`);
    }

    // Convert flat data to 2D array [sample][channel]
    const samples: (number[] | string[])[] = [];
    const timestamps: number[] = [];
    
    for (let s = 0; s < samplesRetrieved; s++) {
      const sample: number[] | string[] = [];
      for (let c = 0; c < this.channelCount; c++) {
        sample.push(flatData[s * this.channelCount + c]);
      }
      samples.push(sample);
      timestamps.push(timestampBuffer.get(s));
    }

    return { samples, timestamps };
  }

  /**
   * Start streaming chunks at regular intervals
   * @param chunkSize Number of samples per chunk
   * @param interval Interval in milliseconds
   * @param maxSamples Maximum samples per pull
   */
  startStreaming(chunkSize = 12, interval?: number, maxSamples = chunkSize * 2): void {
    if (this.streamingInterval) {
      this.stopStreaming();
    }

    // Calculate interval based on sampling rate if not provided
    if (!interval) {
      const srate = this.info.nominalSrate();
      if (srate > 0) {
        interval = (1000 / srate) * chunkSize;
      } else {
        interval = 100; // Default 100ms for irregular rate
      }
    }

    this.streamingInterval = setInterval(() => {
      try {
        const result = this.pullChunk(maxSamples, 0.0);
        if (result.samples.length > 0) {
          this.emit('chunk', result);
        }
      } catch (error) {
        this.emit('error', error);
        this.stopStreaming();
      }
    }, interval);

    this.emit('streaming', true);
  }

  /**
   * Stop streaming
   */
  stopStreaming(): void {
    if (this.streamingInterval) {
      clearInterval(this.streamingInterval);
      this.streamingInterval = undefined;
      this.emit('streaming', false);
    }
  }

  /**
   * Check if currently streaming
   */
  isStreaming(): boolean {
    return this.streamingInterval !== undefined;
  }

  /**
   * Get time correction value
   * @param timeout Timeout in seconds
   * @returns Time correction offset
   */
  timeCorrection(timeout = FOREVER): number {
    const errorCode = ref.alloc(ref.types.int32);
    const correction = lib.lsl_time_correction(this.handle, timeout, errorCode);
    
    const error = errorCode.deref();
    if (error < 0) {
      throw new Error(`Time correction error: ${error}`);
    }
    
    return correction;
  }

  /**
   * Get extended time correction information
   * @param timeout Timeout in seconds
   * @returns Object with correction, remote time, and uncertainty
   */
  timeCorrectionEx(timeout = FOREVER): { correction: number; remoteTime: number; uncertainty: number } {
    const errorCode = ref.alloc(ref.types.int32);
    const remoteTime = ref.alloc(ref.types.double);
    const uncertainty = ref.alloc(ref.types.double);
    
    const correction = lib.lsl_time_correction_ex(
      this.handle,
      remoteTime,
      uncertainty,
      timeout,
      errorCode
    );
    
    const error = errorCode.deref();
    if (error < 0) {
      throw new Error(`Time correction error: ${error}`);
    }
    
    return {
      correction,
      remoteTime: remoteTime.deref(),
      uncertainty: uncertainty.deref(),
    };
  }

  /**
   * Get the number of samples available
   */
  samplesAvailable(): number {
    return lib.lsl_samples_available(this.handle);
  }

  /**
   * Check if the clock was reset
   */
  wasClockReset(): boolean {
    return lib.lsl_was_clock_reset(this.handle) !== 0;
  }

  /**
   * Set the smoothing halftime
   * @param halftime Smoothing halftime in seconds
   * @returns Previous halftime value
   */
  smoothingHalftime(halftime?: number): number {
    return lib.lsl_smoothing_halftime(this.handle, halftime || -1);
  }

  /**
   * Get full stream info
   * @param timeout Timeout in seconds
   * @returns Updated StreamInfo
   */
  getFullInfo(timeout = FOREVER): StreamInfo {
    const errorCode = ref.alloc(ref.types.int32);
    const infoHandle = lib.lsl_get_fullinfo(this.handle, timeout, errorCode);
    
    const error = errorCode.deref();
    if (error < 0) {
      throw new Error(`Get full info error: ${error}`);
    }
    
    return new StreamInfo(infoHandle);
  }

  /**
   * Get the internal handle
   */
  getHandle(): Buffer {
    return this.handle;
  }
}