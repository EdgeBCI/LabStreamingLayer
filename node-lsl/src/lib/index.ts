import koffi from 'koffi';
import { platform, arch } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Determine the correct library file based on platform and architecture
function getLibraryPath(): string {
  const platformName = platform();
  const archName = arch();
  
  let libName: string;
  if (platformName === 'win32') {
    // Use amd64 for x64, i386 for x86
    libName = archName === 'x64' ? 'lsl_amd64.dll' : 'lsl_i386.dll';
  } else if (platformName === 'darwin') {
    libName = 'lsl.dylib';
  } else if (platformName === 'linux') {
    libName = 'lsl.so';
  } else {
    throw new Error(`Unsupported platform: ${platformName}`);
  }
  
  return join(__dirname, '..', '..', 'prebuild', libName);
}

// Load the LSL library
const libPath = getLibraryPath();
export const lib = koffi.load(libPath);

// Channel format constants
export const cf_float32 = 1;
export const cf_double64 = 2;
export const cf_string = 3;
export const cf_int32 = 4;
export const cf_int16 = 5;
export const cf_int8 = 6;
export const cf_int64 = 7;
export const cf_undefined = 0;

// Type mappings
export const string2fmt: { [key: string]: number } = {
  'float32': cf_float32,
  'double64': cf_double64,
  'string': cf_string,
  'int32': cf_int32,
  'int16': cf_int16,
  'int8': cf_int8,
  'int64': cf_int64,
};

export const fmt2string: string[] = [
  'undefined',
  'float32',
  'double64',
  'string',
  'int32',
  'int16',
  'int8',
  'int64',
];

// Define opaque pointer type for LSL handles
const lsl_streaminfo = koffi.opaque('lsl_streaminfo');
const lsl_outlet = koffi.opaque('lsl_outlet');
const lsl_inlet = koffi.opaque('lsl_inlet');
const lsl_xml_ptr = koffi.opaque('lsl_xml_ptr');
const lsl_continuous_resolver = koffi.opaque('lsl_continuous_resolver');

// StreamInfo functions
export const lsl_create_streaminfo = lib.func('void* lsl_create_streaminfo(str name, str type, int channel_count, double nominal_srate, int channel_format, str source_id)');
export const lsl_destroy_streaminfo = lib.func('void lsl_destroy_streaminfo(void* info)');
export const lsl_get_name = lib.func('str lsl_get_name(void* info)');
export const lsl_get_type = lib.func('str lsl_get_type(void* info)');
export const lsl_get_channel_count = lib.func('int lsl_get_channel_count(void* info)');
export const lsl_get_nominal_srate = lib.func('double lsl_get_nominal_srate(void* info)');
export const lsl_get_channel_format = lib.func('int lsl_get_channel_format(void* info)');
export const lsl_get_source_id = lib.func('str lsl_get_source_id(void* info)');
export const lsl_get_version = lib.func('int lsl_get_version(void* info)');
export const lsl_get_created_at = lib.func('double lsl_get_created_at(void* info)');
export const lsl_get_uid = lib.func('str lsl_get_uid(void* info)');
export const lsl_get_session_id = lib.func('str lsl_get_session_id(void* info)');
export const lsl_get_hostname = lib.func('str lsl_get_hostname(void* info)');
export const lsl_get_desc = lib.func('void* lsl_get_desc(void* info)');
export const lsl_get_xml = lib.func('str lsl_get_xml(void* info)');

// StreamOutlet functions
export const lsl_create_outlet = lib.func('void* lsl_create_outlet(void* info, int chunk_size, int max_buffered)');
export const lsl_destroy_outlet = lib.func('void lsl_destroy_outlet(void* outlet)');
export const lsl_have_consumers = lib.func('int lsl_have_consumers(void* outlet)');
export const lsl_wait_for_consumers = lib.func('int lsl_wait_for_consumers(void* outlet, double timeout)');
export const lsl_get_info = lib.func('void* lsl_get_info(void* outlet)');

