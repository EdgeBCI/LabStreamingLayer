import koffi from 'koffi';
import {
  lsl_create_inlet,
  lsl_destroy_inlet,
  lsl_get_fullinfo,
  lsl_open_stream,
  lsl_close_stream,
  lsl_time_correction,
  lsl_set_postprocessing,
  lsl_samples_available,
  lsl_inlet_flush,
  lsl_was_clock_reset,
  fmt2pull_sample,
  fmt2pull_chunk,
  cf_string,
  lsl_destroy_string
} from './lib/index.js';
import { StreamInfo } from './streamInfo.js';
import { handleError, FOREVER, InvalidArgumentError } from './util.js';

// FinalizationRegistry for automatic cleanup
const inletRegistry = new FinalizationRegistry((obj: any) => {
  try {
    lsl_destroy_inlet(obj);
  } catch (e) {
    // Silently ignore cleanup errors
  }
});

/**
 * A stream inlet receives streaming data from the network.
 * Inlets are used to receive data from a specific stream.
 */
export class StreamInlet {
  private obj: any; // Pointer to the LSL inlet object
  private channelFormat: number;
  private channelCount: number;
  private doPullSample: any;
  private doPullChunk: any;
  private sampleBuffer: any; // Reusable buffer for pulling samples
  private chunkBuffers: Map<number, { data: any, timestamps: Float64Array }>; // Reusable buffers for pulling chunks
  
  constructor(
    info: StreamInfo,
    maxBuflen: number = 360,
    maxChunklen: number = 0,
    recover: boolean = true,
    processingFlags: number = 0
  ) {
    // Validate info parameter
    if (Array.isArray(info)) {
      throw new TypeError('Description needs to be of type StreamInfo, got a list.');
    }
    
    // Create the inlet
    this.obj = lsl_create_inlet(
      info.getHandle(),
      maxBuflen,
      maxChunklen,
      recover ? 1 : 0
    );
    
    if (!this.obj) {
      throw new Error('Could not create stream inlet.');
    }
    
    // Register for automatic cleanup
    inletRegistry.register(this, this.obj, this);
    
    // Set post-processing flags if specified
    if (processingFlags > 0) {
      const result = lsl_set_postprocessing(this.obj, processingFlags);
      handleError(result);
    }
    
    // Store stream properties for efficient pulling
    this.channelFormat = info.channelFormat();
    this.channelCount = info.channelCount();
    
    // Get the appropriate pull functions for this data type
    this.doPullSample = fmt2pull_sample[this.channelFormat];
    this.doPullChunk = fmt2pull_chunk[this.channelFormat];
    
    if (!this.doPullSample) {
      throw new Error(`Unsupported channel format: ${this.channelFormat}`);
    }
    
    // Create reusable sample buffer
    this._createSampleBuffer();
    
    // Initialize chunk buffer cache
    this.chunkBuffers = new Map();
  }
  
  private _createSampleBuffer(): void {
    if (this.channelFormat === cf_string) {
      // For strings, we need an array of string pointers
      this.sampleBuffer = new Array(this.channelCount).fill('');
    } else {
      // For numeric types, create appropriate typed array
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
      this.sampleBuffer = new TypedArray(this.channelCount);
    }
  }
  
  /**
   * Destroy the inlet and free resources.
   * Called automatically when the object is garbage collected.
   */
  destroy(): void {
    if (this.obj) {
      try {
        inletRegistry.unregister(this);
        lsl_destroy_inlet(this.obj);
      } catch (e) {
        // Silently ignore errors during destruction
      }
      this.obj = null;
    }
  }
  
  info(timeout: number = FOREVER): StreamInfo {
    const errcode = [0];
    const result = lsl_get_fullinfo(this.obj, timeout, errcode);
    handleError(errcode[0]);
    return new StreamInfo('', '', 0, 0, 0, '', result);
  }
  
  openStream(timeout: number = FOREVER): void {
    const errcode = [0];
    lsl_open_stream(this.obj, timeout, errcode);
    handleError(errcode[0]);
  }
  
  closeStream(): void {
    lsl_close_stream(this.obj);
  }
  
  timeCorrection(timeout: number = FOREVER): number {
    const errcode = [0];
    const result = lsl_time_correction(this.obj, timeout, errcode);
    handleError(errcode[0]);
    return result;
  }
  
