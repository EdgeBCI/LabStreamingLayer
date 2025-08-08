/**
 * @fileoverview StreamOutlet class for broadcasting data streams.
 * 
 * This module provides the StreamOutlet class which broadcasts data samples
 * to the network. Outlets are the data sources in LSL - they push samples
 * that can be received by any number of StreamInlets.
 * 
 * @module outlet
 * @see {@link https://labstreaminglayer.readthedocs.io/} - LSL Documentation
 */

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

/**
 * FinalizationRegistry for automatic cleanup of StreamOutlet objects.
 * Ensures the underlying C outlet is properly destroyed when the JavaScript
 * object is garbage collected, preventing resource leaks.
 * 
 * @private
 */
const outletRegistry = new FinalizationRegistry((obj: any) => {
  try {
    lsl_destroy_outlet(obj);
  } catch (e) {
    // Silently ignore cleanup errors - outlet may already be destroyed
  }
});

/**
 * A stream outlet broadcasts data samples to the network.
 * 
 * StreamOutlet is the data source in LSL. It pushes samples containing
 * measurement data or event markers to the network where they can be
 * received by any number of StreamInlets.
 * 
 * Key features:
 * - Automatic buffering with configurable size
 * - Support for all LSL data types
 * - Optional pushthrough mode for low latency
 * - Chunk transmission for efficiency
 * - Consumer detection
 * 
 * @example
 * ```typescript
 * // Create an EEG data outlet
 * const info = new StreamInfo('BioSemi', 'EEG', 32, 256, 'float32');
 * const outlet = new StreamOutlet(info);
 * 
 * // Push samples at regular intervals
 * setInterval(() => {
 *   const sample = generateEEGData(); // 32 channels
 *   outlet.pushSample(sample);
 * }, 1000/256); // 256 Hz
 * ```
 * 
 * @class
 */
export class StreamOutlet {
  /** Pointer to the underlying LSL outlet C object */
  private obj: any;
  
  /** Numeric channel format constant for type checking */
  private channelFormat: number;
  
  /** Number of channels for validation */
  private channelCount: number;
  
  /** Function pointer for pushing single samples */
  private doPushSample: any;
  
  /** Function pointer for pushing chunks (single timestamp) */
  private doPushChunk: any;
  
  /** Function pointer for pushing chunks (multiple timestamps) */
  private doPushChunkN: any;
  
  /**
   * Creates a new StreamOutlet.
   * 
   * @param {StreamInfo} info - Stream metadata object describing the stream
   * @param {number} chunkSize - Preferred chunk size for transmission (0 = no chunking)
   *                              Samples are buffered until this size is reached.
   * @param {number} maxBuffered - Maximum amount of data to buffer in seconds (default: 360)
   *                               Older samples are dropped if buffer is full.
   * 
   * @throws {Error} If outlet creation fails or channel format is unsupported
   * 
   * @example
   * ```typescript
   * const outlet = new StreamOutlet(info, 0, 360); // No chunking, 6 min buffer
   * const outlet = new StreamOutlet(info, 128, 10); // 128-sample chunks, 10s buffer
   * ```
   */
  constructor(info: StreamInfo, chunkSize: number = 0, maxBuffered: number = 360) {
    // Create the LSL outlet C object
    this.obj = lsl_create_outlet(info.getHandle(), chunkSize, maxBuffered);
    
    if (!this.obj) {
      throw new Error('Could not create stream outlet.');
    }
    
    // Register for automatic cleanup
    outletRegistry.register(this, this.obj, this);
    
    // Cache stream properties to avoid repeated lookups
    this.channelFormat = info.channelFormat();
    this.channelCount = info.channelCount();
    
    // Select type-specific push functions based on channel format
    // This avoids runtime type checking on every push operation
    this.doPushSample = fmt2push_sample[this.channelFormat];
    this.doPushChunk = fmt2push_chunk[this.channelFormat];
    this.doPushChunkN = fmt2push_chunk_n[this.channelFormat];
    
    if (!this.doPushSample) {
      throw new Error(`Unsupported channel format: ${this.channelFormat}`);
    }
  }
  
  /**
   * Destroy the outlet and free resources.
   * Called automatically when the object is garbage collected.
   */
  destroy(): void {
    if (this.obj) {
      try {
        outletRegistry.unregister(this);
        lsl_destroy_outlet(this.obj);
      } catch (e) {
        console.error('StreamOutlet deletion triggered error:', e);
      }
      this.obj = null;
    }
  }
  
  /**
   * Push a single sample into the outlet.
   * @param x Array of channel values
   * @param timestamp Optional timestamp (0 = use current LSL time)
   * @param pushthrough Whether to push through network buffers
   */
  pushSample(x: any[], timestamp: number = 0.0, pushthrough: boolean = true): void {
    // Input validation
    if (!Array.isArray(x)) {
      throw new TypeError('Sample must be an array');
    }
    if (x.length !== this.channelCount) {
      throw new Error(
        `Length of the sample (${x.length}) must correspond to the stream's channel count (${this.channelCount}).`
      );
    }
    
    // Convert the sample to appropriate format
    let sample: any;
    
    if (this.channelFormat === cf_string) {
      // For string channels, ensure all values are strings
      sample = x.map(v => String(v));
      
      // String arrays are passed directly to the C function
      // (Koffi handles the string marshalling)
    } else {
      // For numeric channels, create appropriate typed array for efficiency
      // TypedArrays provide direct memory access without conversion overhead
      let TypedArray: any;
      switch (this.channelFormat) {
        case 1: // cf_float32 - 32-bit floating point
          TypedArray = Float32Array;
          break;
        case 2: // cf_double64 - 64-bit floating point
          TypedArray = Float64Array;
          break;
        case 4: // cf_int32 - 32-bit signed integer
          TypedArray = Int32Array;
          break;
        case 5: // cf_int16 - 16-bit signed integer
          TypedArray = Int16Array;
          break;
        case 6: // cf_int8 - 8-bit signed integer
          TypedArray = Int8Array;
          break;
        case 7: // cf_int64 - 64-bit signed integer
          TypedArray = BigInt64Array;
          break;
        default:
          throw new Error(`Unsupported channel format: ${this.channelFormat}`);
      }
      sample = new TypedArray(x);
    }
    
    // Push the sample to the outlet
    const result = this.doPushSample(
      this.obj,
      sample,
      timestamp,        // 0 = use current LSL time
      pushthrough ? 1 : 0  // 1 = bypass network buffering for low latency
    );
    
    // Check for errors (timeout, lost connection, etc.)
    handleError(result);
  }
  
