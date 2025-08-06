import { EventEmitter } from 'events';
import * as koffi from 'koffi';
import { 
  createFloatArray, 
  createDoubleArray, 
  createIntArray, 
  createShortArray, 
  createCharArray,
  lsl_create_inlet,
  lsl_destroy_inlet,
  lsl_open_stream,
  lsl_close_stream,
  lsl_set_postprocessing,
  lsl_pull_sample_f,
  lsl_pull_sample_d,
  lsl_pull_sample_i,
  lsl_pull_sample_s,
  lsl_pull_sample_c,
  lsl_pull_sample_str,
  lsl_pull_chunk_f,
  lsl_pull_chunk_d,
  lsl_pull_chunk_i,
  lsl_pull_chunk_s,
  lsl_pull_chunk_c,
  lsl_pull_chunk_str,
  lsl_time_correction,
  lsl_time_correction_ex,
  lsl_samples_available,
  lsl_was_clock_reset,
  lsl_smoothing_halftime,
  lsl_get_fullinfo
} from './lib';
import { StreamInfo } from './streaminfo';
import { ChannelFormat, ProcessingOptions, ErrorCode, FOREVER, TimeoutError, LostError } from './constants';

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
  private handle: any; // koffi pointer
  private info: StreamInfo;
  private channelCount: number;
  private channelFormat: ChannelFormat;
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

    const recoverFlag = recover ? 1 : 0;
    this.handle = lsl_create_inlet(info.getHandle(), maxBuflen, maxChunklen, recoverFlag);

    if (!this.handle) {
      throw new Error('Failed to create stream inlet');
    }

    // Set up finalizer for automatic cleanup
    if (typeof FinalizationRegistry !== 'undefined') {
      const registry = new FinalizationRegistry((handle: any) => {
        try {
          lsl_destroy_inlet(handle);
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
      lsl_destroy_inlet(this.handle);
    }
  }

  /**
   * Open the stream for receiving data
   * @param timeout Timeout in seconds
   */
  openStream(timeout = FOREVER): void {
    const errorCode = koffi.alloc('int32', 1);
    lsl_open_stream(this.handle, timeout, errorCode);
    
    const error = koffi.decode(errorCode, 'int32', 0); // koffi decode
    if (error < 0) {
      throw new Error(`Failed to open stream: error code ${error}`);
    }
  }

  /**
   * Close the stream
   */
  closeStream(): void {
    lsl_close_stream(this.handle);
  }

  /**
   * Set post-processing options
   * @param flags Processing options flags
   */
  setPostprocessing(flags: ProcessingOptions): void {
    lsl_set_postprocessing(this.handle, flags);
  }

  /**
   * Pull a single sample
   * @param timeout Timeout in seconds (0 = non-blocking)
   * @returns Sample data and timestamp, or null if no sample available
   */
  pullSample(timeout = 0.0): PullResult<number[] | string[]> {
    const errorCode = koffi.alloc('int32', 1);
    let timestamp: number;
    let sample: number[] | string[];

    switch (this.channelFormat) {
      case ChannelFormat.Float32: {
        const buffer = createFloatArray(this.channelCount);
        timestamp = lsl_pull_sample_f(this.handle, buffer, this.channelCount, timeout, errorCode);
        sample = Array.from(buffer);
        break;
      }
      case ChannelFormat.Double64: {
        const buffer = createDoubleArray(this.channelCount);
        timestamp = lsl_pull_sample_d(this.handle, buffer, this.channelCount, timeout, errorCode);
        sample = Array.from(buffer);
        break;
      }
      case ChannelFormat.Int32: {
        const buffer = createIntArray(this.channelCount);
        timestamp = lsl_pull_sample_i(this.handle, buffer, this.channelCount, timeout, errorCode);
        sample = Array.from(buffer);
        break;
      }
      case ChannelFormat.Int16: {
        const buffer = createShortArray(this.channelCount);
        timestamp = lsl_pull_sample_s(this.handle, buffer, this.channelCount, timeout, errorCode);
        sample = Array.from(buffer);
        break;
      }
      case ChannelFormat.Int8: {
        const buffer = createCharArray(this.channelCount);
        timestamp = lsl_pull_sample_c(this.handle, buffer, this.channelCount, timeout, errorCode);
        sample = Array.from(buffer);
        break;
      }
      case ChannelFormat.String: {
        // For string channels, we need to create a buffer of string pointers
        const stringBuffer = koffi.alloc('str', this.channelCount);
        timestamp = lsl_pull_sample_str(this.handle, stringBuffer, this.channelCount, timeout, errorCode);
        const stringSample: string[] = [];
        for (let i = 0; i < this.channelCount; i++) {
          const str = String(koffi.decode(stringBuffer, 'str', i) || '');
          stringSample.push(str);
        }
        sample = stringSample;
        break;
      }
      default:
        throw new Error(`Unsupported channel format: ${this.channelFormat}`);
    }

    const error = koffi.decode(errorCode, 'int32', 0);
    if (error === ErrorCode.TimeoutError || timestamp === 0.0) {
      return { sample: null, timestamp: 0 };
    }
    if (error === ErrorCode.LostError) {
      throw new LostError('Stream was lost during pull operation');
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
    const errorCode = koffi.alloc('int32', 1);
    const timestampBuffer = createDoubleArray(maxSamples);
    const bufferLength = maxSamples * this.channelCount;
    let samplesRetrieved: number;
    let flatData: number[] | string[];

    switch (this.channelFormat) {
      case ChannelFormat.Float32: {
        const dataBuffer = createFloatArray(bufferLength);
        samplesRetrieved = lsl_pull_chunk_f(
          this.handle,
          dataBuffer,
          timestampBuffer,
          bufferLength,
          maxSamples,
          timeout,
          errorCode
        );
        flatData = Array.from(dataBuffer);
        break;
      }
      case ChannelFormat.Double64: {
        const dataBuffer = createDoubleArray(bufferLength);
        samplesRetrieved = lsl_pull_chunk_d(
          this.handle,
          dataBuffer,
          timestampBuffer,
          bufferLength,
          maxSamples,
          timeout,
          errorCode
        );
        flatData = Array.from(dataBuffer);
        break;
      }
      case ChannelFormat.Int32: {
        const dataBuffer = createIntArray(bufferLength);
        samplesRetrieved = lsl_pull_chunk_i(
          this.handle,
          dataBuffer,
          timestampBuffer,
          bufferLength,
          maxSamples,
          timeout,
          errorCode
        );
        flatData = Array.from(dataBuffer);
        break;
      }
      case ChannelFormat.Int16: {
        const dataBuffer = createShortArray(bufferLength);
        samplesRetrieved = lsl_pull_chunk_s(
          this.handle,
          dataBuffer,
          timestampBuffer,
          bufferLength,
          maxSamples,
          timeout,
          errorCode
        );
        flatData = Array.from(dataBuffer);
        break;
      }
      case ChannelFormat.Int8: {
        const dataBuffer = createCharArray(bufferLength);
        samplesRetrieved = lsl_pull_chunk_c(
          this.handle,
          dataBuffer,
          timestampBuffer,
          bufferLength,
          maxSamples,
          timeout,
          errorCode
        );
        flatData = Array.from(dataBuffer);
        break;
      }
      case ChannelFormat.String: {
        // For string channels, allocate buffer for string pointers
        const stringBuffer = koffi.alloc('str', bufferLength);
        samplesRetrieved = lsl_pull_chunk_str(
          this.handle,
          stringBuffer,
          timestampBuffer,
          bufferLength,
          maxSamples,
          timeout,
          errorCode
        );
        const stringFlatData: string[] = [];
        for (let i = 0; i < bufferLength; i++) {
          const str = String(koffi.decode(stringBuffer, 'str', i) || '');
          stringFlatData.push(str);
        }
        flatData = stringFlatData;
        break;
      }
      default:
        throw new Error(`Unsupported channel format: ${this.channelFormat}`);
    }

    const error = koffi.decode(errorCode, 'int32', 0);
    if (error === ErrorCode.LostError) {
      throw new LostError('Stream was lost during chunk pull operation');
    }
    if (error < 0 && error !== ErrorCode.TimeoutError) {
      throw new Error(`Pull chunk error: ${error}`);
    }

    // Convert flat data to 2D array [sample][channel]
    const samples: (number[] | string[])[] = [];
    const timestamps: number[] = [];
    
    for (let s = 0; s < samplesRetrieved; s++) {
      if (this.channelFormat === ChannelFormat.String) {
        const sample: string[] = [];
        for (let c = 0; c < this.channelCount; c++) {
          sample.push(String((flatData as number[])[s * this.channelCount + c]));
        }
        samples.push(sample);
      } else {
        const sample: number[] = [];
        for (let c = 0; c < this.channelCount; c++) {
          sample.push((flatData as number[])[s * this.channelCount + c]);
        }
        samples.push(sample);
      }
      timestamps.push(timestampBuffer[s]);
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
    const errorCode = koffi.alloc('int32', 1);
    const correction = lsl_time_correction(this.handle, timeout, errorCode);
    
    const error = koffi.decode(errorCode, 'int32', 0);
    if (error === ErrorCode.TimeoutError) {
      throw new TimeoutError('Time correction timed out');
    }
    if (error === ErrorCode.LostError) {
      throw new LostError('Stream was lost during time correction');
    }
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
    const errorCode = koffi.alloc('int32', 1);
    const remoteTime = koffi.alloc('double', 1);
    const uncertainty = koffi.alloc('double', 1);
    
    const correction = lsl_time_correction_ex(
      this.handle,
      remoteTime,
      uncertainty,
      timeout,
      errorCode
    );
    
    const error = koffi.decode(errorCode, 'int32', 0);
    if (error === ErrorCode.TimeoutError) {
      throw new TimeoutError('Extended time correction timed out');
    }
    if (error === ErrorCode.LostError) {
      throw new LostError('Stream was lost during extended time correction');
    }
    if (error < 0) {
      throw new Error(`Time correction error: ${error}`);
    }
    
    return {
      correction,
      remoteTime: koffi.decode(remoteTime, 'double', 0),
      uncertainty: koffi.decode(uncertainty, 'double', 0),
    };
  }

  /**
   * Get the number of samples available
   */
  samplesAvailable(): number {
    return lsl_samples_available(this.handle);
  }

  /**
   * Flush the stream buffer
   * Removes all samples from the buffer that are older than the given timestamp
   */
  flush(): void {
    // Pull all available samples to flush the buffer
    while (this.samplesAvailable() > 0) {
      try {
        this.pullSample(0.0); // Non-blocking pull
      } catch (error) {
        // Stop if we get a timeout (no more samples)
        if (error instanceof TimeoutError) {
          break;
        }
        throw error;
      }
    }
  }

  /**
   * Check if the clock was reset
   */
  wasClockReset(): boolean {
    return lsl_was_clock_reset(this.handle) !== 0;
  }

  /**
   * Set the smoothing halftime
   * @param halftime Smoothing halftime in seconds
   * @returns Previous halftime value
   */
  smoothingHalftime(halftime?: number): number {
    return lsl_smoothing_halftime(this.handle, halftime || -1);
  }

  /**
   * Get full stream info
   * @param timeout Timeout in seconds
   * @returns Updated StreamInfo
   */
  getFullInfo(timeout = FOREVER): StreamInfo {
    const errorCode = koffi.alloc('int32', 1);
    const infoHandle = lsl_get_fullinfo(this.handle, timeout, errorCode);
    
    const error = koffi.decode(errorCode, 'int32', 0);
    if (error < 0) {
      throw new Error(`Get full info error: ${error}`);
    }
    
    return new StreamInfo(infoHandle);
  }

  /**
   * Get channel count from the stream info
   */
  getChannelCount(): number {
    return this.channelCount;
  }

  /**
   * Get the channel format from the stream info
   */
  getChannelFormat(): ChannelFormat {
    return this.channelFormat;
  }

  /**
   * Get the nominal sampling rate from the stream info
   */
  getNominalSrate(): number {
    return this.info.nominalSrate();
  }

  /**
   * Get the stream info object
   */
  getInfo(): StreamInfo {
    return this.info;
  }

  /**
   * Get the internal handle
   */
  getHandle(): any {
    return this.handle;
  }
}