// Push sample functions for different types
export const lsl_push_sample_f = lib.func('int lsl_push_sample_ftp(void* outlet, float* sample, double timestamp, int pushthrough)');
export const lsl_push_sample_d = lib.func('int lsl_push_sample_dtp(void* outlet, double* sample, double timestamp, int pushthrough)');
export const lsl_push_sample_i = lib.func('int lsl_push_sample_itp(void* outlet, int32* sample, double timestamp, int pushthrough)');
export const lsl_push_sample_s = lib.func('int lsl_push_sample_stp(void* outlet, int16* sample, double timestamp, int pushthrough)');
export const lsl_push_sample_c = lib.func('int lsl_push_sample_ctp(void* outlet, int8* sample, double timestamp, int pushthrough)');
export const lsl_push_sample_str = lib.func('int lsl_push_sample_strtp(void* outlet, _Out_ char** sample, double timestamp, int pushthrough)');
export const lsl_push_sample_v = lib.func('int lsl_push_sample_vtp(void* outlet, void* sample, double timestamp, int pushthrough)');

// Push chunk functions for different types
export const lsl_push_chunk_f = lib.func('int lsl_push_chunk_ftp(void* outlet, float* samples, uint32 lengths, double timestamp, int pushthrough)');
export const lsl_push_chunk_ft = lib.func('int lsl_push_chunk_ftnp(void* outlet, float* samples, uint32 lengths, double* timestamps, int pushthrough)');
export const lsl_push_chunk_d = lib.func('int lsl_push_chunk_dtp(void* outlet, double* samples, uint32 lengths, double timestamp, int pushthrough)');
export const lsl_push_chunk_dt = lib.func('int lsl_push_chunk_dtnp(void* outlet, double* samples, uint32 lengths, double* timestamps, int pushthrough)');
export const lsl_push_chunk_i = lib.func('int lsl_push_chunk_itp(void* outlet, int32* samples, uint32 lengths, double timestamp, int pushthrough)');
export const lsl_push_chunk_it = lib.func('int lsl_push_chunk_itnp(void* outlet, int32* samples, uint32 lengths, double* timestamps, int pushthrough)');
export const lsl_push_chunk_s = lib.func('int lsl_push_chunk_stp(void* outlet, int16* samples, uint32 lengths, double timestamp, int pushthrough)');
export const lsl_push_chunk_st = lib.func('int lsl_push_chunk_stnp(void* outlet, int16* samples, uint32 lengths, double* timestamps, int pushthrough)');
export const lsl_push_chunk_c = lib.func('int lsl_push_chunk_ctp(void* outlet, int8* samples, uint32 lengths, double timestamp, int pushthrough)');
export const lsl_push_chunk_ct = lib.func('int lsl_push_chunk_ctnp(void* outlet, int8* samples, uint32 lengths, double* timestamps, int pushthrough)');
export const lsl_push_chunk_str = lib.func('int lsl_push_chunk_strtp(void* outlet, _Out_ char** samples, uint32 lengths, double timestamp, int pushthrough)');
export const lsl_push_chunk_strt = lib.func('int lsl_push_chunk_strtnp(void* outlet, _Out_ char** samples, uint32 lengths, double* timestamps, int pushthrough)');

// StreamInlet functions
export const lsl_create_inlet = lib.func('void* lsl_create_inlet(void* info, int max_buflen, int max_chunklen, int recover)');
export const lsl_destroy_inlet = lib.func('void lsl_destroy_inlet(void* inlet)');
export const lsl_get_fullinfo = lib.func('void* lsl_get_fullinfo(void* inlet, double timeout, _Out_ int* errcode)');
export const lsl_open_stream = lib.func('void lsl_open_stream(void* inlet, double timeout, _Out_ int* errcode)');
export const lsl_close_stream = lib.func('void lsl_close_stream(void* inlet)');
export const lsl_time_correction = lib.func('double lsl_time_correction(void* inlet, double timeout, _Out_ int* errcode)');
export const lsl_set_postprocessing = lib.func('int lsl_set_postprocessing(void* inlet, int flags)');
export const lsl_samples_available = lib.func('int lsl_samples_available(void* inlet)');
export const lsl_inlet_flush = lib.func('int lsl_inlet_flush(void* inlet)');
export const lsl_was_clock_reset = lib.func('int lsl_was_clock_reset(void* inlet)');

