/**
 * @fileoverview Low-level FFI (Foreign Function Interface) bindings for Lab Streaming Layer (LSL).
 * 
 * This module provides direct access to the LSL C library functions through Koffi FFI.
 * Most users should use the high-level classes (StreamInfo, StreamOutlet, StreamInlet) instead
 * of calling these functions directly.
 * 
 * @module lib/index
 * @see {@link https://github.com/sccn/labstreaminglayer} - LSL Documentation
 * @see {@link https://koffi.dev/} - Koffi FFI Documentation
 */

import koffi from 'koffi';
import { platform, arch } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

// Get the directory of this module for resolving library paths
const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Determines the correct LSL library file based on the current platform and architecture.
 * 
 * Supported platforms:
 * - Windows: Uses lsl_amd64.dll (x64) or lsl_i386.dll (x86)
 * - macOS: Uses lsl.dylib (universal binary for x64/ARM64)
 * - Linux: Uses lsl.so (requires system installation)
 * 
 * This function is Electron-aware and will check multiple paths including:
 * - Standard path in node_modules
 * - Unpacked path when in ASAR archive (Electron production)
 * - Electron resources path
 * 
 * @returns {string} Absolute path to the platform-specific LSL library
 * @throws {Error} If the platform is not supported or library cannot be found
 */
function getLibraryPath(): string {
  const platformName = platform();
  const archName = arch();
  
  let libName: string;
  if (platformName === 'win32') {
    // Windows: Select DLL based on architecture
    // x64 (64-bit) uses amd64, x86 (32-bit) uses i386
    libName = archName === 'x64' ? 'lsl_amd64.dll' : 'lsl_i386.dll';
  } else if (platformName === 'darwin') {
    // macOS: Use standard liblsl prefix (supports Intel x64)
    libName = 'liblsl.dylib';
  } else if (platformName === 'linux') {
    // Linux: Use standard liblsl prefix
    libName = 'liblsl.so';
  } else {
    throw new Error(`Unsupported platform: ${platformName}`);
  }
  
  // Build list of possible paths to try
  const possiblePaths: string[] = [];
  
  // 1. Standard path (works in development and regular Node.js)
  const standardPath = join(__dirname, '..', '..', 'prebuild', libName);
  possiblePaths.push(standardPath);
  
  // 2. Check if we're in an ASAR archive (Electron production)
  if (standardPath.includes('app.asar')) {
    // Try the unpacked version (where native modules must be extracted)
    const unpackedPath = standardPath.replace('app.asar', 'app.asar.unpacked');
    possiblePaths.push(unpackedPath);
  }
  
  // 3. Try Electron's resources path if available (production Electron)
  // @ts-ignore - process.resourcesPath is an Electron-specific property
  if (typeof process !== 'undefined' && process.resourcesPath) {
    // @ts-ignore
    const resourcesPath = process.resourcesPath;
    possiblePaths.push(join(resourcesPath, 'app.asar.unpacked', 'node_modules', 'node-labstreaminglayer', 'prebuild', libName));
    possiblePaths.push(join(resourcesPath, 'node_modules', 'node-labstreaminglayer', 'prebuild', libName));
  }
  
  // 4. Check for Electron app path
  // @ts-ignore - global.app is an Electron-specific property  
  if (typeof global !== 'undefined' && global.app?.getPath) {
    try {
      // @ts-ignore
      const appPath = global.app.getPath('exe');
      const exeDir = dirname(appPath);
      possiblePaths.push(join(exeDir, 'resources', 'app.asar.unpacked', 'node_modules', 'node-labstreaminglayer', 'prebuild', libName));
    } catch (e) {
      // Ignore if not in Electron main process
    }
  }
  
  // Find the first existing path
  for (const path of possiblePaths) {
    if (existsSync(path)) {
      return path;
    }
  }
  
  // If no path exists, throw an error with helpful information
  throw new Error(
    `Failed to find LSL library '${libName}'. Searched paths:\n` +
    possiblePaths.map(p => `  - ${p}`).join('\n') +
    '\n\nFor Electron apps, ensure native modules are unpacked from ASAR.\n' +
    'See: https://www.electronjs.org/docs/latest/tutorial/using-native-node-modules'
  );
}

