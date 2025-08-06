import * as koffi from 'koffi';
import {
  OutletHandle,
  lsl_create_outlet,
  lsl_destroy_outlet,
  lsl_push_sample_ftp,
  lsl_push_sample_dtp,
  lsl_push_sample_itp,
  lsl_push_sample_stp,
  lsl_push_sample_ctp,
  lsl_push_sample_strtp,
  lsl_push_sample_ltp,
  lsl_push_chunk_ftp,
  lsl_push_chunk_ftnp,
  lsl_push_chunk_dtp,
  lsl_push_chunk_dtnp,
  lsl_push_chunk_itp,
  lsl_push_chunk_itnp,
  lsl_push_chunk_stp,
  lsl_push_chunk_stnp,
  lsl_push_chunk_ctp,
  lsl_push_chunk_ctnp,
  lsl_push_chunk_strtp,
  lsl_push_chunk_strtnp,
  lsl_push_chunk_ltp,
  lsl_push_chunk_ltnp,
  lsl_have_consumers,
  lsl_wait_for_consumers,
  lsl_get_info_from_outlet,
} from './lib';
import { StreamInfo } from './info';
import { handleError, cfString } from './util';

/**
 * A stream outlet.
 * Outlets are used to make streaming data (and the meta-data) available on the lab network.
 */
export class StreamOutlet {
  private handle: any;
  private destroyed: boolean = false;
  private channelFormat: number;
  private channelCount: number;

  /**
   * Establish a new stream outlet. This makes the stream discoverable.
   * 
   * @param info - The StreamInfo object to describe this stream. Stays constant over the lifetime of the outlet.
   * @param chunkSize - Optionally the desired chunk granularity (in samples) for transmission. 
   *                    If unspecified, each push operation yields one chunk. Inlets can override this setting. (default 0)
   * @param maxBuffered - Optionally the maximum amount of data to buffer (in seconds if there is a nominal sampling rate, 
   *                      otherwise x100 in samples). The default is 6 minutes of data. (default 360)
   */
  constructor(info: StreamInfo, chunkSize: number = 0, maxBuffered: number = 360) {
    this.handle = lsl_create_outlet(info.getHandle(), chunkSize, maxBuffered);
    
    if (!this.handle) {
      throw new Error('Could not create stream outlet.');
    }
    
    this.channelFormat = info.getChannelFormat();
    this.channelCount = info.getChannelCount();
  }

  /**
   * Destroy the outlet.
   * The outlet will no longer be discoverable after destruction and all connected inlets will stop delivering data.
   */
  destroy(): void {
    if (!this.destroyed && this.handle) {
      try {
        lsl_destroy_outlet(this.handle);
        this.destroyed = true;
      } catch (e) {
        console.error('StreamOutlet deletion triggered error:', e);
      }
    }
  }

  /**
   * Push a sample into the outlet.
   * 
   * @param x - A list of values to push (one per channel).
   * @param timestamp - Optionally the capture time of the sample, in agreement with localClock(); 
   *                    if 0.0, the current time is used. (default 0.0)
   * @param pushthrough - Whether to push the sample through to the receivers instead of buffering it 
   *                      with subsequent samples. Note that the chunk_size, if specified at outlet 
   *                      construction, takes precedence over the pushthrough flag. (default true)
   */
  pushSample(x: any[], timestamp: number = 0.0, pushthrough: boolean = true): void {
    if (x.length !== this.channelCount) {
      throw new Error(
        `Length of the sample (${x.length}) must correspond to the stream's channel count (${this.channelCount}).`
      );
    }

    let result: number;
    const pusht = pushthrough ? 1 : 0;

    switch (this.channelFormat) {
      case 1: // cfFloat32
        const floatBuffer = new Float32Array(x);
        result = lsl_push_sample_ftp(this.handle, floatBuffer, timestamp, pusht);
        break;
      case 2: // cfDouble64
        const doubleBuffer = new Float64Array(x);
        result = lsl_push_sample_dtp(this.handle, doubleBuffer, timestamp, pusht);
        break;
      case 3: // cfString
        const stringPtrs = x.map(s => koffi.allocCString(String(s)));
        result = lsl_push_sample_strtp(this.handle, stringPtrs, timestamp, pusht);
        break;
      case 4: // cfInt32
        const int32Buffer = new Int32Array(x);
        result = lsl_push_sample_itp(this.handle, int32Buffer, timestamp, pusht);
        break;
      case 5: // cfInt16
        const int16Buffer = new Int16Array(x);
        result = lsl_push_sample_stp(this.handle, int16Buffer, timestamp, pusht);
        break;
      case 6: // cfInt8
        const int8Buffer = new Int8Array(x);
        result = lsl_push_sample_ctp(this.handle, int8Buffer, timestamp, pusht);
        break;
      case 7: // cfInt64
        const int64Buffer = new BigInt64Array(x.map(v => BigInt(v)));
        result = lsl_push_sample_ltp(this.handle, int64Buffer, timestamp, pusht);
        break;
      default:
        throw new Error(`Unsupported channel format: ${this.channelFormat}`);
    }

    handleError(result);
  }

