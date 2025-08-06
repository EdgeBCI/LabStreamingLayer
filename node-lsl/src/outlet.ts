import * as ref from 'ref-napi';
import RefArray from 'ref-array-napi';
import { lib, StreamOutletHandle, FloatArray, DoubleArray, IntArray, CharArray, StringArray } from './lib';
import { StreamInfo } from './streaminfo';
import { ChannelFormat, FOREVER } from './constants';

/**
 * StreamOutlet represents a stream outlet for sending data
 */
export class StreamOutlet {
  private handle: Buffer;
  private info: StreamInfo;
  private channelCount: number;
  private channelFormat: ChannelFormat;

  /**
   * Create a new StreamOutlet
   * @param info StreamInfo object describing the stream
   * @param chunkSize Desired chunk size (0 = no preference)
   * @param maxBuffered Maximum amount of data to buffer (in seconds if srate > 0, samples otherwise)
   */
  constructor(info: StreamInfo, chunkSize = 0, maxBuffered = 360) {
    this.info = info;
    this.channelCount = info.channelCount();
    this.channelFormat = info.channelFormat();
    
    this.handle = lib.lsl_create_outlet(info.getHandle(), chunkSize, maxBuffered);
    
    if (ref.isNull(this.handle)) {
      throw new Error('Failed to create stream outlet');
    }

    // Set up finalizer for automatic cleanup
    if (typeof FinalizationRegistry !== 'undefined') {
      const registry = new FinalizationRegistry((handle: Buffer) => {
        try {
          lib.lsl_destroy_outlet(handle);
        } catch (e) {
          // Ignore errors during cleanup
        }
      });
      registry.register(this, this.handle);
    }
  }

  /**
   * Destroy the outlet explicitly
   */
  destroy(): void {
    if (this.handle) {
      lib.lsl_destroy_outlet(this.handle);
    }
  }

  /**
   * Push a single sample
   * @param sample Array of values (one per channel)
   * @param timestamp LSL timestamp (0 = use current time)
   * @param pushthrough Whether to push through immediately
   */
  pushSample(sample: number[] | string[], timestamp = 0.0, pushthrough = true): void {
    if (sample.length !== this.channelCount) {
      throw new Error(`Sample size (${sample.length}) does not match channel count (${this.channelCount})`);
    }

    const pushthroughFlag = pushthrough ? 1 : 0;

    switch (this.channelFormat) {
      case ChannelFormat.Float32: {
        const FloatArrayType = RefArray(ref.types.float);
        const data = new FloatArrayType(sample as number[]);
        if (timestamp === 0.0) {
          lib.lsl_push_sample_f(this.handle, data.buffer);
        } else {
          lib.lsl_push_sample_ftp(this.handle, data.buffer, timestamp, pushthroughFlag);
        }
        break;
      }
      case ChannelFormat.Double64: {
        const DoubleArrayType = RefArray(ref.types.double);
        const data = new DoubleArrayType(sample as number[]);
        if (timestamp === 0.0) {
          lib.lsl_push_sample_d(this.handle, data.buffer);
        } else {
          lib.lsl_push_sample_dtp(this.handle, data.buffer, timestamp, pushthroughFlag);
        }
        break;
      }
      case ChannelFormat.Int32: {
        const IntArrayType = RefArray(ref.types.int32);
        const data = new IntArrayType(sample as number[]);
        if (timestamp === 0.0) {
          lib.lsl_push_sample_i(this.handle, data.buffer);
        } else {
          lib.lsl_push_sample_itp(this.handle, data.buffer, timestamp, pushthroughFlag);
        }
        break;
      }
      case ChannelFormat.Int16: {
        const ShortArrayType = RefArray(ref.types.int16);
        const data = new ShortArrayType(sample as number[]);
        if (timestamp === 0.0) {
          lib.lsl_push_sample_s(this.handle, data.buffer);
        } else {
          lib.lsl_push_sample_stp(this.handle, data.buffer, timestamp, pushthroughFlag);
        }
        break;
      }
      case ChannelFormat.Int8: {
        const CharArrayType = RefArray(ref.types.int8);
        const data = new CharArrayType(sample as number[]);
        if (timestamp === 0.0) {
          lib.lsl_push_sample_c(this.handle, data.buffer);
        } else {
          lib.lsl_push_sample_ctp(this.handle, data.buffer, timestamp, pushthroughFlag);
        }
        break;
      }
      case ChannelFormat.String: {
        const StringArrayType = RefArray(ref.types.CString);
        const data = new StringArrayType(sample as string[]);
        if (timestamp === 0.0) {
          lib.lsl_push_sample_str(this.handle, data.buffer);
        } else {
          lib.lsl_push_sample_strtp(this.handle, data.buffer, timestamp, pushthroughFlag);
        }
        break;
      }
      default:
        throw new Error(`Unsupported channel format: ${this.channelFormat}`);
    }
  }

