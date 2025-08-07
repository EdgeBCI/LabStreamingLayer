import koffi from 'koffi';
import {
  lsl_create_outlet,
  lsl_destroy_outlet,
  lsl_have_consumers,
  lsl_wait_for_consumers,
  lsl_get_info,
  fmt2push_sample,
  fmt2push_chunk,
  fmt2push_chunk_n,
  cf_string
} from './lib/index.js';
import { StreamInfo } from './streamInfo.js';
import { handleError } from './util.js';

export class StreamOutlet {
  private obj: any; // Pointer to the LSL outlet object
  private channelFormat: number;
  private channelCount: number;
  private doPushSample: any;
  private doPushChunk: any;
  private doPushChunkN: any;
  
  constructor(info: StreamInfo, chunkSize: number = 0, maxBuffered: number = 360) {
    // Create the outlet
    this.obj = lsl_create_outlet(info.getHandle(), chunkSize, maxBuffered);
    
    if (!this.obj) {
      throw new Error('Could not create stream outlet.');
    }
    
    // Store stream properties for efficient pushing
    this.channelFormat = info.channelFormat();
    this.channelCount = info.channelCount();
    
    // Get the appropriate push functions for this data type
    this.doPushSample = fmt2push_sample[this.channelFormat];
    this.doPushChunk = fmt2push_chunk[this.channelFormat];
    this.doPushChunkN = fmt2push_chunk_n[this.channelFormat];
    
    if (!this.doPushSample) {
      throw new Error(`Unsupported channel format: ${this.channelFormat}`);
    }
  }
  
  // Destructor
  destroy(): void {
    if (this.obj) {
      try {
        lsl_destroy_outlet(this.obj);
      } catch (e) {
        console.error('StreamOutlet deletion triggered error:', e);
      }
      this.obj = null;
    }
  }
  
  pushSample(x: any[], timestamp: number = 0.0, pushthrough: boolean = true): void {
    if (x.length !== this.channelCount) {
      throw new Error(
        `Length of the sample (${x.length}) must correspond to the stream's channel count (${this.channelCount}).`
      );
    }
    
    // Convert the sample to appropriate format
    let sample: any;
    
    if (this.channelFormat === cf_string) {
      // For string channels, we need a string array
      sample = x.map(v => String(v));
      
      // For strings, pass the array directly
      sample = sample;
    } else {
      // For numeric channels, create appropriate typed array
      let TypedArray: any;
      switch (this.channelFormat) {
        case 1: // cf_float32
          TypedArray = Float32Array;
          break;
        case 2: // cf_double64
          TypedArray = Float64Array;
          break;
        case 4: // cf_int32
          TypedArray = Int32Array;
          break;
        case 5: // cf_int16
          TypedArray = Int16Array;
          break;
        case 6: // cf_int8
          TypedArray = Int8Array;
          break;
        default:
          throw new Error(`Unsupported channel format: ${this.channelFormat}`);
      }
      sample = new TypedArray(x);
    }
    
    // Push the sample
    const result = this.doPushSample(
      this.obj,
      sample,
      timestamp,
      pushthrough ? 1 : 0
    );
    
    handleError(result);
  }
  
  pushChunk(x: any[] | any[][], timestamp: number | number[] = 0.0, pushthrough: boolean = true): void {
    // Determine if we have a single timestamp or array of timestamps
    const hasMultipleTimestamps = Array.isArray(timestamp);
    const pushFunc = hasMultipleTimestamps ? this.doPushChunkN : this.doPushChunk;
    
    // Flatten the data if it's a 2D array
    let flatData: any[];
    let numSamples: number;
    
    if (x.length === 0) {
      return; // Don't send empty chunks
    }
    
    if (Array.isArray(x[0])) {
      // 2D array: array of samples
      numSamples = x.length;
      flatData = [];
      for (const sample of x) {
        if ((sample as any[]).length !== this.channelCount) {
          throw new Error(
            `Each sample must have the same number of channels (${this.channelCount}).`
          );
        }
        flatData.push(...(sample as any[]));
      }
    } else {
      // 1D array: flattened data
      flatData = x as any[];
      if (flatData.length % this.channelCount !== 0) {
        throw new Error(
          `Data length must be a multiple of channel count (${this.channelCount}).`
        );
      }
      numSamples = flatData.length / this.channelCount;
    }
    
    // Validate timestamp array length if multiple timestamps
    if (hasMultipleTimestamps && (timestamp as number[]).length !== numSamples) {
      throw new Error(
        `Timestamp array length (${(timestamp as number[]).length}) must match number of samples (${numSamples}).`
      );
    }
    
    // Convert the data to appropriate format
    let dataBuffer: any;
    
    if (this.channelFormat === cf_string) {
      // For string channels, create string pointer array
      const strings = flatData.map(v => String(v));
      dataBuffer = strings;
    } else {
      // For numeric channels, create appropriate typed array
      let TypedArray: any;
      switch (this.channelFormat) {
        case 1: // cf_float32
          TypedArray = Float32Array;
          break;
        case 2: // cf_double64
          TypedArray = Float64Array;
          break;
        case 4: // cf_int32
          TypedArray = Int32Array;
          break;
        case 5: // cf_int16
          TypedArray = Int16Array;
          break;
        case 6: // cf_int8
          TypedArray = Int8Array;
          break;
        default:
          throw new Error(`Unsupported channel format: ${this.channelFormat}`);
      }
      dataBuffer = new TypedArray(flatData);
    }
    
    // Prepare timestamp parameter
    let timestampParam: any;
    if (hasMultipleTimestamps) {
      timestampParam = new Float64Array(timestamp as number[]);
    } else {
      timestampParam = timestamp as number;
    }
    
    // Push the chunk
    const result = pushFunc(
      this.obj,
      dataBuffer,
      flatData.length,
      timestampParam,
      pushthrough ? 1 : 0
    );
    
    handleError(result);
  }
  
  haveConsumers(): boolean {
    return Boolean(lsl_have_consumers(this.obj));
  }
  
  waitForConsumers(timeout: number): boolean {
    return Boolean(lsl_wait_for_consumers(this.obj, timeout));
  }
  
  getInfo(): StreamInfo {
    const infoHandle = lsl_get_info(this.obj);
    return new StreamInfo('', '', 0, 0, 0, '', infoHandle);
  }
}