// Load the LSL library using Koffi FFI
const libPath = getLibraryPath();
export const lib = koffi.load(libPath);

/* ============================================================================
 * CHANNEL FORMAT CONSTANTS
 * 
 * These constants define the data type of channels in a stream.
 * They map directly to the lsl_channel_format_t enum in the C library.
 * ============================================================================ */

/** @const {number} Undefined format (0) - Should not be used for data streams */
export const cf_undefined = 0;

/** @const {number} 32-bit IEEE floating point (1) - Standard single precision */
export const cf_float32 = 1;

/** @const {number} 64-bit IEEE floating point (2) - Double precision */
export const cf_double64 = 2;

/** @const {number} Variable-length string (3) - UTF-8 encoded text */
export const cf_string = 3;

/** @const {number} 32-bit signed integer (4) */
export const cf_int32 = 4;

/** @const {number} 16-bit signed integer (5) */
export const cf_int16 = 5;

/** @const {number} 8-bit signed integer (6) */
export const cf_int8 = 6;

/** @const {number} 64-bit signed integer (7) - May have limited support */
export const cf_int64 = 7;

/* ============================================================================
 * TYPE CONVERSION MAPPINGS
 * 
 * These mappings facilitate conversion between string representations and
 * numeric channel format constants.
 * ============================================================================ */

/**
 * Maps string format names to numeric channel format constants.
 * Used when creating streams with string-based format specification.
 * @example
 * const format = string2fmt['float32']; // Returns cf_float32 (1)
 */
export const string2fmt: { [key: string]: number } = {
  'float32': cf_float32,
  'double64': cf_double64,
  'string': cf_string,
  'int32': cf_int32,
  'int16': cf_int16,
  'int8': cf_int8,
  'int64': cf_int64,
};

/**
 * Array mapping numeric format constants to string names.
 * Index corresponds to the channel format constant value.
 * @example
 * const name = fmt2string[cf_float32]; // Returns 'float32'
 */
export const fmt2string: string[] = [
  'undefined',  // 0: cf_undefined
  'float32',    // 1: cf_float32
  'double64',   // 2: cf_double64
  'string',     // 3: cf_string
  'int32',      // 4: cf_int32
  'int16',      // 5: cf_int16
  'int8',       // 6: cf_int8
  'int64',      // 7: cf_int64
];

/* ============================================================================
 * OPAQUE POINTER TYPES
 * 
 * These represent C pointers to LSL structures. They are opaque because
 * JavaScript doesn't need to access their internal structure directly.
 * ============================================================================ */

/** Opaque pointer to lsl_streaminfo structure - Contains stream metadata */
const lsl_streaminfo = koffi.opaque('lsl_streaminfo');

/** Opaque pointer to lsl_outlet structure - Broadcasts data to network */
const lsl_outlet = koffi.opaque('lsl_outlet');

/** Opaque pointer to lsl_inlet structure - Receives data from network */
const lsl_inlet = koffi.opaque('lsl_inlet');

/** Opaque pointer to XML element - Used for stream descriptions */
const lsl_xml_ptr = koffi.opaque('lsl_xml_ptr');

/** Opaque pointer to continuous resolver - Monitors available streams */
const lsl_continuous_resolver = koffi.opaque('lsl_continuous_resolver');

/* ============================================================================
 * STREAMINFO FUNCTIONS
 * 
 * Functions for creating and managing stream metadata.
 * StreamInfo objects describe the properties of a data stream.
 * ============================================================================ */