  /**
   * Push a chunk of samples
   * @param samples 2D array of samples [sample][channel] or 1D array for single channel
   * @param timestamp Single timestamp or array of timestamps
   * @param pushthrough Whether to push through immediately
   */
  pushChunk(samples: number[][] | string[][] | number[] | string[], 
            timestamp: number | number[] = 0.0, 
            pushthrough = true): void {
    
    // Handle 1D array for single channel
    let data: number[][] | string[][];
    if (this.channelCount === 1 && samples.length > 0 && !Array.isArray(samples[0])) {
      // Convert 1D array to 2D for single channel
      data = (samples as (number | string)[]).map(s => [s]) as number[][] | string[][];
    } else {
      data = samples as number[][] | string[][];
    }

    if (data.length === 0) {
      return; // Nothing to push
    }

    // Validate channel count
    if (data[0].length !== this.channelCount) {
      throw new Error(`Sample size (${data[0].length}) does not match channel count (${this.channelCount})`);
    }

    const numSamples = data.length;
    const pushthroughFlag = pushthrough ? 1 : 0;

    // Flatten the 2D array to 1D (samples are interleaved by channel)
    const flatData: number[] | string[] = [];
    for (let s = 0; s < numSamples; s++) {
      for (let c = 0; c < this.channelCount; c++) {
        flatData.push(data[s][c]);
      }
    }

    switch (this.channelFormat) {
      case ChannelFormat.Float32: {
        const FloatArrayType = RefArray(ref.types.float);
        const buffer = new FloatArrayType(flatData as number[]);
        
        if (Array.isArray(timestamp)) {
          const DoubleArrayType = RefArray(ref.types.double);
          const timestampBuffer = new DoubleArrayType(timestamp);
          lib.lsl_push_chunk_ftnp(this.handle, buffer.buffer, numSamples, timestampBuffer.buffer, pushthroughFlag);
        } else if (timestamp === 0.0) {
          lib.lsl_push_chunk_f(this.handle, buffer.buffer, numSamples);
        } else {
          lib.lsl_push_chunk_ftp(this.handle, buffer.buffer, numSamples, timestamp, pushthroughFlag);
        }
        break;
      }
      case ChannelFormat.Double64: {
        const DoubleArrayType = RefArray(ref.types.double);
        const buffer = new DoubleArrayType(flatData as number[]);
        
        if (Array.isArray(timestamp)) {
          const timestampBuffer = new DoubleArrayType(timestamp);
          lib.lsl_push_chunk_dtnp(this.handle, buffer.buffer, numSamples, timestampBuffer.buffer, pushthroughFlag);
        } else if (timestamp === 0.0) {
          lib.lsl_push_chunk_d(this.handle, buffer.buffer, numSamples);
        } else {
          lib.lsl_push_chunk_dtp(this.handle, buffer.buffer, numSamples, timestamp, pushthroughFlag);
        }
        break;
      }
      case ChannelFormat.Int32: {
        const IntArrayType = RefArray(ref.types.int32);
        const buffer = new IntArrayType(flatData as number[]);
        
        if (Array.isArray(timestamp)) {
          const DoubleArrayType = RefArray(ref.types.double);
          const timestampBuffer = new DoubleArrayType(timestamp);
          lib.lsl_push_chunk_itnp(this.handle, buffer.buffer, numSamples, timestampBuffer.buffer, pushthroughFlag);
        } else if (timestamp === 0.0) {
          lib.lsl_push_chunk_i(this.handle, buffer.buffer, numSamples);
        } else {
          lib.lsl_push_chunk_itp(this.handle, buffer.buffer, numSamples, timestamp, pushthroughFlag);
        }
        break;
      }
      case ChannelFormat.Int16: {
        const ShortArrayType = RefArray(ref.types.int16);
        const buffer = new ShortArrayType(flatData as number[]);
        
        if (Array.isArray(timestamp)) {
          const DoubleArrayType = RefArray(ref.types.double);
          const timestampBuffer = new DoubleArrayType(timestamp);
          lib.lsl_push_chunk_stnp(this.handle, buffer.buffer, numSamples, timestampBuffer.buffer, pushthroughFlag);
        } else if (timestamp === 0.0) {
          lib.lsl_push_chunk_s(this.handle, buffer.buffer, numSamples);
        } else {
          lib.lsl_push_chunk_stp(this.handle, buffer.buffer, numSamples, timestamp, pushthroughFlag);
        }
        break;
      }
      case ChannelFormat.Int8: {
        const CharArrayType = RefArray(ref.types.int8);
        const buffer = new CharArrayType(flatData as number[]);
        
        if (Array.isArray(timestamp)) {
          const DoubleArrayType = RefArray(ref.types.double);
          const timestampBuffer = new DoubleArrayType(timestamp);
          lib.lsl_push_chunk_ctnp(this.handle, buffer.buffer, numSamples, timestampBuffer.buffer, pushthroughFlag);
        } else if (timestamp === 0.0) {
          lib.lsl_push_chunk_c(this.handle, buffer.buffer, numSamples);
        } else {
          lib.lsl_push_chunk_ctp(this.handle, buffer.buffer, numSamples, timestamp, pushthroughFlag);
        }
        break;
      }
      case ChannelFormat.String: {
        const StringArrayType = RefArray(ref.types.CString);
        const buffer = new StringArrayType(flatData as string[]);
        
        if (Array.isArray(timestamp)) {
          const DoubleArrayType = RefArray(ref.types.double);
          const timestampBuffer = new DoubleArrayType(timestamp);
          lib.lsl_push_chunk_strtnp(this.handle, buffer.buffer, numSamples, timestampBuffer.buffer, pushthroughFlag);
        } else if (timestamp === 0.0) {
          lib.lsl_push_chunk_str(this.handle, buffer.buffer, numSamples);
        } else {
          lib.lsl_push_chunk_strtp(this.handle, buffer.buffer, numSamples, timestamp, pushthroughFlag);
        }
        break;
      }
      default:
        throw new Error(`Unsupported channel format: ${this.channelFormat}`);
    }
  }

  /**
   * Check if there are consumers connected
   */
  haveConsumers(): boolean {
    return lib.lsl_have_consumers(this.handle) !== 0;
  }

  /**
   * Wait for consumers to connect
   * @param timeout Timeout in seconds (FOREVER = wait indefinitely)
   */
  waitForConsumers(timeout = FOREVER): boolean {
    return lib.lsl_wait_for_consumers(this.handle, timeout) !== 0;
  }

  /**
   * Get the StreamInfo for this outlet
   */
  getInfo(): StreamInfo {
    const infoHandle = lib.lsl_get_info(this.handle);
    return new StreamInfo(infoHandle);
  }

  /**
   * Get the internal handle
   */
  getHandle(): Buffer {
    return this.handle;
  }
}