  /**
   * Push a list of samples into the outlet.
   * 
   * @param x - A list of samples, as a 2-D array where each row is a sample.
   * @param timestamp - Optional, float or array of floats.
   *                    If float and != 0.0: the capture time of the most recent sample.
   *                    If array of floats: the time stamps for each sample.
   * @param pushthrough - Whether to push the chunk through to the receivers instead of buffering it 
   *                      with subsequent samples. (default true)
   */
  pushChunk(x: any[][], timestamp: number | number[] = 0.0, pushthrough: boolean = true): void {
    const numSamples = x.length;
    if (numSamples === 0) {
      return;
    }

    // Verify all samples have correct channel count
    for (let i = 0; i < numSamples; i++) {
      if (x[i].length !== this.channelCount) {
        throw new Error(
          `Sample ${i} has ${x[i].length} channels, expected ${this.channelCount}.`
        );
      }
    }

    const pusht = pushthrough ? 1 : 0;
    let result: number;
    const dataElements = numSamples * this.channelCount;

    // Flatten the 2D array
    const flatData: any[] = [];
    for (const sample of x) {
      flatData.push(...sample);
    }

    if (Array.isArray(timestamp)) {
      // Multiple timestamps provided
      if (timestamp.length !== numSamples) {
        throw new Error(
          `Number of timestamps (${timestamp.length}) must match number of samples (${numSamples}).`
        );
      }

      const timestampBuffer = new Float64Array(timestamp);

      switch (this.channelFormat) {
        case 1: // cfFloat32
          const floatBuffer = new Float32Array(flatData);
          result = lsl_push_chunk_ftnp(this.handle, floatBuffer, dataElements, timestampBuffer, pusht);
          break;
        case 2: // cfDouble64
          const doubleBuffer = new Float64Array(flatData);
          result = lsl_push_chunk_dtnp(this.handle, doubleBuffer, dataElements, timestampBuffer, pusht);
          break;
        case 3: // cfString
          const stringPtrs = flatData.map(s => koffi.allocCString(String(s)));
          result = lsl_push_chunk_strtnp(this.handle, stringPtrs, dataElements, timestampBuffer, pusht);
          break;
        case 4: // cfInt32
          const int32Buffer = new Int32Array(flatData);
          result = lsl_push_chunk_itnp(this.handle, int32Buffer, dataElements, timestampBuffer, pusht);
          break;
        case 5: // cfInt16
          const int16Buffer = new Int16Array(flatData);
          result = lsl_push_chunk_stnp(this.handle, int16Buffer, dataElements, timestampBuffer, pusht);
          break;
        case 6: // cfInt8
          const int8Buffer = new Int8Array(flatData);
          result = lsl_push_chunk_ctnp(this.handle, int8Buffer, dataElements, timestampBuffer, pusht);
          break;
        case 7: // cfInt64
          const int64Buffer = new BigInt64Array(flatData.map(v => BigInt(v)));
          result = lsl_push_chunk_ltnp(this.handle, int64Buffer, dataElements, timestampBuffer, pusht);
          break;
        default:
          throw new Error(`Unsupported channel format: ${this.channelFormat}`);
      }
    } else {
      // Single timestamp for all samples
      switch (this.channelFormat) {
        case 1: // cfFloat32
          const floatBuffer = new Float32Array(flatData);
          result = lsl_push_chunk_ftp(this.handle, floatBuffer, dataElements, timestamp, pusht);
          break;
        case 2: // cfDouble64
          const doubleBuffer = new Float64Array(flatData);
          result = lsl_push_chunk_dtp(this.handle, doubleBuffer, dataElements, timestamp, pusht);
          break;
        case 3: // cfString
          const stringPtrs = flatData.map(s => koffi.allocCString(String(s)));
          result = lsl_push_chunk_strtp(this.handle, stringPtrs, dataElements, timestamp, pusht);
          break;
        case 4: // cfInt32
          const int32Buffer = new Int32Array(flatData);
          result = lsl_push_chunk_itp(this.handle, int32Buffer, dataElements, timestamp, pusht);
          break;
        case 5: // cfInt16
          const int16Buffer = new Int16Array(flatData);
          result = lsl_push_chunk_stp(this.handle, int16Buffer, dataElements, timestamp, pusht);
          break;
        case 6: // cfInt8
          const int8Buffer = new Int8Array(flatData);
          result = lsl_push_chunk_ctp(this.handle, int8Buffer, dataElements, timestamp, pusht);
          break;
        case 7: // cfInt64
          const int64Buffer = new BigInt64Array(flatData.map(v => BigInt(v)));
          result = lsl_push_chunk_ltp(this.handle, int64Buffer, dataElements, timestamp, pusht);
          break;
        default:
          throw new Error(`Unsupported channel format: ${this.channelFormat}`);
      }
    }

    handleError(result);
  }

  /**
   * Check whether consumers are currently registered.
   * 
   * @returns True if the outlet currently has consumers, false otherwise.
   */
  haveConsumers(): boolean {
    return lsl_have_consumers(this.handle) !== 0;
  }

  /**
   * Wait until some consumer shows up (without wasting resources).
   * 
   * @param timeout - Timeout for the operation in seconds. Use FOREVER to wait indefinitely.
   * @returns True if consumers showed up before the timeout, false if timeout expired.
   */
  waitForConsumers(timeout: number): boolean {
    return lsl_wait_for_consumers(this.handle, timeout) !== 0;
  }

  /**
   * Retrieve the stream info provided by this outlet.
   * 
   * @returns The stream information of the outlet.
   */
  getInfo(): StreamInfo {
    const handle = lsl_get_info_from_outlet(this.handle);
    return new StreamInfo('', '', 0, 0, 0, '', handle);
  }
}