export const lsl_create_streaminfo = lib.func('void* lsl_create_streaminfo(str name, str type, int32 channel_count, double nominal_srate, int32 channel_format, str source_id)');
export const lsl_destroy_streaminfo = lib.func('void lsl_destroy_streaminfo(void* info)');
export const lsl_get_name = lib.func('str lsl_get_name(void* info)');
export const lsl_get_type = lib.func('str lsl_get_type(void* info)');
export const lsl_get_channel_count = lib.func('int32 lsl_get_channel_count(void* info)');
export const lsl_get_nominal_srate = lib.func('double lsl_get_nominal_srate(void* info)');
export const lsl_get_channel_format = lib.func('int32 lsl_get_channel_format(void* info)');
export const lsl_get_source_id = lib.func('str lsl_get_source_id(void* info)');
export const lsl_get_version = lib.func('int32 lsl_get_version(void* info)');
export const lsl_get_created_at = lib.func('double lsl_get_created_at(void* info)');
export const lsl_get_uid = lib.func('str lsl_get_uid(void* info)');
export const lsl_get_session_id = lib.func('str lsl_get_session_id(void* info)');
export const lsl_get_hostname = lib.func('str lsl_get_hostname(void* info)');
export const lsl_get_desc = lib.func('void* lsl_get_desc(void* info)');
export const lsl_get_xml = lib.func('str lsl_get_xml(void* info)');


/* ============================================================================
 * STREAMOUTLET FUNCTIONS
 * 
 * Functions for broadcasting data streams to the network.
 * Outlets push samples to any connected inlets.
 * ============================================================================ */
export const lsl_create_outlet = lib.func('void* lsl_create_outlet(void* info, int32 chunk_size, int32 max_buffered)');
export const lsl_destroy_outlet = lib.func('void lsl_destroy_outlet(void* outlet)');
export const lsl_have_consumers = lib.func('int32 lsl_have_consumers(void* outlet)');
export const lsl_wait_for_consumers = lib.func('int32 lsl_wait_for_consumers(void* outlet, double timeout)');
export const lsl_get_info = lib.func('void* lsl_get_info(void* outlet)');


/* ============================================================================
 * PUSH SAMPLE FUNCTIONS
 * 
 * Type-specific functions for pushing single samples.
 * The suffix indicates the data type: f=float32, d=double64, i=int32, etc.
 * The 'tp' suffix means timestamp and pushthrough parameters are included.
 * ============================================================================ */
export const lsl_push_sample_f = lib.func('int32 lsl_push_sample_ftp(void* outlet, float* sample, double timestamp, int32 pushthrough)');
export const lsl_push_sample_d = lib.func('int32 lsl_push_sample_dtp(void* outlet, double* sample, double timestamp, int32 pushthrough)');
export const lsl_push_sample_i = lib.func('int32 lsl_push_sample_itp(void* outlet, int32* sample, double timestamp, int32 pushthrough)');
export const lsl_push_sample_s = lib.func('int32 lsl_push_sample_stp(void* outlet, int16* sample, double timestamp, int32 pushthrough)');
export const lsl_push_sample_c = lib.func('int32 lsl_push_sample_ctp(void* outlet, int8* sample, double timestamp, int32 pushthrough)');
export const lsl_push_sample_l = lib.func('int32 lsl_push_sample_ltp(void* outlet, int64* sample, double timestamp, int32 pushthrough)');
export const lsl_push_sample_str = lib.func('int32 lsl_push_sample_strtp(void* outlet, char** sample, double timestamp, int32 pushthrough)');
export const lsl_push_sample_v = lib.func('int32 lsl_push_sample_vtp(void* outlet, void* sample, double timestamp, int32 pushthrough)');


/* ============================================================================
 * PUSH CHUNK FUNCTIONS
 * 
 * Type-specific functions for pushing multiple samples at once.
 * More efficient than pushing samples individually.
 * Suffix 't' versions accept individual timestamps for each sample.
 * ============================================================================ */
