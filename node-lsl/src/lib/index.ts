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

// Define opaque handle types for LSL structures
export const StreamInfoHandle = koffi.opaque('lsl_streaminfo');
export const OutletHandle = koffi.opaque('lsl_outlet');
export const InletHandle = koffi.opaque('lsl_inlet');
export const XMLPtr = koffi.opaque('lsl_xml_ptr');
export const ContinuousResolverHandle = koffi.opaque('lsl_continuous_resolver');

// Define channel formats enum
export const ChannelFormat = {
  cfFloat32: 1,
  cfDouble64: 2,
  cfString: 3,
  cfInt32: 4,
  cfInt16: 5,
  cfInt8: 6,
  cfInt64: 7,
  cfUndefined: 0
};

// Protocol version and library info
export const lsl_protocol_version = lib.func('int lsl_protocol_version()');
export const lsl_library_version = lib.func('int lsl_library_version()');
export const lsl_library_info = lib.func('const char* lsl_library_info()');
export const lsl_local_clock = lib.func('double lsl_local_clock()');

// StreamInfo functions
export const lsl_create_streaminfo = lib.func('lsl_streaminfo* lsl_create_streaminfo(const char* name, const char* type, int channel_count, double nominal_srate, int channel_format, const char* source_id)');
export const lsl_destroy_streaminfo = lib.func('void lsl_destroy_streaminfo(lsl_streaminfo* info)');
export const lsl_copy_streaminfo = lib.func('lsl_streaminfo* lsl_copy_streaminfo(lsl_streaminfo* info)');

// StreamInfo getters
export const lsl_get_name = lib.func('const char* lsl_get_name(lsl_streaminfo* info)');
export const lsl_get_type = lib.func('const char* lsl_get_type(lsl_streaminfo* info)');
export const lsl_get_channel_count = lib.func('int lsl_get_channel_count(lsl_streaminfo* info)');
export const lsl_get_nominal_srate = lib.func('double lsl_get_nominal_srate(lsl_streaminfo* info)');
export const lsl_get_channel_format = lib.func('int lsl_get_channel_format(lsl_streaminfo* info)');
export const lsl_get_source_id = lib.func('const char* lsl_get_source_id(lsl_streaminfo* info)');
export const lsl_get_version = lib.func('int lsl_get_version(lsl_streaminfo* info)');
export const lsl_get_created_at = lib.func('double lsl_get_created_at(lsl_streaminfo* info)');
export const lsl_get_uid = lib.func('const char* lsl_get_uid(lsl_streaminfo* info)');
export const lsl_get_session_id = lib.func('const char* lsl_get_session_id(lsl_streaminfo* info)');
export const lsl_get_hostname = lib.func('const char* lsl_get_hostname(lsl_streaminfo* info)');
export const lsl_get_desc = lib.func('lsl_xml_ptr* lsl_get_desc(lsl_streaminfo* info)');
export const lsl_get_xml = lib.func('const char* lsl_get_xml(lsl_streaminfo* info)');

// StreamOutlet functions
export const lsl_create_outlet = lib.func('lsl_outlet* lsl_create_outlet(lsl_streaminfo* info, int chunk_size, int max_buffered)');
export const lsl_destroy_outlet = lib.func('void lsl_destroy_outlet(lsl_outlet* out)');
export const lsl_push_sample_ftp = lib.func('int lsl_push_sample_ftp(lsl_outlet* out, const float* data, double timestamp, int pushthrough)');
export const lsl_push_sample_dtp = lib.func('int lsl_push_sample_dtp(lsl_outlet* out, const double* data, double timestamp, int pushthrough)');
export const lsl_push_sample_itp = lib.func('int lsl_push_sample_itp(lsl_outlet* out, const int32_t* data, double timestamp, int pushthrough)');
export const lsl_push_sample_stp = lib.func('int lsl_push_sample_stp(lsl_outlet* out, const int16_t* data, double timestamp, int pushthrough)');
export const lsl_push_sample_ctp = lib.func('int lsl_push_sample_ctp(lsl_outlet* out, const int8_t* data, double timestamp, int pushthrough)');
export const lsl_push_sample_strtp = lib.func('int lsl_push_sample_strtp(lsl_outlet* out, char** data, double timestamp, int pushthrough)');
export const lsl_push_sample_ltp = lib.func('int lsl_push_sample_ltp(lsl_outlet* out, const int64_t* data, double timestamp, int pushthrough)');

