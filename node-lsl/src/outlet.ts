import * as koffi from 'koffi';
import { 
  createFloatArray, 
  createDoubleArray, 
  createIntArray, 
  createShortArray, 
  createCharArray,
  lsl_create_outlet,
  lsl_destroy_outlet,
  lsl_push_sample_f,
  lsl_push_sample_ftp,
  lsl_push_sample_d,
  lsl_push_sample_dtp,
  lsl_push_sample_i,
  lsl_push_sample_itp,
  lsl_push_sample_s,
  lsl_push_sample_stp,
  lsl_push_sample_c,
  lsl_push_sample_ctp,
  lsl_push_sample_str,
  lsl_push_sample_strtp,
  lsl_push_chunk_f,
  lsl_push_chunk_ftp,
  lsl_push_chunk_ftnp,
  lsl_push_chunk_d,
  lsl_push_chunk_dtp,
  lsl_push_chunk_dtnp,
  lsl_push_chunk_i,
  lsl_push_chunk_itp,
  lsl_push_chunk_itnp,
  lsl_push_chunk_s,
  lsl_push_chunk_stp,
  lsl_push_chunk_stnp,
  lsl_push_chunk_c,
  lsl_push_chunk_ctp,
  lsl_push_chunk_ctnp,
  lsl_push_chunk_str,
  lsl_push_chunk_strtp,
  lsl_push_chunk_strtnp,
  lsl_have_consumers,
  lsl_wait_for_consumers,
  lsl_get_info
} from './lib';
import { StreamInfo } from './streaminfo';
import { ChannelFormat, FOREVER } from './constants';

/**
 * StreamOutlet represents a stream outlet for sending data
 */
export class StreamOutlet {
  private handle: any; // koffi pointer
  private channelCount: number;
  private channelFormat: ChannelFormat;

