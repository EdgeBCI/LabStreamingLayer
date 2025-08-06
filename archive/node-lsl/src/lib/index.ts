import * as koffi from 'koffi';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

/**
 * Find and load the LSL library
 */
function findLibrary(): string {
  // Check environment variable first
  const envPath = process.env.PYLSL_LIB || process.env.LSL_LIB;
  if (envPath && fs.existsSync(envPath)) {
    return envPath;
  }

  // Determine architecture and platform
  const arch = os.arch();
  const platform = process.platform;
  let libName: string;
  let archSuffix: string;
  
  // Map Node.js arch to LSL arch naming
  switch (arch) {
    case 'x64':
      archSuffix = 'amd64';
      break;
    case 'ia32':
      archSuffix = 'i386';
      break;
    case 'arm64':
      archSuffix = 'arm64';
      break;
    default:
      throw new Error(`Unsupported architecture: ${arch}`);
  }
  
  // Platform-specific library naming and paths
  if (platform === 'win32') {
    libName = `lsl_${archSuffix}.dll`;
    
    // Look in prebuild folder
    const prebuildPath = path.join(__dirname, '..', '..', 'prebuild', libName);
    if (fs.existsSync(prebuildPath)) {
      return prebuildPath;
    }
    
    // Look in lsl_release folder for development
    const releasePath = path.join(__dirname, '..', '..', 'lsl_release', 
      `liblsl-1.16.2-Win_${archSuffix}`, 'bin', 'lsl.dll');
    if (fs.existsSync(releasePath)) {
      return releasePath;
    }
    
    // Check system PATH for lsl.dll
    libName = 'lsl.dll';
    
  } else if (platform === 'darwin') {
    // macOS
    libName = 'liblsl.dylib';
    
    // Look in prebuild folder
    const prebuildPath = path.join(__dirname, '..', '..', 'prebuild', libName);
    if (fs.existsSync(prebuildPath)) {
      return prebuildPath;
    }
    
    // Look in lsl_release folder for development
    const releasePath = path.join(__dirname, '..', '..', 'lsl_release', 
      `liblsl-1.16.2-OSX_${archSuffix}`, 'lib', libName);
    if (fs.existsSync(releasePath)) {
      return releasePath;
    }
    
    // Check common system paths
    const systemPaths = [
      '/usr/local/lib/liblsl.dylib',
      '/opt/homebrew/lib/liblsl.dylib',
      path.join(os.homedir(), '.local/lib/liblsl.dylib')
    ];
    
    for (const systemPath of systemPaths) {
      if (fs.existsSync(systemPath)) {
        return systemPath;
      }
    }
    
  } else if (platform === 'linux') {
    // Linux
    libName = 'liblsl.so';
    
    // Look in prebuild folder
    const prebuildPath = path.join(__dirname, '..', '..', 'prebuild', libName);
    if (fs.existsSync(prebuildPath)) {
      return prebuildPath;
    }
    
    // Look in lsl_release folder for development
    const releasePath = path.join(__dirname, '..', '..', 'lsl_release', 
      `liblsl-1.16.2-Linux_${archSuffix}`, 'lib', libName);
    if (fs.existsSync(releasePath)) {
      return releasePath;
    }
    
    // Check common system paths
    const systemPaths = [
      '/usr/lib/liblsl.so',
      '/usr/local/lib/liblsl.so',
      '/usr/lib/x86_64-linux-gnu/liblsl.so',
      path.join(os.homedir(), '.local/lib/liblsl.so')
    ];
    
    for (const systemPath of systemPaths) {
      if (fs.existsSync(systemPath)) {
        return systemPath;
      }
    }
    
  } else {
    throw new Error(`Unsupported platform: ${platform}`);
  }
  
  const platformName = platform === 'win32' ? 'Windows' : 
                      platform === 'darwin' ? 'macOS' : 'Linux';
  
  throw new Error(`Could not find LSL library for ${platformName}. Please ensure the library is installed or set the LSL_LIB environment variable.`);
}

// Load the library
const libPath = findLibrary();
console.log(`Loading LSL library from: ${libPath}`);

export const lib = koffi.load(libPath);

// Utility function to create array of specific size
export function createFloatArray(size: number): Float32Array {
  return new Float32Array(size);
}