export const lsl_push_chunk_ftp = lib.func('int lsl_push_chunk_ftp(lsl_outlet* out, const float* data, unsigned long data_elements, double timestamp, int pushthrough)');
export const lsl_push_chunk_ftnp = lib.func('int lsl_push_chunk_ftnp(lsl_outlet* out, const float* data, unsigned long data_elements, const double* timestamps, int pushthrough)');
export const lsl_push_chunk_dtp = lib.func('int lsl_push_chunk_dtp(lsl_outlet* out, const double* data, unsigned long data_elements, double timestamp, int pushthrough)');
export const lsl_push_chunk_dtnp = lib.func('int lsl_push_chunk_dtnp(lsl_outlet* out, const double* data, unsigned long data_elements, const double* timestamps, int pushthrough)');
export const lsl_push_chunk_itp = lib.func('int lsl_push_chunk_itp(lsl_outlet* out, const int32_t* data, unsigned long data_elements, double timestamp, int pushthrough)');
export const lsl_push_chunk_itnp = lib.func('int lsl_push_chunk_itnp(lsl_outlet* out, const int32_t* data, unsigned long data_elements, const double* timestamps, int pushthrough)');
export const lsl_push_chunk_stp = lib.func('int lsl_push_chunk_stp(lsl_outlet* out, const int16_t* data, unsigned long data_elements, double timestamp, int pushthrough)');
export const lsl_push_chunk_stnp = lib.func('int lsl_push_chunk_stnp(lsl_outlet* out, const int16_t* data, unsigned long data_elements, const double* timestamps, int pushthrough)');
export const lsl_push_chunk_ctp = lib.func('int lsl_push_chunk_ctp(lsl_outlet* out, const int8_t* data, unsigned long data_elements, double timestamp, int pushthrough)');
export const lsl_push_chunk_ctnp = lib.func('int lsl_push_chunk_ctnp(lsl_outlet* out, const int8_t* data, unsigned long data_elements, const double* timestamps, int pushthrough)');
export const lsl_push_chunk_strtp = lib.func('int lsl_push_chunk_strtp(lsl_outlet* out, char** data, unsigned long data_elements, double timestamp, int pushthrough)');
export const lsl_push_chunk_strtnp = lib.func('int lsl_push_chunk_strtnp(lsl_outlet* out, char** data, unsigned long data_elements, const double* timestamps, int pushthrough)');
export const lsl_push_chunk_ltp = lib.func('int lsl_push_chunk_ltp(lsl_outlet* out, const int64_t* data, unsigned long data_elements, double timestamp, int pushthrough)');
export const lsl_push_chunk_ltnp = lib.func('int lsl_push_chunk_ltnp(lsl_outlet* out, const int64_t* data, unsigned long data_elements, const double* timestamps, int pushthrough)');

export const lsl_have_consumers = lib.func('int lsl_have_consumers(lsl_outlet* out)');
export const lsl_wait_for_consumers = lib.func('int lsl_wait_for_consumers(lsl_outlet* out, double timeout)');
export const lsl_get_info_from_outlet = lib.func('lsl_streaminfo* lsl_get_info(lsl_outlet* out)');

// StreamInlet functions
export const lsl_create_inlet = lib.func('lsl_inlet* lsl_create_inlet(lsl_streaminfo* info, int max_buflen, int max_chunklen, int recover)');
export const lsl_destroy_inlet = lib.func('void lsl_destroy_inlet(lsl_inlet* in)');
export const lsl_get_fullinfo = lib.func('lsl_streaminfo* lsl_get_fullinfo(lsl_inlet* in, double timeout, int* ec)');
export const lsl_get_info_from_inlet = lib.func('lsl_streaminfo* lsl_get_info(lsl_inlet* in)');
export const lsl_open_stream = lib.func('void lsl_open_stream(lsl_inlet* in, double timeout, int* ec)');
export const lsl_close_stream = lib.func('void lsl_close_stream(lsl_inlet* in)');
export const lsl_time_correction = lib.func('double lsl_time_correction(lsl_inlet* in, double timeout, int* ec)');
export const lsl_set_postprocessing = lib.func('int lsl_set_postprocessing(lsl_inlet* in, int flags)');

