import * as koffi from 'koffi';
import {
  lsl_create_inlet,
  lsl_destroy_inlet,
  lsl_get_fullinfo,
  lsl_open_stream,
  lsl_close_stream,
  lsl_time_correction,
  lsl_set_postprocessing,
  lsl_pull_sample_f,
  lsl_pull_sample_d,
  lsl_pull_sample_i,
  lsl_pull_sample_s,
  lsl_pull_sample_c,
  lsl_pull_sample_str,
  lsl_pull_sample_l,
  lsl_pull_chunk_f,
  lsl_pull_chunk_d,
  lsl_pull_chunk_i,
  lsl_pull_chunk_s,
  lsl_pull_chunk_c,
  lsl_pull_chunk_str,
  lsl_pull_chunk_l,
  lsl_samples_available,
  lsl_was_clock_reset,
  lsl_smoothing_halftime,
  lsl_inlet_flush,
  lsl_destroy_string,
} from './lib';
import { StreamInfo } from './info';
import { handleError, FOREVER } from './util';

/**
 * A stream inlet.
 * Inlets are used to receive streaming data (and meta-data) from the lab network.
 */
export class StreamInlet {
  private handle: any;
  private destroyed: boolean = false;
  private channelFormat: number;
  private channelCount: number;

  /**
   * Construct a new stream inlet from a resolved stream description.
   * 
   * @param info - A resolved stream description object (as coming from one of the resolver functions).
   * @param maxBuflen - Optionally the maximum amount of data to buffer (in seconds if there is a nominal 
   *                    sampling rate, otherwise x100 in samples). Recording applications want to use a 
   *                    fairly large buffer size here, while real-time applications would only buffer as 
   *                    much as they need to perform their next calculation. (default 360)
   * @param maxChunklen - Optionally the maximum size, in samples, at which chunks are transmitted 
   *                      (the default corresponds to the chunk sizes used by the sender). Recording programs 
   *                      can use a generous size here (leaving it to the network how to pack things), 
   *                      while real-time applications may want a finer (perhaps 1-sample) granularity. 
   *                      If left unspecified (=0), the sender determines the chunk granularity. (default 0)
   * @param recover - Try to silently recover lost streams that are recoverable (=those that that have a 
   *                  source_id set). In all other cases (recover is false or the stream is not recoverable) 
   *                  functions may throw a LostError if the stream's source is lost (e.g., due to an app 
   *                  or computer crash). (default true)
   * @param processingFlags - Post-processing options. Use one of the post-processing flags 
   *                          `procNone`, `procClocksync`, `procDejitter`, `procMonotonize`, 
   *                          or `procThreadsafe`. Can also be a logical OR combination of multiple flags. 
   *                          Use `procAll` for all flags. (default procNone).
   */
  constructor(
    info: StreamInfo,
    maxBuflen: number = 360,
    maxChunklen: number = 0,
    recover: boolean = true,
    processingFlags: number = 0
  ) {
    if (Array.isArray(info)) {
      throw new TypeError('Description needs to be of type StreamInfo, got a list.');
    }

    this.handle = lsl_create_inlet(info.getHandle(), maxBuflen, maxChunklen, recover ? 1 : 0);
    
    if (!this.handle) {
      throw new Error('Could not create stream inlet.');
    }

    if (processingFlags > 0) {
      handleError(lsl_set_postprocessing(this.handle, processingFlags));
    }

    this.channelFormat = info.getChannelFormat();
    this.channelCount = info.getChannelCount();
  }

  /**
   * Destructor. The inlet will automatically disconnect if destroyed.
   */
  destroy(): void {
    if (!this.destroyed && this.handle) {
      try {
        lsl_destroy_inlet(this.handle);
        this.destroyed = true;
      } catch (e) {
        // Silently ignore errors during destruction
      }
    }
  }

  /**
   * Retrieve the complete information of the given stream.
   * This includes the extended description. Can be invoked at any time of the stream's lifetime.
   * 
   * @param timeout - Timeout of the operation. (default FOREVER)
   * @returns The stream information of the inlet.
   * @throws TimeoutError if the timeout expires, or LostError if the stream source has been lost.
   */
  info(timeout: number = FOREVER): StreamInfo {
    const errcode = koffi.alloc('int', 1);
    const result = lsl_get_fullinfo(this.handle, timeout, errcode);
    handleError(koffi.decode(errcode, 'int'));
    return new StreamInfo('', '', 0, 0, 0, '', result);
  }