export const lsl_push_chunk_f = lib.func('int32 lsl_push_chunk_ftp(void* outlet, float* data, ulong data_elements, double timestamp, int32 pushthrough)');
export const lsl_push_chunk_ft = lib.func('int32 lsl_push_chunk_ftnp(void* outlet, float* data, ulong data_elements, double* timestamps, int32 pushthrough)');
export const lsl_push_chunk_d = lib.func('int32 lsl_push_chunk_dtp(void* outlet, double* data, ulong data_elements, double timestamp, int32 pushthrough)');
export const lsl_push_chunk_dt = lib.func('int32 lsl_push_chunk_dtnp(void* outlet, double* data, ulong data_elements, double* timestamps, int32 pushthrough)');
export const lsl_push_chunk_i = lib.func('int32 lsl_push_chunk_itp(void* outlet, int32* data, ulong data_elements, double timestamp, int32 pushthrough)');
export const lsl_push_chunk_it = lib.func('int32 lsl_push_chunk_itnp(void* outlet, int32* data, ulong data_elements, double* timestamps, int32 pushthrough)');
export const lsl_push_chunk_s = lib.func('int32 lsl_push_chunk_stp(void* outlet, int16* data, ulong data_elements, double timestamp, int32 pushthrough)');
export const lsl_push_chunk_st = lib.func('int32 lsl_push_chunk_stnp(void* outlet, int16* data, ulong data_elements, double* timestamps, int32 pushthrough)');
export const lsl_push_chunk_c = lib.func('int32 lsl_push_chunk_ctp(void* outlet, int8* data, ulong data_elements, double timestamp, int32 pushthrough)');
export const lsl_push_chunk_ct = lib.func('int32 lsl_push_chunk_ctnp(void* outlet, int8* data, ulong data_elements, double* timestamps, int32 pushthrough)');
export const lsl_push_chunk_l = lib.func('int32 lsl_push_chunk_ltp(void* outlet, int64* data, ulong data_elements, double timestamp, int32 pushthrough)');
export const lsl_push_chunk_lt = lib.func('int32 lsl_push_chunk_ltnp(void* outlet, int64* data, ulong data_elements, double* timestamps, int32 pushthrough)');
export const lsl_push_chunk_str = lib.func('int32 lsl_push_chunk_strtp(void* outlet, char** data, ulong data_elements, double timestamp, int32 pushthrough)');
export const lsl_push_chunk_strt = lib.func('int32 lsl_push_chunk_strtnp(void* outlet, char** data, ulong data_elements, double* timestamps, int32 pushthrough)');


/* ============================================================================
 * STREAMINLET FUNCTIONS
 * 
 * Functions for receiving data streams from the network.
 * Inlets pull samples from connected outlets.
 * ============================================================================ */
export const lsl_create_inlet = lib.func('void* lsl_create_inlet(void* info, int32 max_buflen, int32 max_chunklen, int32 recover)');
export const lsl_destroy_inlet = lib.func('void lsl_destroy_inlet(void* inlet)');
export const lsl_get_fullinfo = lib.func('void* lsl_get_fullinfo(void* inlet, double timeout, _Out_ int32* errcode)');
export const lsl_open_stream = lib.func('void lsl_open_stream(void* inlet, double timeout, _Out_ int32* errcode)');
export const lsl_close_stream = lib.func('void lsl_close_stream(void* inlet)');
export const lsl_time_correction = lib.func('double lsl_time_correction(void* inlet, double timeout, _Out_ int32* errcode)');
export const lsl_set_postprocessing = lib.func('int32 lsl_set_postprocessing(void* inlet, uint32 flags)');
export const lsl_samples_available = lib.func('uint32 lsl_samples_available(void* inlet)');
export const lsl_inlet_flush = lib.func('uint32 lsl_inlet_flush(void* inlet)');
export const lsl_was_clock_reset = lib.func('uint32 lsl_was_clock_reset(void* inlet)');


/* ============================================================================
 * PULL SAMPLE FUNCTIONS
 * 
 * Type-specific functions for pulling single samples.
 * Returns timestamp of the sample (0 if no sample available within timeout).
 * ============================================================================ */