  /**
   * Create a new StreamOutlet
   * @param info StreamInfo object describing the stream
   * @param chunkSize Desired chunk size (0 = no preference)
   * @param maxBuffered Maximum amount of data to buffer (in seconds if srate > 0, samples otherwise)
   */
  constructor(info: StreamInfo, chunkSize = 0, maxBuffered = 360) {
    this.channelCount = info.channelCount();
    this.channelFormat = info.channelFormat();
    
    this.handle = lsl_create_outlet(info.getHandle(), chunkSize, maxBuffered);
    
    if (!this.handle) {
      throw new Error('Failed to create stream outlet');
    }

    // Set up finalizer for automatic cleanup
    if (typeof FinalizationRegistry !== 'undefined') {
      const registry = new FinalizationRegistry((handle: any) => {
        try {
          lsl_destroy_outlet(handle);
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
      lsl_destroy_outlet(this.handle);
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
        const data = createFloatArray(this.channelCount);
        for (let i = 0; i < this.channelCount; i++) {
          data[i] = sample[i] as number;
        }
        if (timestamp === 0.0) {
          lsl_push_sample_f(this.handle, data);
        } else {
          lsl_push_sample_ftp(this.handle, data, timestamp, pushthroughFlag);
        }
        break;
      }
      case ChannelFormat.Double64: {
        const data = createDoubleArray(this.channelCount);
        for (let i = 0; i < this.channelCount; i++) {
          data[i] = sample[i] as number;
        }
        if (timestamp === 0.0) {
          lsl_push_sample_d(this.handle, data);
        } else {
          lsl_push_sample_dtp(this.handle, data, timestamp, pushthroughFlag);
        }
        break;
      }
      case ChannelFormat.Int32: {
        const data = createIntArray(this.channelCount);
        for (let i = 0; i < this.channelCount; i++) {
          data[i] = sample[i] as number;
        }
        if (timestamp === 0.0) {
          lsl_push_sample_i(this.handle, data);
        } else {
          lsl_push_sample_itp(this.handle, data, timestamp, pushthroughFlag);
        }
        break;
      }
      case ChannelFormat.Int16: {
        const data = createShortArray(this.channelCount);
        for (let i = 0; i < this.channelCount; i++) {
          data[i] = sample[i] as number;
        }
        if (timestamp === 0.0) {
          lsl_push_sample_s(this.handle, data);
        } else {
          lsl_push_sample_stp(this.handle, data, timestamp, pushthroughFlag);
        }
        break;
      }
      case ChannelFormat.Int8: {
        const data = createCharArray(this.channelCount);
        for (let i = 0; i < this.channelCount; i++) {
          data[i] = sample[i] as number;
        }
        if (timestamp === 0.0) {
          lsl_push_sample_c(this.handle, data);
        } else {
          lsl_push_sample_ctp(this.handle, data, timestamp, pushthroughFlag);
        }
        break;
      }
      case ChannelFormat.String: {
        // For string channels, we need to handle string arrays properly
        const stringArray = koffi.alloc('str', this.channelCount);
        for (let i = 0; i < this.channelCount; i++) {
          // Ensure we have string data
          const str = String(sample[i]);
          koffi.encode(stringArray, 'str', str, i);
        }
        if (timestamp === 0.0) {
          lsl_push_sample_str(this.handle, stringArray);
        } else {
          lsl_push_sample_strtp(this.handle, stringArray, timestamp, pushthroughFlag);
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
    const flatData: (number | string)[] = [];
    for (let s = 0; s < numSamples; s++) {
      for (let c = 0; c < this.channelCount; c++) {
        flatData.push(data[s][c]);
      }
    }

    switch (this.channelFormat) {
      case ChannelFormat.Float32: {
        const buffer = createFloatArray(flatData.length);
        for (let i = 0; i < flatData.length; i++) {
          buffer[i] = flatData[i] as number;
        }
        
        if (Array.isArray(timestamp)) {
          const timestampBuffer = createDoubleArray(timestamp.length);
          for (let i = 0; i < timestamp.length; i++) {
            timestampBuffer[i] = timestamp[i];
          }
          lsl_push_chunk_ftnp(this.handle, buffer, numSamples, timestampBuffer, pushthroughFlag);
        } else if (timestamp === 0.0) {
          lsl_push_chunk_f(this.handle, buffer, numSamples);
        } else {
          lsl_push_chunk_ftp(this.handle, buffer, numSamples, timestamp, pushthroughFlag);
        }
        break;
      }
      case ChannelFormat.Double64: {
        const buffer = createDoubleArray(flatData.length);
        for (let i = 0; i < flatData.length; i++) {
          buffer[i] = flatData[i] as number;
        }
        
        if (Array.isArray(timestamp)) {
          const timestampBuffer = createDoubleArray(timestamp.length);
          for (let i = 0; i < timestamp.length; i++) {
            timestampBuffer[i] = timestamp[i];
          }
          lsl_push_chunk_dtnp(this.handle, buffer, numSamples, timestampBuffer, pushthroughFlag);
        } else if (timestamp === 0.0) {
          lsl_push_chunk_d(this.handle, buffer, numSamples);
        } else {
          lsl_push_chunk_dtp(this.handle, buffer, numSamples, timestamp, pushthroughFlag);
        }
        break;
      }
      case ChannelFormat.Int32: {
        const buffer = createIntArray(flatData.length);
        for (let i = 0; i < flatData.length; i++) {
          buffer[i] = flatData[i] as number;
        }
        
        if (Array.isArray(timestamp)) {
          const timestampBuffer = createDoubleArray(timestamp.length);
          for (let i = 0; i < timestamp.length; i++) {
            timestampBuffer[i] = timestamp[i];
          }
          lsl_push_chunk_itnp(this.handle, buffer, numSamples, timestampBuffer, pushthroughFlag);
        } else if (timestamp === 0.0) {
          lsl_push_chunk_i(this.handle, buffer, numSamples);
        } else {
          lsl_push_chunk_itp(this.handle, buffer, numSamples, timestamp, pushthroughFlag);
        }
        break;
      }
      case ChannelFormat.Int16: {
        const buffer = createShortArray(flatData.length);
        for (let i = 0; i < flatData.length; i++) {
          buffer[i] = flatData[i] as number;
        }
        
        if (Array.isArray(timestamp)) {
          const timestampBuffer = createDoubleArray(timestamp.length);
          for (let i = 0; i < timestamp.length; i++) {
            timestampBuffer[i] = timestamp[i];
          }
          lsl_push_chunk_stnp(this.handle, buffer, numSamples, timestampBuffer, pushthroughFlag);
        } else if (timestamp === 0.0) {
          lsl_push_chunk_s(this.handle, buffer, numSamples);
        } else {
          lsl_push_chunk_stp(this.handle, buffer, numSamples, timestamp, pushthroughFlag);
        }
        break;
      }
      case ChannelFormat.Int8: {
        const buffer = createCharArray(flatData.length);
        for (let i = 0; i < flatData.length; i++) {
          buffer[i] = flatData[i] as number;
        }
        
        if (Array.isArray(timestamp)) {
          const timestampBuffer = createDoubleArray(timestamp.length);
          for (let i = 0; i < timestamp.length; i++) {
            timestampBuffer[i] = timestamp[i];
          }
          lsl_push_chunk_ctnp(this.handle, buffer, numSamples, timestampBuffer, pushthroughFlag);
        } else if (timestamp === 0.0) {
          lsl_push_chunk_c(this.handle, buffer, numSamples);
        } else {
          lsl_push_chunk_ctp(this.handle, buffer, numSamples, timestamp, pushthroughFlag);
        }
        break;
      }
      case ChannelFormat.String: {
        // For string chunks, we need to handle array of string pointers
        const stringBuffer = koffi.alloc('str', flatData.length);
        for (let i = 0; i < flatData.length; i++) {
          const str = String(flatData[i]);
          koffi.encode(stringBuffer, 'str', str, i);
        }
        
        if (Array.isArray(timestamp)) {
          const timestampBuffer = createDoubleArray(timestamp.length);
          for (let i = 0; i < timestamp.length; i++) {
            timestampBuffer[i] = timestamp[i];
          }
          lsl_push_chunk_strtnp(this.handle, stringBuffer, numSamples, timestampBuffer, pushthroughFlag);
        } else if (timestamp === 0.0) {
          lsl_push_chunk_str(this.handle, stringBuffer, numSamples);
        } else {
          lsl_push_chunk_strtp(this.handle, stringBuffer, numSamples, timestamp, pushthroughFlag);
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
    return lsl_have_consumers(this.handle) !== 0;
  }

  /**
   * Wait for consumers to connect
   * @param timeout Timeout in seconds (FOREVER = wait indefinitely)
   */
  waitForConsumers(timeout = FOREVER): boolean {
    return lsl_wait_for_consumers(this.handle, timeout) !== 0;
  }

  /**
   * Get the StreamInfo for this outlet
   */
  getInfo(): StreamInfo {
    const infoHandle = lsl_get_info(this.handle);
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
   * Get the internal handle
   */
  getHandle(): any {
    return this.handle;
  }
}