export function createDoubleArray(size: number): Float64Array {
  return new Float64Array(size);
}

export function createIntArray(size: number): Int32Array {
  return new Int32Array(size);
}

export function createShortArray(size: number): Int16Array {
  return new Int16Array(size);
}

export function createCharArray(size: number): Int8Array {
  return new Int8Array(size);
}

// Protocol version
export const lsl_protocol_version = lib.func('int32 lsl_protocol_version()');
export const lsl_library_version = lib.func('int32 lsl_library_version()');
export const lsl_library_info = lib.func('str lsl_library_info()');
export const lsl_local_clock = lib.func('double lsl_local_clock()');

// StreamInfo functions
export const lsl_create_streaminfo = lib.func('void* lsl_create_streaminfo(str name, str type, int32 channel_count, double nominal_srate, int32 channel_format, str source_id)');
export const lsl_destroy_streaminfo = lib.func('void lsl_destroy_streaminfo(void* info)');
export const lsl_copy_streaminfo = lib.func('void* lsl_copy_streaminfo(void* info)');
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
export const lsl_stream_info_matches_query = lib.func('int32 lsl_stream_info_matches_query(void* info, str query)');

// XML functions
export const lsl_destroy_string = lib.func('void lsl_destroy_string(void* str_ptr)');
export const lsl_first_child = lib.func('void* lsl_first_child(void* e)');
export const lsl_last_child = lib.func('void* lsl_last_child(void* e)');
export const lsl_next_sibling = lib.func('void* lsl_next_sibling(void* e)');
export const lsl_previous_sibling = lib.func('void* lsl_previous_sibling(void* e)');
export const lsl_parent = lib.func('void* lsl_parent(void* e)');
export const lsl_child = lib.func('void* lsl_child(void* e, str name)');
export const lsl_next_sibling_n = lib.func('void* lsl_next_sibling_n(void* e, str name)');
export const lsl_previous_sibling_n = lib.func('void* lsl_previous_sibling_n(void* e, str name)');
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
export const lsl_append_copy = lib.func('void* lsl_append_copy(void* e, void* child)');
export const lsl_prepend_copy = lib.func('void* lsl_prepend_copy(void* e, void* child)');
export const lsl_remove_child_n = lib.func('void lsl_remove_child_n(void* e, str name)');
export const lsl_remove_child = lib.func('void lsl_remove_child(void* e, void* child)');

// StreamOutlet functions
export const lsl_create_outlet = lib.func('void* lsl_create_outlet(void* info, int32 chunk_size, int32 max_buffered)');
export const lsl_destroy_outlet = lib.func('void lsl_destroy_outlet(void* outlet)');

// Push sample functions
export const lsl_push_sample_f = lib.func('int32 lsl_push_sample_f(void* outlet, _Out_ float* data)');
export const lsl_push_sample_ft = lib.func('int32 lsl_push_sample_ft(void* outlet, _Out_ float* data, double timestamp)');
export const lsl_push_sample_ftp = lib.func('int32 lsl_push_sample_ftp(void* outlet, _Out_ float* data, double timestamp, int32 pushthrough)');
export const lsl_push_sample_d = lib.func('int32 lsl_push_sample_d(void* outlet, _Out_ double* data)');
export const lsl_push_sample_dt = lib.func('int32 lsl_push_sample_dt(void* outlet, _Out_ double* data, double timestamp)');
export const lsl_push_sample_dtp = lib.func('int32 lsl_push_sample_dtp(void* outlet, _Out_ double* data, double timestamp, int32 pushthrough)');
export const lsl_push_sample_i = lib.func('int32 lsl_push_sample_i(void* outlet, _Out_ int32* data)');
export const lsl_push_sample_it = lib.func('int32 lsl_push_sample_it(void* outlet, _Out_ int32* data, double timestamp)');
export const lsl_push_sample_itp = lib.func('int32 lsl_push_sample_itp(void* outlet, _Out_ int32* data, double timestamp, int32 pushthrough)');
export const lsl_push_sample_s = lib.func('int32 lsl_push_sample_s(void* outlet, _Out_ int16* data)');
export const lsl_push_sample_st = lib.func('int32 lsl_push_sample_st(void* outlet, _Out_ int16* data, double timestamp)');
export const lsl_push_sample_stp = lib.func('int32 lsl_push_sample_stp(void* outlet, _Out_ int16* data, double timestamp, int32 pushthrough)');
export const lsl_push_sample_c = lib.func('int32 lsl_push_sample_c(void* outlet, _Out_ int8* data)');
export const lsl_push_sample_ct = lib.func('int32 lsl_push_sample_ct(void* outlet, _Out_ int8* data, double timestamp)');
export const lsl_push_sample_ctp = lib.func('int32 lsl_push_sample_ctp(void* outlet, _Out_ int8* data, double timestamp, int32 pushthrough)');
export const lsl_push_sample_str = lib.func('int32 lsl_push_sample_str(void* outlet, _Out_ str* data)');
export const lsl_push_sample_strt = lib.func('int32 lsl_push_sample_strt(void* outlet, _Out_ str* data, double timestamp)');
export const lsl_push_sample_strtp = lib.func('int32 lsl_push_sample_strtp(void* outlet, _Out_ str* data, double timestamp, int32 pushthrough)');