// Pull sample functions
export const lsl_pull_sample_f = lib.func('double lsl_pull_sample_f(lsl_inlet* in, float* buffer, int buffer_elements, double timeout, int* ec)');
export const lsl_pull_sample_d = lib.func('double lsl_pull_sample_d(lsl_inlet* in, double* buffer, int buffer_elements, double timeout, int* ec)');
export const lsl_pull_sample_i = lib.func('double lsl_pull_sample_i(lsl_inlet* in, int32_t* buffer, int buffer_elements, double timeout, int* ec)');
export const lsl_pull_sample_s = lib.func('double lsl_pull_sample_s(lsl_inlet* in, int16_t* buffer, int buffer_elements, double timeout, int* ec)');
export const lsl_pull_sample_c = lib.func('double lsl_pull_sample_c(lsl_inlet* in, int8_t* buffer, int buffer_elements, double timeout, int* ec)');
export const lsl_pull_sample_str = lib.func('double lsl_pull_sample_str(lsl_inlet* in, char** buffer, int buffer_elements, double timeout, int* ec)');
export const lsl_pull_sample_l = lib.func('double lsl_pull_sample_l(lsl_inlet* in, int64_t* buffer, int buffer_elements, double timeout, int* ec)');

// Pull chunk functions
export const lsl_pull_chunk_f = lib.func('unsigned long lsl_pull_chunk_f(lsl_inlet* in, float* data_buffer, double* timestamp_buffer, unsigned long data_buffer_elements, unsigned long timestamp_buffer_elements, double timeout, int* ec)');
export const lsl_pull_chunk_d = lib.func('unsigned long lsl_pull_chunk_d(lsl_inlet* in, double* data_buffer, double* timestamp_buffer, unsigned long data_buffer_elements, unsigned long timestamp_buffer_elements, double timeout, int* ec)');
export const lsl_pull_chunk_i = lib.func('unsigned long lsl_pull_chunk_i(lsl_inlet* in, int32_t* data_buffer, double* timestamp_buffer, unsigned long data_buffer_elements, unsigned long timestamp_buffer_elements, double timeout, int* ec)');
export const lsl_pull_chunk_s = lib.func('unsigned long lsl_pull_chunk_s(lsl_inlet* in, int16_t* data_buffer, double* timestamp_buffer, unsigned long data_buffer_elements, unsigned long timestamp_buffer_elements, double timeout, int* ec)');
export const lsl_pull_chunk_c = lib.func('unsigned long lsl_pull_chunk_c(lsl_inlet* in, int8_t* data_buffer, double* timestamp_buffer, unsigned long data_buffer_elements, unsigned long timestamp_buffer_elements, double timeout, int* ec)');
export const lsl_pull_chunk_str = lib.func('unsigned long lsl_pull_chunk_str(lsl_inlet* in, char** data_buffer, double* timestamp_buffer, unsigned long data_buffer_elements, unsigned long timestamp_buffer_elements, double timeout, int* ec)');
export const lsl_pull_chunk_l = lib.func('unsigned long lsl_pull_chunk_l(lsl_inlet* in, int64_t* data_buffer, double* timestamp_buffer, unsigned long data_buffer_elements, unsigned long timestamp_buffer_elements, double timeout, int* ec)');

export const lsl_samples_available = lib.func('uint32_t lsl_samples_available(lsl_inlet* in)');
export const lsl_was_clock_reset = lib.func('uint32_t lsl_was_clock_reset(lsl_inlet* in)');
export const lsl_smoothing_halftime = lib.func('float lsl_smoothing_halftime(lsl_inlet* in, float value)');
export const lsl_inlet_flush = lib.func('uint32_t lsl_inlet_flush(lsl_inlet* in)');

// Resolver functions
export const lsl_resolve_all = lib.func('int lsl_resolve_all(lsl_streaminfo** buffer, uint32_t buffer_elements, double wait_time)');
export const lsl_resolve_byprop = lib.func('int lsl_resolve_byprop(lsl_streaminfo** buffer, uint32_t buffer_elements, const char* prop, const char* value, int minimum, double timeout)');
export const lsl_resolve_bypred = lib.func('int lsl_resolve_bypred(lsl_streaminfo** buffer, uint32_t buffer_elements, const char* pred, int minimum, double timeout)');