export const lsl_pull_sample_f = lib.func('double lsl_pull_sample_f(void* inlet, _Out_ float* sample, int32 buffer_elements, double timeout, _Out_ int32* errcode)');
export const lsl_pull_sample_d = lib.func('double lsl_pull_sample_d(void* inlet, _Out_ double* sample, int32 buffer_elements, double timeout, _Out_ int32* errcode)');
export const lsl_pull_sample_i = lib.func('double lsl_pull_sample_i(void* inlet, _Out_ int32* sample, int32 buffer_elements, double timeout, _Out_ int32* errcode)');
export const lsl_pull_sample_s = lib.func('double lsl_pull_sample_s(void* inlet, _Out_ int16* sample, int32 buffer_elements, double timeout, _Out_ int32* errcode)');
export const lsl_pull_sample_c = lib.func('double lsl_pull_sample_c(void* inlet, _Out_ int8* sample, int32 buffer_elements, double timeout, _Out_ int32* errcode)');
export const lsl_pull_sample_l = lib.func('double lsl_pull_sample_l(void* inlet, _Out_ int64* sample, int32 buffer_elements, double timeout, _Out_ int32* errcode)');
export const lsl_pull_sample_str = lib.func('double lsl_pull_sample_str(void* inlet, _Out_ char** sample, int32 buffer_elements, double timeout, _Out_ int32* errcode)');
export const lsl_pull_sample_v = lib.func('double lsl_pull_sample_v(void* inlet, _Out_ void* sample, int32 buffer_elements, double timeout, _Out_ int32* errcode)');


/* ============================================================================
 * PULL CHUNK FUNCTIONS
 * 
 * Type-specific functions for pulling multiple samples at once.
 * Returns the number of samples actually pulled.
 * ============================================================================ */
export const lsl_pull_chunk_f = lib.func('ulong lsl_pull_chunk_f(void* inlet, _Out_ float* data_buffer, _Out_ double* timestamp_buffer, ulong data_buffer_elements, ulong timestamp_buffer_elements, double timeout, _Out_ int32* errcode)');
export const lsl_pull_chunk_d = lib.func('ulong lsl_pull_chunk_d(void* inlet, _Out_ double* data_buffer, _Out_ double* timestamp_buffer, ulong data_buffer_elements, ulong timestamp_buffer_elements, double timeout, _Out_ int32* errcode)');
export const lsl_pull_chunk_i = lib.func('ulong lsl_pull_chunk_i(void* inlet, _Out_ int32* data_buffer, _Out_ double* timestamp_buffer, ulong data_buffer_elements, ulong timestamp_buffer_elements, double timeout, _Out_ int32* errcode)');
export const lsl_pull_chunk_s = lib.func('ulong lsl_pull_chunk_s(void* inlet, _Out_ int16* data_buffer, _Out_ double* timestamp_buffer, ulong data_buffer_elements, ulong timestamp_buffer_elements, double timeout, _Out_ int32* errcode)');
export const lsl_pull_chunk_c = lib.func('ulong lsl_pull_chunk_c(void* inlet, _Out_ int8* data_buffer, _Out_ double* timestamp_buffer, ulong data_buffer_elements, ulong timestamp_buffer_elements, double timeout, _Out_ int32* errcode)');
export const lsl_pull_chunk_l = lib.func('ulong lsl_pull_chunk_l(void* inlet, _Out_ int64* data_buffer, _Out_ double* timestamp_buffer, ulong data_buffer_elements, ulong timestamp_buffer_elements, double timeout, _Out_ int32* errcode)');
export const lsl_pull_chunk_str = lib.func('ulong lsl_pull_chunk_str(void* inlet, _Out_ char** data_buffer, _Out_ double* timestamp_buffer, ulong data_buffer_elements, ulong timestamp_buffer_elements, double timeout, _Out_ int32* errcode)');


/* ============================================================================
 * RESOLVER FUNCTIONS
 * 
 * Functions for discovering available streams on the network.
 * Resolvers use multicast to find streams matching specific criteria.
 * ============================================================================ */