// Push chunk functions
export const lsl_push_chunk_f = lib.func('int32 lsl_push_chunk_f(void* outlet, _Out_ float* data, uintptr sample_count)');
export const lsl_push_chunk_ft = lib.func('int32 lsl_push_chunk_ft(void* outlet, _Out_ float* data, uintptr sample_count, double timestamp)');
export const lsl_push_chunk_ftp = lib.func('int32 lsl_push_chunk_ftp(void* outlet, _Out_ float* data, uintptr sample_count, double timestamp, int32 pushthrough)');
export const lsl_push_chunk_ftn = lib.func('int32 lsl_push_chunk_ftn(void* outlet, _Out_ float* data, uintptr sample_count, _Out_ double* timestamps)');
export const lsl_push_chunk_ftnp = lib.func('int32 lsl_push_chunk_ftnp(void* outlet, _Out_ float* data, uintptr sample_count, _Out_ double* timestamps, int32 pushthrough)');
export const lsl_push_chunk_d = lib.func('int32 lsl_push_chunk_d(void* outlet, _Out_ double* data, uintptr sample_count)');
export const lsl_push_chunk_dt = lib.func('int32 lsl_push_chunk_dt(void* outlet, _Out_ double* data, uintptr sample_count, double timestamp)');
export const lsl_push_chunk_dtp = lib.func('int32 lsl_push_chunk_dtp(void* outlet, _Out_ double* data, uintptr sample_count, double timestamp, int32 pushthrough)');
export const lsl_push_chunk_dtn = lib.func('int32 lsl_push_chunk_dtn(void* outlet, _Out_ double* data, uintptr sample_count, _Out_ double* timestamps)');
export const lsl_push_chunk_dtnp = lib.func('int32 lsl_push_chunk_dtnp(void* outlet, _Out_ double* data, uintptr sample_count, _Out_ double* timestamps, int32 pushthrough)');
export const lsl_push_chunk_i = lib.func('int32 lsl_push_chunk_i(void* outlet, _Out_ int32* data, uintptr sample_count)');
export const lsl_push_chunk_it = lib.func('int32 lsl_push_chunk_it(void* outlet, _Out_ int32* data, uintptr sample_count, double timestamp)');
export const lsl_push_chunk_itp = lib.func('int32 lsl_push_chunk_itp(void* outlet, _Out_ int32* data, uintptr sample_count, double timestamp, int32 pushthrough)');
export const lsl_push_chunk_itn = lib.func('int32 lsl_push_chunk_itn(void* outlet, _Out_ int32* data, uintptr sample_count, _Out_ double* timestamps)');
export const lsl_push_chunk_itnp = lib.func('int32 lsl_push_chunk_itnp(void* outlet, _Out_ int32* data, uintptr sample_count, _Out_ double* timestamps, int32 pushthrough)');
export const lsl_push_chunk_s = lib.func('int32 lsl_push_chunk_s(void* outlet, _Out_ int16* data, uintptr sample_count)');
export const lsl_push_chunk_st = lib.func('int32 lsl_push_chunk_st(void* outlet, _Out_ int16* data, uintptr sample_count, double timestamp)');
export const lsl_push_chunk_stp = lib.func('int32 lsl_push_chunk_stp(void* outlet, _Out_ int16* data, uintptr sample_count, double timestamp, int32 pushthrough)');
export const lsl_push_chunk_stn = lib.func('int32 lsl_push_chunk_stn(void* outlet, _Out_ int16* data, uintptr sample_count, _Out_ double* timestamps)');
export const lsl_push_chunk_stnp = lib.func('int32 lsl_push_chunk_stnp(void* outlet, _Out_ int16* data, uintptr sample_count, _Out_ double* timestamps, int32 pushthrough)');
export const lsl_push_chunk_c = lib.func('int32 lsl_push_chunk_c(void* outlet, _Out_ int8* data, uintptr sample_count)');
export const lsl_push_chunk_ct = lib.func('int32 lsl_push_chunk_ct(void* outlet, _Out_ int8* data, uintptr sample_count, double timestamp)');
export const lsl_push_chunk_ctp = lib.func('int32 lsl_push_chunk_ctp(void* outlet, _Out_ int8* data, uintptr sample_count, double timestamp, int32 pushthrough)');
export const lsl_push_chunk_ctn = lib.func('int32 lsl_push_chunk_ctn(void* outlet, _Out_ int8* data, uintptr sample_count, _Out_ double* timestamps)');
export const lsl_push_chunk_ctnp = lib.func('int32 lsl_push_chunk_ctnp(void* outlet, _Out_ int8* data, uintptr sample_count, _Out_ double* timestamps, int32 pushthrough)');
export const lsl_push_chunk_str = lib.func('int32 lsl_push_chunk_str(void* outlet, _Out_ str* data, uintptr sample_count)');
export const lsl_push_chunk_strt = lib.func('int32 lsl_push_chunk_strt(void* outlet, _Out_ str* data, uintptr sample_count, double timestamp)');
export const lsl_push_chunk_strtp = lib.func('int32 lsl_push_chunk_strtp(void* outlet, _Out_ str* data, uintptr sample_count, double timestamp, int32 pushthrough)');
export const lsl_push_chunk_strtn = lib.func('int32 lsl_push_chunk_strtn(void* outlet, _Out_ str* data, uintptr sample_count, _Out_ double* timestamps)');
export const lsl_push_chunk_strtnp = lib.func('int32 lsl_push_chunk_strtnp(void* outlet, _Out_ str* data, uintptr sample_count, _Out_ double* timestamps, int32 pushthrough)');