  /**
   * Pull a single sample from the inlet.
   * @param timeout Timeout in seconds (default: FOREVER)
   * @param sample Optional array to fill with sample data
   * @returns Tuple of [sample, timestamp] or [null, null] if no sample available
   */
  pullSample(timeout: number = FOREVER, sample?: any): [any[], number] | [null, null] {
    // Input validation
    if (typeof timeout !== 'number' || timeout < 0) {
      throw new InvalidArgumentError('Timeout must be a non-negative number');
    }
    const errcode = [0];
    
    // Pull the sample
    const timestamp = this.doPullSample(
      this.obj,
      this.sampleBuffer,
      this.channelCount,
      timeout,
      errcode
    );
    
    handleError(errcode[0]);
    
    if (timestamp) {
      // Convert buffer to JavaScript array
      let sampleArray: any[];
      
      if (this.channelFormat === cf_string) {
        // For strings, decode from buffer
        sampleArray = [];
        for (let i = 0; i < this.channelCount; i++) {
          sampleArray.push(this.sampleBuffer[i]);
        }
      } else {
        // For numeric types, convert from typed array
        sampleArray = Array.from(this.sampleBuffer);
      }
      
      // If sample parameter was provided (legacy API), copy to it
      if (sample && Array.isArray(sample)) {
        sample.length = 0;
        sample.push(...sampleArray);
      }
      
      return [sampleArray, timestamp];
    } else {
      return [null, null];
    }
  }
  
  /**
   * Pull a chunk of samples from the inlet.
   * @param timeout Timeout in seconds (default: 0)
   * @param maxSamples Maximum number of samples to pull
   * @param destObj Optional destination buffer
   * @returns Tuple of [samples, timestamps]
   */
  pullChunk(
    timeout: number = 0.0,
    maxSamples: number = 1024,
    destObj?: any
  ): [any[][] | null, number[]] {
    // Input validation
    if (typeof timeout !== 'number' || timeout < 0) {
      throw new InvalidArgumentError('Timeout must be a non-negative number');
    }
    if (typeof maxSamples !== 'number' || maxSamples <= 0) {
      throw new InvalidArgumentError('maxSamples must be a positive number');
    }
    // Get or create reusable buffers for this size
    const maxValues = maxSamples * this.channelCount;
    
    if (!this.chunkBuffers.has(maxSamples)) {
      // Create new buffers for this size
      let dataBuffer: any;
      
      if (this.channelFormat === cf_string) {
        // For strings, array of string pointers
        dataBuffer = new Array(maxValues).fill('');
      } else {
        // For numeric types
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
        dataBuffer = destObj ? new TypedArray(destObj) : new TypedArray(maxValues);
      }
      
      const timestampBuffer = new Float64Array(maxSamples);
      
      this.chunkBuffers.set(maxSamples, {
        data: dataBuffer,
        timestamps: timestampBuffer
      });
    }
    
    const buffers = this.chunkBuffers.get(maxSamples)!;
    const dataBuffer = destObj || buffers.data;
    const timestampBuffer = buffers.timestamps;
    
    // Pull the chunk
    const errcode = [0];
    const numElements = this.doPullChunk(
      this.obj,
      dataBuffer,
      timestampBuffer,
      maxValues,
      maxSamples,
      timeout,
      errcode
    );
    
    handleError(errcode[0]);
    
    const numSamplesPulled = Math.floor(numElements / this.channelCount);
    
    // Convert to output format
    let samples: any[][] | null = null;
    
    if (destObj === undefined && numSamplesPulled > 0) {
      samples = [];
      
      if (this.channelFormat === cf_string) {
        // For strings
        for (let s = 0; s < numSamplesPulled; s++) {
          const sample: string[] = [];
          for (let c = 0; c < this.channelCount; c++) {
            sample.push(dataBuffer[s * this.channelCount + c]);
          }
          samples.push(sample);
        }
        
        // Free string memory if needed
        for (let i = 0; i < numElements; i++) {
          if (dataBuffer[i]) {
            // Note: Koffi should handle string memory automatically
          }
        }
      } else {
        // For numeric types
        for (let s = 0; s < numSamplesPulled; s++) {
          const sample: number[] = [];
          for (let c = 0; c < this.channelCount; c++) {
            sample.push(dataBuffer[s * this.channelCount + c]);
          }
          samples.push(sample);
        }
      }
    }
    
    // Extract timestamps
    const timestamps: number[] = [];
    for (let i = 0; i < numSamplesPulled; i++) {
      timestamps.push(timestampBuffer[i]);
    }
    
    return [samples, timestamps];
  }
  
  samplesAvailable(): number {
    return lsl_samples_available(this.obj);
  }
  
  flush(): number {
    return lsl_inlet_flush(this.obj);
  }
  
  wasClockReset(): boolean {
    return Boolean(lsl_was_clock_reset(this.obj));
  }
}