export const lsl_resolve_all = lib.func('int32 lsl_resolve_all(_Out_ void** buffer, uint32 buffer_elements, double wait_time)');
export const lsl_resolve_byprop = lib.func('int32 lsl_resolve_byprop(_Out_ void** buffer, uint32 buffer_elements, str prop, str value, int32 minimum, double timeout)');
export const lsl_resolve_bypred = lib.func('int32 lsl_resolve_bypred(_Out_ void** buffer, uint32 buffer_elements, str predicate, int32 minimum, double timeout)');


/* ============================================================================
 * CONTINUOUS RESOLVER FUNCTIONS
 * 
 * Functions for continuously monitoring stream availability.
 * Unlike one-shot resolvers, these track streams as they appear/disappear.
 * ============================================================================ */
export const lsl_create_continuous_resolver = lib.func('void* lsl_create_continuous_resolver(double forget_after)');
export const lsl_create_continuous_resolver_byprop = lib.func('void* lsl_create_continuous_resolver_byprop(str prop, str value, double forget_after)');
export const lsl_create_continuous_resolver_bypred = lib.func('void* lsl_create_continuous_resolver_bypred(str predicate, double forget_after)');
export const lsl_destroy_continuous_resolver = lib.func('void lsl_destroy_continuous_resolver(void* resolver)');
export const lsl_resolver_results = lib.func('int32 lsl_resolver_results(void* resolver, _Out_ void** buffer, uint32 buffer_elements)');


/* ============================================================================
 * UTILITY FUNCTIONS
 * 
 * General utility functions for LSL operations.
 * Includes timing, version info, and memory management.
 * ============================================================================ */
export const lsl_local_clock = lib.func('double lsl_local_clock()');
export const lsl_protocol_version = lib.func('int32 lsl_protocol_version()');
export const lsl_library_version = lib.func('int32 lsl_library_version()');
export const lsl_library_info = lib.func('str lsl_library_info()');
export const lsl_destroy_string = lib.func('void lsl_destroy_string(void* str)');


/* ============================================================================
 * XML ELEMENT FUNCTIONS
 * 
 * Functions for manipulating XML stream descriptions.
 * LSL uses XML to store structured metadata about streams.
 * ============================================================================ */
export const lsl_first_child = lib.func('void* lsl_first_child(void* e)');
export const lsl_last_child = lib.func('void* lsl_last_child(void* e)');
export const lsl_next_sibling = lib.func('void* lsl_next_sibling(void* e)');
export const lsl_next_sibling_n = lib.func('void* lsl_next_sibling_n(void* e, str name)');
export const lsl_previous_sibling = lib.func('void* lsl_previous_sibling(void* e)');
export const lsl_previous_sibling_n = lib.func('void* lsl_previous_sibling_n(void* e, str name)');
export const lsl_parent = lib.func('void* lsl_parent(void* e)');
export const lsl_child = lib.func('void* lsl_child(void* e, str name)');
export const lsl_empty = lib.func('int32 lsl_empty(void* e)');
export const lsl_is_text = lib.func('int32 lsl_is_text(void* e)');
export const lsl_name = lib.func('str lsl_name(void* e)');
export const lsl_value = lib.func('str lsl_value(void* e)');
export const lsl_child_value = lib.func('str lsl_child_value(void* e)');
export const lsl_child_value_n = lib.func('str lsl_child_value_n(void* e, str name)');
export const lsl_append_child_value = lib.func('void* lsl_append_child_value(void* e, str name, str value)');
export const lsl_prepend_child_value = lib.func('void* lsl_prepend_child_value(void* e, str name, str value)');
export const lsl_set_child_value = lib.func('int32 lsl_set_child_value(void* e, str name, str value)');
export const lsl_set_name = lib.func('int32 lsl_set_name(void* e, str name)');
export const lsl_set_value = lib.func('int32 lsl_set_value(void* e, str value)');
export const lsl_append_child = lib.func('void* lsl_append_child(void* e, str name)');
export const lsl_prepend_child = lib.func('void* lsl_prepend_child(void* e, str name)');
export const lsl_append_copy = lib.func('void* lsl_append_copy(void* e, void* target)');
export const lsl_prepend_copy = lib.func('void* lsl_prepend_copy(void* e, void* target)');
export const lsl_remove_child = lib.func('void lsl_remove_child(void* e, void* target)');
export const lsl_remove_child_n = lib.func('void lsl_remove_child_n(void* e, str name)');