// Outlet info functions
export const lsl_have_consumers = lib.func('int32 lsl_have_consumers(void* outlet)');
export const lsl_wait_for_consumers = lib.func('int32 lsl_wait_for_consumers(void* outlet, double timeout)');
export const lsl_get_info = lib.func('void* lsl_get_info(void* outlet)');

// StreamInlet functions
export const lsl_create_inlet = lib.func('void* lsl_create_inlet(void* info, int32 max_buflen, int32 max_chunklen, int32 recover)');
export const lsl_destroy_inlet = lib.func('void lsl_destroy_inlet(void* inlet)');
export const lsl_get_fullinfo = lib.func('void* lsl_get_fullinfo(void* inlet, double timeout, _Out_ int32* ec)');
export const lsl_open_stream = lib.func('void lsl_open_stream(void* inlet, double timeout, _Out_ int32* ec)');
export const lsl_close_stream = lib.func('void lsl_close_stream(void* inlet)');
export const lsl_time_correction = lib.func('double lsl_time_correction(void* inlet, double timeout, _Out_ int32* ec)');
export const lsl_time_correction_ex = lib.func('double lsl_time_correction_ex(void* inlet, _Out_ double* remote_time, _Out_ double* uncertainty, double timeout, _Out_ int32* ec)');
export const lsl_set_postprocessing = lib.func('int32 lsl_set_postprocessing(void* inlet, uint32 flags)');