// Pull sample functions for different types
export const lsl_pull_sample_f = lib.func('double lsl_pull_sample_f(void* inlet, _Out_ float* sample, int buffer_elements, double timeout, _Out_ int* errcode)');
export const lsl_pull_sample_d = lib.func('double lsl_pull_sample_d(void* inlet, _Out_ double* sample, int buffer_elements, double timeout, _Out_ int* errcode)');
export const lsl_pull_sample_i = lib.func('double lsl_pull_sample_i(void* inlet, _Out_ int32* sample, int buffer_elements, double timeout, _Out_ int* errcode)');
export const lsl_pull_sample_s = lib.func('double lsl_pull_sample_s(void* inlet, _Out_ int16* sample, int buffer_elements, double timeout, _Out_ int* errcode)');
export const lsl_pull_sample_c = lib.func('double lsl_pull_sample_c(void* inlet, _Out_ int8* sample, int buffer_elements, double timeout, _Out_ int* errcode)');
export const lsl_pull_sample_str = lib.func('double lsl_pull_sample_str(void* inlet, _Out_ char** sample, int buffer_elements, double timeout, _Out_ int* errcode)');
export const lsl_pull_sample_v = lib.func('double lsl_pull_sample_v(void* inlet, _Out_ void* sample, int buffer_elements, double timeout, _Out_ int* errcode)');

// Pull chunk functions for different types
export const lsl_pull_chunk_f = lib.func('uint32 lsl_pull_chunk_f(void* inlet, _Out_ float* data_buffer, _Out_ double* timestamp_buffer, uint32 data_buffer_elements, uint32 timestamp_buffer_elements, double timeout, _Out_ int* errcode)');
export const lsl_pull_chunk_d = lib.func('uint32 lsl_pull_chunk_d(void* inlet, _Out_ double* data_buffer, _Out_ double* timestamp_buffer, uint32 data_buffer_elements, uint32 timestamp_buffer_elements, double timeout, _Out_ int* errcode)');
export const lsl_pull_chunk_i = lib.func('uint32 lsl_pull_chunk_i(void* inlet, _Out_ int32* data_buffer, _Out_ double* timestamp_buffer, uint32 data_buffer_elements, uint32 timestamp_buffer_elements, double timeout, _Out_ int* errcode)');
export const lsl_pull_chunk_s = lib.func('uint32 lsl_pull_chunk_s(void* inlet, _Out_ int16* data_buffer, _Out_ double* timestamp_buffer, uint32 data_buffer_elements, uint32 timestamp_buffer_elements, double timeout, _Out_ int* errcode)');
export const lsl_pull_chunk_c = lib.func('uint32 lsl_pull_chunk_c(void* inlet, _Out_ int8* data_buffer, _Out_ double* timestamp_buffer, uint32 data_buffer_elements, uint32 timestamp_buffer_elements, double timeout, _Out_ int* errcode)');
export const lsl_pull_chunk_str = lib.func('uint32 lsl_pull_chunk_str(void* inlet, _Out_ char** data_buffer, _Out_ double* timestamp_buffer, uint32 data_buffer_elements, uint32 timestamp_buffer_elements, double timeout, _Out_ int* errcode)');

// Resolver functions
export const lsl_resolve_all = lib.func('int lsl_resolve_all(_Out_ void** buffer, int buffer_elements, double wait_time)');
export const lsl_resolve_byprop = lib.func('int lsl_resolve_byprop(_Out_ void** buffer, int buffer_elements, str prop, str value, int minimum, double timeout)');
export const lsl_resolve_bypred = lib.func('int lsl_resolve_bypred(_Out_ void** buffer, int buffer_elements, str predicate, int minimum, double timeout)');

// Continuous resolver functions
export const lsl_create_continuous_resolver = lib.func('void* lsl_create_continuous_resolver(double forget_after)');
export const lsl_create_continuous_resolver_byprop = lib.func('void* lsl_create_continuous_resolver_byprop(str prop, str value, double forget_after)');
export const lsl_create_continuous_resolver_bypred = lib.func('void* lsl_create_continuous_resolver_bypred(str predicate, double forget_after)');
export const lsl_destroy_continuous_resolver = lib.func('void lsl_destroy_continuous_resolver(void* resolver)');
export const lsl_resolver_results = lib.func('int lsl_resolver_results(void* resolver, _Out_ void** buffer, int buffer_elements)');

// Utility functions
export const lsl_local_clock = lib.func('double lsl_local_clock()');
export const lsl_protocol_version = lib.func('int lsl_protocol_version()');
export const lsl_library_version = lib.func('int lsl_library_version()');
export const lsl_library_info = lib.func('str lsl_library_info()');
export const lsl_destroy_string = lib.func('void lsl_destroy_string(void* str)');