// Continuous resolver functions
export const lsl_create_continuous_resolver = lib.func('lsl_continuous_resolver* lsl_create_continuous_resolver(double forget_after)');
export const lsl_create_continuous_resolver_byprop = lib.func('lsl_continuous_resolver* lsl_create_continuous_resolver_byprop(const char* prop, const char* value, double forget_after)');
export const lsl_create_continuous_resolver_bypred = lib.func('lsl_continuous_resolver* lsl_create_continuous_resolver_bypred(const char* pred, double forget_after)');
export const lsl_destroy_continuous_resolver = lib.func('void lsl_destroy_continuous_resolver(lsl_continuous_resolver* res)');
export const lsl_resolver_results = lib.func('int lsl_resolver_results(lsl_continuous_resolver* res, lsl_streaminfo** buffer, uint32_t buffer_elements)');

// XML functions
export const lsl_first_child = lib.func('lsl_xml_ptr* lsl_first_child(lsl_xml_ptr* e)');
export const lsl_last_child = lib.func('lsl_xml_ptr* lsl_last_child(lsl_xml_ptr* e)');
export const lsl_next_sibling = lib.func('lsl_xml_ptr* lsl_next_sibling(lsl_xml_ptr* e)');
export const lsl_previous_sibling = lib.func('lsl_xml_ptr* lsl_previous_sibling(lsl_xml_ptr* e)');
export const lsl_parent = lib.func('lsl_xml_ptr* lsl_parent(lsl_xml_ptr* e)');
export const lsl_child = lib.func('lsl_xml_ptr* lsl_child(lsl_xml_ptr* e, const char* name)');
export const lsl_next_sibling_n = lib.func('lsl_xml_ptr* lsl_next_sibling_n(lsl_xml_ptr* e, const char* name)');
export const lsl_previous_sibling_n = lib.func('lsl_xml_ptr* lsl_previous_sibling_n(lsl_xml_ptr* e, const char* name)');
export const lsl_empty = lib.func('int lsl_empty(lsl_xml_ptr* e)');
export const lsl_is_text = lib.func('int lsl_is_text(lsl_xml_ptr* e)');
export const lsl_name = lib.func('const char* lsl_name(lsl_xml_ptr* e)');
export const lsl_value = lib.func('const char* lsl_value(lsl_xml_ptr* e)');
export const lsl_child_value = lib.func('const char* lsl_child_value(lsl_xml_ptr* e)');
export const lsl_child_value_n = lib.func('const char* lsl_child_value_n(lsl_xml_ptr* e, const char* name)');
export const lsl_append_child_value = lib.func('lsl_xml_ptr* lsl_append_child_value(lsl_xml_ptr* e, const char* name, const char* value)');
export const lsl_prepend_child_value = lib.func('lsl_xml_ptr* lsl_prepend_child_value(lsl_xml_ptr* e, const char* name, const char* value)');
export const lsl_set_child_value = lib.func('int lsl_set_child_value(lsl_xml_ptr* e, const char* name, const char* value)');
export const lsl_set_name = lib.func('int lsl_set_name(lsl_xml_ptr* e, const char* rhs)');
export const lsl_set_value = lib.func('int lsl_set_value(lsl_xml_ptr* e, const char* rhs)');
export const lsl_append_child = lib.func('lsl_xml_ptr* lsl_append_child(lsl_xml_ptr* e, const char* name)');
export const lsl_prepend_child = lib.func('lsl_xml_ptr* lsl_prepend_child(lsl_xml_ptr* e, const char* name)');
export const lsl_append_copy = lib.func('lsl_xml_ptr* lsl_append_copy(lsl_xml_ptr* e, lsl_xml_ptr* c)');
export const lsl_prepend_copy = lib.func('lsl_xml_ptr* lsl_prepend_copy(lsl_xml_ptr* e, lsl_xml_ptr* c)');
export const lsl_remove_child_n = lib.func('void lsl_remove_child_n(lsl_xml_ptr* e, const char* name)');
export const lsl_remove_child = lib.func('void lsl_remove_child(lsl_xml_ptr* e, lsl_xml_ptr* c)');

// String utility
export const lsl_destroy_string = lib.func('void lsl_destroy_string(char* s)');