import * as koffi from 'koffi';
import { 
  createDoubleArray,
  lsl_create_outlet,
  lsl_destroy_outlet,
  lsl_have_consumers,
  lsl_wait_for_consumers,
  lsl_get_info,
  fmt2PushSample,
  fmt2PushSampleTp,
  fmt2PushChunk,
  fmt2PushChunkTp,
  fmt2PushChunkTnp,
  fmt2ArrayCreator
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
  // Pre-computed function selections for efficient runtime calls
  private doPushSample: any;
  private doPushSampleTp: any;
  private doPushChunk: any;
  private doPushChunkTp: any;
  private doPushChunkTnp: any;
  private arrayCreator: any;

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

    // Pre-compute function selections based on channel format (like pylsl)
    this.doPushSample = fmt2PushSample[this.channelFormat];
    this.doPushSampleTp = fmt2PushSampleTp[this.channelFormat];
    this.doPushChunk = fmt2PushChunk[this.channelFormat];
    this.doPushChunkTp = fmt2PushChunkTp[this.channelFormat];
    this.doPushChunkTnp = fmt2PushChunkTnp[this.channelFormat];
    this.arrayCreator = fmt2ArrayCreator[this.channelFormat];

    if (!this.doPushSample) {
      throw new Error(`Unsupported channel format: ${this.channelFormat}`);
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

    if (this.channelFormat === ChannelFormat.String) {
      // Special handling for string channels
      const stringArray = koffi.alloc('str', this.channelCount);
      for (let i = 0; i < this.channelCount; i++) {
        const str = String(sample[i]);
        koffi.encode(stringArray, 'str', str, i);
      }
      if (timestamp === 0.0) {
        this.doPushSample(this.handle, stringArray);
      } else {
        this.doPushSampleTp(this.handle, stringArray, timestamp, pushthroughFlag);
      }
    } else {
      // Numeric channels - use pre-computed array creator and functions
      const data = this.arrayCreator(this.channelCount);
      for (let i = 0; i < this.channelCount; i++) {
        data[i] = sample[i] as number;
      }
      if (timestamp === 0.0) {
        this.doPushSample(this.handle, data);
      } else {
        this.doPushSampleTp(this.handle, data, timestamp, pushthroughFlag);
      }
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

    if (this.channelFormat === ChannelFormat.String) {
      // Special handling for string chunks
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
        this.doPushChunkTnp(this.handle, stringBuffer, numSamples, timestampBuffer, pushthroughFlag);
      } else if (timestamp === 0.0) {
        this.doPushChunk(this.handle, stringBuffer, numSamples);
      } else {
        this.doPushChunkTp(this.handle, stringBuffer, numSamples, timestamp, pushthroughFlag);
      }
    } else {
      // Numeric chunks - use pre-computed array creator and functions
      const buffer = this.arrayCreator(flatData.length);
      for (let i = 0; i < flatData.length; i++) {
        buffer[i] = flatData[i] as number;
      }
      
      if (Array.isArray(timestamp)) {
        const timestampBuffer = createDoubleArray(timestamp.length);
        for (let i = 0; i < timestamp.length; i++) {
          timestampBuffer[i] = timestamp[i];
        }
        this.doPushChunkTnp(this.handle, buffer, numSamples, timestampBuffer, pushthroughFlag);
      } else if (timestamp === 0.0) {
        this.doPushChunk(this.handle, buffer, numSamples);
      } else {
        this.doPushChunkTp(this.handle, buffer, numSamples, timestamp, pushthroughFlag);
      }
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