  /**
   * Subscribe to the data stream.
   * All samples pushed in at the other end from this moment onwards will be queued and 
   * eventually be delivered in response to pullSample() or pullChunk() calls. 
   * Pulling a sample without some preceding openStream is permitted (the stream will then be opened implicitly).
   * 
   * @param timeout - Optional timeout of the operation (default FOREVER).
   * @throws TimeoutError if the timeout expires, or LostError if the stream source has been lost.
   */
  openStream(timeout: number = FOREVER): void {
    const errcode = koffi.alloc('int', 1);
    lsl_open_stream(this.handle, timeout, errcode);
    handleError(koffi.decode(errcode, 'int'));
  }

  /**
   * Drop the current data stream.
   * All samples that are still buffered or in flight will be dropped and transmission 
   * and buffering of data for this inlet will be stopped. If an application stops being 
   * interested in data from a source (temporarily or not) but keeps the outlet alive, 
   * it should call closeStream() to not waste unnecessary system and network resources.
   */
  closeStream(): void {
    lsl_close_stream(this.handle);
  }

  /**
   * Retrieve an estimated time correction offset for the given stream.
   * The first call to this function takes several milliseconds until a reliable first 
   * estimate is obtained. Subsequent calls are instantaneous (and rely on periodic 
   * background updates). The precision of these estimates should be below 1 ms 
   * (empirically within +/-0.2 ms).
   * 
   * @param timeout - Timeout to acquire the first time-correction estimate (default FOREVER).
   * @returns The current time correction estimate. This is the number that needs to be 
   *          added to a time stamp that was remotely generated via localClock() to map 
   *          it into the local clock domain of this machine.
   * @throws TimeoutError if the timeout expires, or LostError if the stream source has been lost.
   */
  timeCorrection(timeout: number = FOREVER): number {
    const errcode = koffi.alloc('int', 1);
    const result = lsl_time_correction(this.handle, timeout, errcode);
    handleError(koffi.decode(errcode, 'int'));
    return result;
  }

  /**
   * Pull a sample from the inlet and return it.
   * 
   * @param timeout - The timeout for this operation, if any. (default FOREVER)
   *                  If this is passed as 0.0, then the function returns only a sample 
   *                  if one is buffered for immediate pickup.
   * @returns A tuple [sample, timestamp] where sample is an array of channel values and 
   *          timestamp is the capture time of the sample on the remote machine, 
   *          or [null, null] if no new sample was available. To remap this time stamp 
   *          to the local clock, add the value returned by timeCorrection() to it.
   * @throws LostError if the stream source has been lost.
   */
  pullSample(timeout: number = FOREVER): [any[] | null, number | null] {
    const errcode = koffi.alloc('int', 1);
    let timestamp: number;
    let sample: any[];

    switch (this.channelFormat) {
      case 1: // cfFloat32
        const floatBuffer = new Float32Array(this.channelCount);
        timestamp = lsl_pull_sample_f(this.handle, floatBuffer, this.channelCount, timeout, errcode);
        sample = Array.from(floatBuffer);
        break;
      case 2: // cfDouble64
        const doubleBuffer = new Float64Array(this.channelCount);
        timestamp = lsl_pull_sample_d(this.handle, doubleBuffer, this.channelCount, timeout, errcode);
        sample = Array.from(doubleBuffer);
        break;
      case 3: // cfString
        const stringPtrs = koffi.alloc('char*', this.channelCount);
        timestamp = lsl_pull_sample_str(this.handle, stringPtrs, this.channelCount, timeout, errcode);
        sample = [];
        for (let i = 0; i < this.channelCount; i++) {
          const ptr = koffi.decode(stringPtrs, 'char**')[i];
          sample.push(ptr ? koffi.decode(ptr, 'char*') : '');
          if (ptr) {
            lsl_destroy_string(ptr);
          }
        }
        break;
      case 4: // cfInt32
        const int32Buffer = new Int32Array(this.channelCount);
        timestamp = lsl_pull_sample_i(this.handle, int32Buffer, this.channelCount, timeout, errcode);
        sample = Array.from(int32Buffer);
        break;
      case 5: // cfInt16
        const int16Buffer = new Int16Array(this.channelCount);
        timestamp = lsl_pull_sample_s(this.handle, int16Buffer, this.channelCount, timeout, errcode);
        sample = Array.from(int16Buffer);
        break;
      case 6: // cfInt8
        const int8Buffer = new Int8Array(this.channelCount);
        timestamp = lsl_pull_sample_c(this.handle, int8Buffer, this.channelCount, timeout, errcode);
        sample = Array.from(int8Buffer);
        break;
      case 7: // cfInt64
        const int64Buffer = new BigInt64Array(this.channelCount);
        timestamp = lsl_pull_sample_l(this.handle, int64Buffer, this.channelCount, timeout, errcode);
        sample = Array.from(int64Buffer).map(v => Number(v));
        break;
      default:
        throw new Error(`Unsupported channel format: ${this.channelFormat}`);
    }

    const error = koffi.decode(errcode, 'int');
    if (error === -1) {
      // Timeout occurred, no sample available
      return [null, null];
    }
    handleError(error);

    return [sample, timestamp];
  }