// XML element functions
export const lsl_first_child = lib.func('void* lsl_first_child(void* e)');
export const lsl_last_child = lib.func('void* lsl_last_child(void* e)');
export const lsl_next_sibling = lib.func('void* lsl_next_sibling(void* e)');
export const lsl_next_sibling_n = lib.func('void* lsl_next_sibling_n(void* e, str name)');
export const lsl_previous_sibling = lib.func('void* lsl_previous_sibling(void* e)');
export const lsl_previous_sibling_n = lib.func('void* lsl_previous_sibling_n(void* e, str name)');
export const lsl_parent = lib.func('void* lsl_parent(void* e)');
export const lsl_child = lib.func('void* lsl_child(void* e, str name)');
export const lsl_empty = lib.func('int lsl_empty(void* e)');
export const lsl_is_text = lib.func('int lsl_is_text(void* e)');
export const lsl_name = lib.func('str lsl_name(void* e)');
export const lsl_value = lib.func('str lsl_value(void* e)');
export const lsl_child_value = lib.func('str lsl_child_value(void* e)');
export const lsl_child_value_n = lib.func('str lsl_child_value_n(void* e, str name)');
export const lsl_append_child_value = lib.func('void* lsl_append_child_value(void* e, str name, str value)');
export const lsl_prepend_child_value = lib.func('void* lsl_prepend_child_value(void* e, str name, str value)');
export const lsl_set_child_value = lib.func('int lsl_set_child_value(void* e, str name, str value)');
export const lsl_set_name = lib.func('int lsl_set_name(void* e, str name)');
export const lsl_set_value = lib.func('int lsl_set_value(void* e, str value)');
export const lsl_append_child = lib.func('void* lsl_append_child(void* e, str name)');
export const lsl_prepend_child = lib.func('void* lsl_prepend_child(void* e, str name)');
export const lsl_append_copy = lib.func('void* lsl_append_copy(void* e, void* target)');
export const lsl_prepend_copy = lib.func('void* lsl_prepend_copy(void* e, void* target)');
export const lsl_remove_child = lib.func('void lsl_remove_child(void* e, void* target)');
export const lsl_remove_child_n = lib.func('void lsl_remove_child_n(void* e, str name)');

// Type definitions for TypeScript
export type ChannelFormat = typeof cf_float32 | typeof cf_double64 | typeof cf_string | 
                            typeof cf_int32 | typeof cf_int16 | typeof cf_int8 | 
                            typeof cf_int64 | typeof cf_undefined;

// Helper functions for type-specific operations
export const fmt2push_sample: { [key: number]: any } = {
  [cf_float32]: lsl_push_sample_f,
  [cf_double64]: lsl_push_sample_d,
  [cf_string]: lsl_push_sample_str,
  [cf_int32]: lsl_push_sample_i,
  [cf_int16]: lsl_push_sample_s,
  [cf_int8]: lsl_push_sample_c,
};

export const fmt2push_chunk: { [key: number]: any } = {
  [cf_float32]: lsl_push_chunk_f,
  [cf_double64]: lsl_push_chunk_d,
  [cf_string]: lsl_push_chunk_str,
  [cf_int32]: lsl_push_chunk_i,
  [cf_int16]: lsl_push_chunk_s,
  [cf_int8]: lsl_push_chunk_c,
};

export const fmt2push_chunk_n: { [key: number]: any } = {
  [cf_float32]: lsl_push_chunk_ft,
  [cf_double64]: lsl_push_chunk_dt,
  [cf_string]: lsl_push_chunk_strt,
  [cf_int32]: lsl_push_chunk_it,
  [cf_int16]: lsl_push_chunk_st,
  [cf_int8]: lsl_push_chunk_ct,
};

export const fmt2pull_sample: { [key: number]: any } = {
  [cf_float32]: lsl_pull_sample_f,
  [cf_double64]: lsl_pull_sample_d,
  [cf_string]: lsl_pull_sample_str,
  [cf_int32]: lsl_pull_sample_i,
  [cf_int16]: lsl_pull_sample_s,
  [cf_int8]: lsl_pull_sample_c,
};

export const fmt2pull_chunk: { [key: number]: any } = {
  [cf_float32]: lsl_pull_chunk_f,
  [cf_double64]: lsl_pull_chunk_d,
  [cf_string]: lsl_pull_chunk_str,
  [cf_int32]: lsl_pull_chunk_i,
  [cf_int16]: lsl_pull_chunk_s,
  [cf_int8]: lsl_pull_chunk_c,
};