// Pull sample functions
export const lsl_pull_sample_f = lib.func('double lsl_pull_sample_f(void* inlet, _Out_ float* buffer, int32 buffer_elements, double timeout, _Out_ int32* ec)');
export const lsl_pull_sample_d = lib.func('double lsl_pull_sample_d(void* inlet, _Out_ double* buffer, int32 buffer_elements, double timeout, _Out_ int32* ec)');
export const lsl_pull_sample_i = lib.func('double lsl_pull_sample_i(void* inlet, _Out_ int32* buffer, int32 buffer_elements, double timeout, _Out_ int32* ec)');
export const lsl_pull_sample_s = lib.func('double lsl_pull_sample_s(void* inlet, _Out_ int16* buffer, int32 buffer_elements, double timeout, _Out_ int32* ec)');
export const lsl_pull_sample_c = lib.func('double lsl_pull_sample_c(void* inlet, _Out_ int8* buffer, int32 buffer_elements, double timeout, _Out_ int32* ec)');
export const lsl_pull_sample_str = lib.func('double lsl_pull_sample_str(void* inlet, _Out_ str* buffer, int32 buffer_elements, double timeout, _Out_ int32* ec)');

// Pull chunk functions
export const lsl_pull_chunk_f = lib.func('uintptr lsl_pull_chunk_f(void* inlet, _Out_ float* data_buffer, _Out_ double* timestamp_buffer, uintptr data_buffer_elements, uintptr timestamp_buffer_elements, double timeout, _Out_ int32* ec)');
export const lsl_pull_chunk_d = lib.func('uintptr lsl_pull_chunk_d(void* inlet, _Out_ double* data_buffer, _Out_ double* timestamp_buffer, uintptr data_buffer_elements, uintptr timestamp_buffer_elements, double timeout, _Out_ int32* ec)');
export const lsl_pull_chunk_i = lib.func('uintptr lsl_pull_chunk_i(void* inlet, _Out_ int32* data_buffer, _Out_ double* timestamp_buffer, uintptr data_buffer_elements, uintptr timestamp_buffer_elements, double timeout, _Out_ int32* ec)');
export const lsl_pull_chunk_s = lib.func('uintptr lsl_pull_chunk_s(void* inlet, _Out_ int16* data_buffer, _Out_ double* timestamp_buffer, uintptr data_buffer_elements, uintptr timestamp_buffer_elements, double timeout, _Out_ int32* ec)');
export const lsl_pull_chunk_c = lib.func('uintptr lsl_pull_chunk_c(void* inlet, _Out_ int8* data_buffer, _Out_ double* timestamp_buffer, uintptr data_buffer_elements, uintptr timestamp_buffer_elements, double timeout, _Out_ int32* ec)');
export const lsl_pull_chunk_str = lib.func('uintptr lsl_pull_chunk_str(void* inlet, _Out_ str* data_buffer, _Out_ double* timestamp_buffer, uintptr data_buffer_elements, uintptr timestamp_buffer_elements, double timeout, _Out_ int32* ec)');

// Inlet utility functions  
export const lsl_samples_available = lib.func('uint32 lsl_samples_available(void* inlet)');
export const lsl_was_clock_reset = lib.func('uint32 lsl_was_clock_reset(void* inlet)');
export const lsl_smoothing_halftime = lib.func('float lsl_smoothing_halftime(void* inlet, float halftime)');

// Resolver functions
export const lsl_resolve_all = lib.func('int32 lsl_resolve_all(_Out_ void** buffer, uint32 buffer_elements, double wait_time)');
export const lsl_resolve_byprop = lib.func('int32 lsl_resolve_byprop(_Out_ void** buffer, uint32 buffer_elements, str prop, str value, int32 minimum, double timeout)');
export const lsl_resolve_bypred = lib.func('int32 lsl_resolve_bypred(_Out_ void** buffer, uint32 buffer_elements, str predicate, int32 minimum, double timeout)');

// Continuous resolver functions
export const lsl_create_continuous_resolver = lib.func('void* lsl_create_continuous_resolver(double forget_after)');
export const lsl_create_continuous_resolver_byprop = lib.func('void* lsl_create_continuous_resolver_byprop(str prop, str value, double forget_after)');
export const lsl_create_continuous_resolver_bypred = lib.func('void* lsl_create_continuous_resolver_bypred(str predicate, double forget_after)');
export const lsl_resolver_results = lib.func('int32 lsl_resolver_results(void* res, _Out_ void** buffer, uint32 buffer_elements)');
export const lsl_destroy_continuous_resolver = lib.func('void lsl_destroy_continuous_resolver(void* res)');