  /**
   * Pull a chunk of samples from the inlet.
   * 
   * @param timeout - The timeout for this operation (default 0.0).
   *                  If passed as 0.0, only samples available for immediate pickup will be returned.
   * @param maxSamples - Maximum number of samples to return (default 1024).
   * @param destObj - Optional typed array or buffer object that supports the buffer interface.
   *                  If provided, the data will be written in-place and the samples array 
   *                  returned will be null. It is up to the caller to trim the buffer to the 
   *                  appropriate number of samples based on the returned sample count.
   * @returns A tuple [samples, timestamps] where samples is a 2D array of channel values 
   *          (each row is a sample) or null if destObj was provided, and timestamps is an 
   *          array of capture times. Returns [[], []] if no samples are available.
   * @throws LostError if the stream source has been lost.
   */
  pullChunk(timeout: number = 0.0, maxSamples: number = 1024, destObj?: ArrayBufferView): [any[][] | null, number[]] {
    const errcode = koffi.alloc('int', 1);
    const dataBufferElements = maxSamples * this.channelCount;
    const timestampBuffer = new Float64Array(maxSamples);
    let samplesReceived: number;
    let flatData: any[] | null;

    switch (this.channelFormat) {
      case 1: // cfFloat32
        const floatBuffer = destObj && destObj instanceof Float32Array 
          ? destObj as Float32Array
          : new Float32Array(dataBufferElements);
        samplesReceived = Number(lsl_pull_chunk_f(
          this.handle, floatBuffer, timestampBuffer,
          dataBufferElements, maxSamples, timeout, errcode
        ));
        flatData = destObj ? null : Array.from(floatBuffer.slice(0, samplesReceived * this.channelCount));
        break;
      case 2: // cfDouble64
        const doubleBuffer = destObj && destObj instanceof Float64Array
          ? destObj as Float64Array
          : new Float64Array(dataBufferElements);
        samplesReceived = Number(lsl_pull_chunk_d(
          this.handle, doubleBuffer, timestampBuffer,
          dataBufferElements, maxSamples, timeout, errcode
        ));
        flatData = destObj ? null : Array.from(doubleBuffer.slice(0, samplesReceived * this.channelCount));
        break;
      case 3: // cfString
        const stringPtrs = koffi.alloc('char*', dataBufferElements);
        samplesReceived = Number(lsl_pull_chunk_str(
          this.handle, stringPtrs, timestampBuffer,
          dataBufferElements, maxSamples, timeout, errcode
        ));
        flatData = [];
        const ptrsArray = koffi.decode(stringPtrs, 'char**');
        for (let i = 0; i < samplesReceived * this.channelCount; i++) {
          const ptr = ptrsArray[i];
          flatData.push(ptr ? koffi.decode(ptr, 'char*') : '');
          if (ptr) {
            lsl_destroy_string(ptr);
          }
        }
        break;
      case 4: // cfInt32
        const int32Buffer = destObj && destObj instanceof Int32Array
          ? destObj as Int32Array
          : new Int32Array(dataBufferElements);
        samplesReceived = Number(lsl_pull_chunk_i(
          this.handle, int32Buffer, timestampBuffer,
          dataBufferElements, maxSamples, timeout, errcode
        ));
        flatData = destObj ? null : Array.from(int32Buffer.slice(0, samplesReceived * this.channelCount));
        break;
      case 5: // cfInt16
        const int16Buffer = destObj && destObj instanceof Int16Array
          ? destObj as Int16Array
          : new Int16Array(dataBufferElements);
        samplesReceived = Number(lsl_pull_chunk_s(
          this.handle, int16Buffer, timestampBuffer,
          dataBufferElements, maxSamples, timeout, errcode
        ));
        flatData = destObj ? null : Array.from(int16Buffer.slice(0, samplesReceived * this.channelCount));
        break;
      case 6: // cfInt8
        const int8Buffer = destObj && destObj instanceof Int8Array
          ? destObj as Int8Array
          : new Int8Array(dataBufferElements);
        samplesReceived = Number(lsl_pull_chunk_c(
          this.handle, int8Buffer, timestampBuffer,
          dataBufferElements, maxSamples, timeout, errcode
        ));
        flatData = destObj ? null : Array.from(int8Buffer.slice(0, samplesReceived * this.channelCount));
        break;
      case 7: // cfInt64
        const int64Buffer = destObj && destObj instanceof BigInt64Array
          ? destObj as BigInt64Array
          : new BigInt64Array(dataBufferElements);
        samplesReceived = Number(lsl_pull_chunk_l(
          this.handle, int64Buffer, timestampBuffer,
          dataBufferElements, maxSamples, timeout, errcode
        ));
        flatData = destObj ? null : Array.from(int64Buffer.slice(0, samplesReceived * this.channelCount))
          .map(v => Number(v));
        break;
      default:
        throw new Error(`Unsupported channel format: ${this.channelFormat}`);
    }

    const error = koffi.decode(errcode, 'int');
    if (error === -1) {
      // Timeout occurred, no samples available
      return [[], []];
    }
    handleError(error);

    // Convert flat data to 2D array (only if destObj was not provided)
    let samples: any[][] | null = null;
    if (!destObj && flatData) {
      samples = [];
      for (let i = 0; i < samplesReceived; i++) {
        const sample: any[] = [];
        for (let j = 0; j < this.channelCount; j++) {
          sample.push(flatData[i * this.channelCount + j]);
        }
        samples.push(sample);
      }
    }

    const timestamps = Array.from(timestampBuffer.slice(0, samplesReceived));
    return [samples, timestamps];
  }