  /**
   * Push a chunk of samples into the outlet.
   * @param x 2D array of samples or flattened array
   * @param timestamp Single timestamp or array of timestamps
   * @param pushthrough Whether to push through network buffers
   */
  pushChunk(x: any[] | any[][], timestamp: number | number[] = 0.0, pushthrough: boolean = true): void {
    // Input validation
    if (!Array.isArray(x)) {
      throw new TypeError('Chunk must be an array');
    }
    // Determine push function based on timestamp format
    // Single timestamp: all samples share the same timestamp
    // Array of timestamps: each sample has its own timestamp
    const hasMultipleTimestamps = Array.isArray(timestamp);
    const pushFunc = hasMultipleTimestamps ? this.doPushChunkN : this.doPushChunk;
    
    // Process input data format
    let flatData: any[];
    let numSamples: number;
    
    if (x.length === 0) {
      return; // Don't send empty chunks - no data to transmit
    }
    
    if (Array.isArray(x[0])) {
      // 2D array format: [[ch1_s1, ch2_s1], [ch1_s2, ch2_s2], ...]
      // Each inner array is one sample across all channels
      numSamples = x.length;
      flatData = [];
      
      // Flatten while validating channel count
      for (const sample of x) {
        if ((sample as any[]).length !== this.channelCount) {
          throw new Error(
            `Each sample must have the same number of channels (${this.channelCount}).`
          );
        }
        flatData.push(...(sample as any[]));
      }
    } else {
      // 1D array format: [ch1_s1, ch2_s1, ch1_s2, ch2_s2, ...]
      // Data is already flattened in channel-major order
      flatData = x as any[];
      
      // Validate that we have complete samples
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
    
    // Convert data to appropriate format for C function
    let dataBuffer: any;
    
    if (this.channelFormat === cf_string) {
      // String channels: ensure all values are strings
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
        case 7: // cf_int64
          TypedArray = BigInt64Array;
          break;
        default:
          throw new Error(`Unsupported channel format: ${this.channelFormat}`);
      }
      dataBuffer = new TypedArray(flatData);
    }
    
    // Prepare timestamp parameter based on format
    let timestampParam: any;
    if (hasMultipleTimestamps) {
      // Convert timestamp array to Float64Array for C function
      timestampParam = new Float64Array(timestamp as number[]);
    } else {
      // Single timestamp is passed directly
      timestampParam = timestamp as number;
    }
    
    // Push the chunk to the outlet
    const result = pushFunc(
      this.obj,
      dataBuffer,           // Flattened data buffer
      flatData.length,      // Total number of values (samples * channels)
      timestampParam,       // Timestamp(s)
      pushthrough ? 1 : 0   // Bypass buffering flag
    );
    
    // Check for transmission errors
    handleError(result);
  }
  
  /**
   * Check if any inlets are currently connected to this outlet.
   * 
   * @returns {boolean} True if at least one inlet is connected
   * 
   * @example
   * ```typescript
   * if (outlet.haveConsumers()) {
   *   // Someone is listening, send data
   *   outlet.pushSample(data);
   * }
   * ```
   */
  haveConsumers(): boolean {
    return Boolean(lsl_have_consumers(this.obj));
  }
  
  /**
   * Wait for inlets to connect to this outlet.
   * 
   * Blocks until at least one inlet subscribes or timeout expires.
   * Useful for ensuring data isn't lost at stream startup.
   * 
   * @param {number} timeout - Maximum time to wait in seconds
   * @returns {boolean} True if a consumer connected, false if timeout
   * 
   * @example
   * ```typescript
   * console.log('Waiting for receivers...');
   * if (outlet.waitForConsumers(5.0)) {
   *   console.log('Connected! Starting data transmission.');
   * } else {
   *   console.log('No receivers found after 5 seconds.');
   * }
   * ```
   */
  waitForConsumers(timeout: number): boolean {
    return Boolean(lsl_wait_for_consumers(this.obj, timeout));
  }
  
  /**
   * Get the StreamInfo object associated with this outlet.
   * 
   * Returns a new StreamInfo object with updated metadata including
   * hostname, session ID, and creation time.
   * 
   * @returns {StreamInfo} Updated stream information
   * 
   * @example
   * ```typescript
   * const info = outlet.getInfo();
   * console.log(`Stream ${info.name()} created at ${info.createdAt()}`);
   * ```
   */
  getInfo(): StreamInfo {
    const infoHandle = lsl_get_info(this.obj);
    return new StreamInfo('', '', 0, 0, 0, '', infoHandle);
  }
}