// Function mapping arrays for pre-computed function selection (similar to pylsl)
// Index corresponds to ChannelFormat enum values
export const fmt2PushSample = [
  null,                    // cf_undefined = 0
  lsl_push_sample_f,       // cf_float32 = 1
  lsl_push_sample_d,       // cf_double64 = 2
  lsl_push_sample_str,     // cf_string = 3
  lsl_push_sample_i,       // cf_int32 = 4
  lsl_push_sample_s,       // cf_int16 = 5
  lsl_push_sample_c,       // cf_int8 = 6
  null                     // cf_int64 = 7 (not supported)
];

export const fmt2PushSampleTp = [
  null,                    // cf_undefined = 0
  lsl_push_sample_ftp,     // cf_float32 = 1
  lsl_push_sample_dtp,     // cf_double64 = 2
  lsl_push_sample_strtp,   // cf_string = 3
  lsl_push_sample_itp,     // cf_int32 = 4
  lsl_push_sample_stp,     // cf_int16 = 5
  lsl_push_sample_ctp,     // cf_int8 = 6
  null                     // cf_int64 = 7 (not supported)
];

export const fmt2PushChunk = [
  null,                    // cf_undefined = 0
  lsl_push_chunk_f,        // cf_float32 = 1
  lsl_push_chunk_d,        // cf_double64 = 2
  lsl_push_chunk_str,      // cf_string = 3
  lsl_push_chunk_i,        // cf_int32 = 4
  lsl_push_chunk_s,        // cf_int16 = 5
  lsl_push_chunk_c,        // cf_int8 = 6
  null                     // cf_int64 = 7 (not supported)
];

export const fmt2PushChunkTp = [
  null,                    // cf_undefined = 0
  lsl_push_chunk_ftp,      // cf_float32 = 1
  lsl_push_chunk_dtp,      // cf_double64 = 2
  lsl_push_chunk_strtp,    // cf_string = 3
  lsl_push_chunk_itp,      // cf_int32 = 4
  lsl_push_chunk_stp,      // cf_int16 = 5
  lsl_push_chunk_ctp,      // cf_int8 = 6
  null                     // cf_int64 = 7 (not supported)
];

export const fmt2PushChunkTnp = [
  null,                    // cf_undefined = 0
  lsl_push_chunk_ftnp,     // cf_float32 = 1
  lsl_push_chunk_dtnp,     // cf_double64 = 2
  lsl_push_chunk_strtnp,   // cf_string = 3
  lsl_push_chunk_itnp,     // cf_int32 = 4
  lsl_push_chunk_stnp,     // cf_int16 = 5
  lsl_push_chunk_ctnp,     // cf_int8 = 6
  null                     // cf_int64 = 7 (not supported)
];

export const fmt2PullSample = [
  null,                    // cf_undefined = 0
  lsl_pull_sample_f,       // cf_float32 = 1
  lsl_pull_sample_d,       // cf_double64 = 2
  lsl_pull_sample_str,     // cf_string = 3
  lsl_pull_sample_i,       // cf_int32 = 4
  lsl_pull_sample_s,       // cf_int16 = 5
  lsl_pull_sample_c,       // cf_int8 = 6
  null                     // cf_int64 = 7 (not supported)
];

export const fmt2PullChunk = [
  null,                    // cf_undefined = 0
  lsl_pull_chunk_f,        // cf_float32 = 1
  lsl_pull_chunk_d,        // cf_double64 = 2
  lsl_pull_chunk_str,      // cf_string = 3
  lsl_pull_chunk_i,        // cf_int32 = 4
  lsl_pull_chunk_s,        // cf_int16 = 5
  lsl_pull_chunk_c,        // cf_int8 = 6
  null                     // cf_int64 = 7 (not supported)
];

// Array creation functions mapping for pre-computed buffer creation
export const fmt2ArrayCreator = [
  null,                    // cf_undefined = 0
  createFloatArray,        // cf_float32 = 1
  createDoubleArray,       // cf_double64 = 2
  null,                    // cf_string = 3 (handled differently)
  createIntArray,          // cf_int32 = 4
  createShortArray,        // cf_int16 = 5
  createCharArray,         // cf_int8 = 6
  null                     // cf_int64 = 7 (not supported)
];

export default lib;