  /**
   * Query whether samples are currently available for immediate pickup.
   * 
   * @returns The number of samples available for immediate pickup.
   */
  samplesAvailable(): number {
    return lsl_samples_available(this.handle);
  }

  /**
   * Query whether the clock was potentially reset since the last call to wasClockReset().
   * This is a rarely-used function that is only needed for applications that combine 
   * multiple time_correction values to estimate precise clock drift; it allows to 
   * tolerate cases where the source machine was hot-swapped or restarted in between 
   * two measurements.
   * 
   * @returns True if the clock was potentially reset, false otherwise.
   */
  wasClockReset(): boolean {
    return lsl_was_clock_reset(this.handle) !== 0;
  }

  /**
   * Override the half-time (forget factor) of the time-stamp smoothing.
   * The default is 90 seconds unless a different value is set in the config file.
   * Using a longer window will yield lower jitter in the time stamps, but 
   * longer windows will have trouble tracking changes in the clock rate 
   * (usually due to temperature changes); the default is able to track 
   * changes of up to 10 miliseconds per minute.
   * 
   * Note: This method is not available in the Python pylsl API but is provided
   * as an extension in node-lsl for advanced use cases.
   * 
   * @param value - The new half-time in seconds. The default is 90 seconds.
   * @returns The previous value.
   */
  smoothingHalftime(value: number): number {
    return lsl_smoothing_halftime(this.handle, value);
  }

  /**
   * Drop all queued not-yet pulled samples.
   * 
   * @returns The number of dropped samples.
   */
  flush(): number {
    return lsl_inlet_flush(this.handle);
  }
}