/* ============================================================================
 * TYPESCRIPT TYPE DEFINITIONS
 * ============================================================================ */

/**
 * Union type representing all valid channel format constants.
 * Used for type safety in TypeScript.
 */
export type ChannelFormat = typeof cf_float32 | typeof cf_double64 | typeof cf_string | 
                            typeof cf_int32 | typeof cf_int16 | typeof cf_int8 | 
                            typeof cf_int64 | typeof cf_undefined;

/* ============================================================================
 * HELPER FUNCTION MAPPINGS
 * 
 * These dictionaries map channel format constants to their corresponding
 * C functions. This allows dynamic function selection based on data type.
 * ============================================================================ */

/**
 * Maps channel format to corresponding push_sample function.
 * Used internally by StreamOutlet to select the correct function.
 */
export const fmt2push_sample: { [key: number]: any } = {
  [cf_float32]: lsl_push_sample_f,
  [cf_double64]: lsl_push_sample_d,
  [cf_string]: lsl_push_sample_str,
  [cf_int32]: lsl_push_sample_i,
  [cf_int16]: lsl_push_sample_s,
  [cf_int8]: lsl_push_sample_c,
  [cf_int64]: lsl_push_sample_l,
};

/**
 * Maps channel format to corresponding push_chunk function (single timestamp).
 * Used for pushing chunks where all samples share the same timestamp.
 */
export const fmt2push_chunk: { [key: number]: any } = {
  [cf_float32]: lsl_push_chunk_f,
  [cf_double64]: lsl_push_chunk_d,
  [cf_string]: lsl_push_chunk_str,
  [cf_int32]: lsl_push_chunk_i,
  [cf_int16]: lsl_push_chunk_s,
  [cf_int8]: lsl_push_chunk_c,
  [cf_int64]: lsl_push_chunk_l,
};

/**
 * Maps channel format to corresponding push_chunk function (multiple timestamps).
 * Used for pushing chunks where each sample has its own timestamp.
 */
export const fmt2push_chunk_n: { [key: number]: any } = {
  [cf_float32]: lsl_push_chunk_ft,
  [cf_double64]: lsl_push_chunk_dt,
  [cf_string]: lsl_push_chunk_strt,
  [cf_int32]: lsl_push_chunk_it,
  [cf_int16]: lsl_push_chunk_st,
  [cf_int8]: lsl_push_chunk_ct,
  [cf_int64]: lsl_push_chunk_lt,
};

/**
 * Maps channel format to corresponding pull_sample function.
 * Used internally by StreamInlet to select the correct function.
 */
export const fmt2pull_sample: { [key: number]: any } = {
  [cf_float32]: lsl_pull_sample_f,
  [cf_double64]: lsl_pull_sample_d,
  [cf_string]: lsl_pull_sample_str,
  [cf_int32]: lsl_pull_sample_i,
  [cf_int16]: lsl_pull_sample_s,
  [cf_int8]: lsl_pull_sample_c,
  [cf_int64]: lsl_pull_sample_l,
};

/**
 * Maps channel format to corresponding pull_chunk function.
 * Used for pulling multiple samples efficiently.
 */
export const fmt2pull_chunk: { [key: number]: any } = {
  [cf_float32]: lsl_pull_chunk_f,
  [cf_double64]: lsl_pull_chunk_d,
  [cf_string]: lsl_pull_chunk_str,
  [cf_int32]: lsl_pull_chunk_i,
  [cf_int16]: lsl_pull_chunk_s,
  [cf_int8]: lsl_pull_chunk_c,
  [cf_int64]: lsl_pull_chunk_l,
};