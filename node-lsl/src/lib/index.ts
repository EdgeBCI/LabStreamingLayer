import * as ffi from 'ffi-napi';
import * as ref from 'ref-napi';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

// Type definitions for LSL handles
export const StreamInfoHandle = ref.refType(ref.types.void);
export const StreamOutletHandle = ref.refType(ref.types.void);
export const StreamInletHandle = ref.refType(ref.types.void);
export const XMLHandle = ref.refType(ref.types.void);
export const ContinuousResolverHandle = ref.refType(ref.types.void);

// Buffer types for arrays
export const IntArray = ref.refType(ref.types.int32);
export const FloatArray = ref.refType(ref.types.float);
export const DoubleArray = ref.refType(ref.types.double);
export const CharArray = ref.refType(ref.types.char);
export const StringArray = ref.refType(ref.types.CString);
export const VoidPtr = ref.refType(ref.types.void);

/**
 * Find and load the LSL library
 */
function findLibrary(): string {
  // Check environment variable first
  const envPath = process.env.PYLSL_LIB || process.env.LSL_LIB;
  if (envPath && fs.existsSync(envPath)) {
    return envPath;
  }

  // Determine architecture
  const arch = os.arch();
  let libName: string;
  
  if (process.platform === 'win32') {
    if (arch === 'x64') {
      libName = 'lsl_amd64.dll';
    } else if (arch === 'ia32') {
      libName = 'lsl_i386.dll';
    } else {
      throw new Error(`Unsupported architecture: ${arch}`);
    }
    
    // Look in prebuild folder
    const prebuildPath = path.join(__dirname, '..', '..', 'prebuild', libName);
    if (fs.existsSync(prebuildPath)) {
      return prebuildPath;
    }
    
    // Look in lsl_release folder for development
    const releasePath = path.join(__dirname, '..', '..', 'lsl_release', 
      arch === 'x64' ? 'liblsl-1.16.2-Win_amd64' : 'liblsl-1.16.2-Win_i386', 
      'bin', 'lsl.dll');
    if (fs.existsSync(releasePath)) {
      return releasePath;
    }
  } else {
    // TODO: Add support for macOS and Linux
    throw new Error(`Platform ${process.platform} not yet supported`);
  }
  
  throw new Error('Could not find LSL library. Please ensure lsl.dll is in the prebuild folder.');
}

// Load the library
const libPath = findLibrary();
console.log(`Loading LSL library from: ${libPath}`);

export const lib = ffi.Library(libPath, {
  // Protocol version
  'lsl_protocol_version': ['int32', []],
  'lsl_library_version': ['int32', []],
  'lsl_library_info': ['string', []],
  'lsl_local_clock': ['double', []],
  
  // StreamInfo functions
  'lsl_create_streaminfo': [StreamInfoHandle, ['string', 'string', 'int32', 'double', 'int32', 'string']],
  'lsl_destroy_streaminfo': ['void', [StreamInfoHandle]],
  'lsl_copy_streaminfo': [StreamInfoHandle, [StreamInfoHandle]],
  'lsl_get_name': ['string', [StreamInfoHandle]],
  'lsl_get_type': ['string', [StreamInfoHandle]],
  'lsl_get_channel_count': ['int32', [StreamInfoHandle]],
  'lsl_get_nominal_srate': ['double', [StreamInfoHandle]],
  'lsl_get_channel_format': ['int32', [StreamInfoHandle]],
  'lsl_get_source_id': ['string', [StreamInfoHandle]],
  'lsl_get_version': ['int32', [StreamInfoHandle]],
  'lsl_get_created_at': ['double', [StreamInfoHandle]],
  'lsl_get_uid': ['string', [StreamInfoHandle]],
  'lsl_get_session_id': ['string', [StreamInfoHandle]],
  'lsl_get_hostname': ['string', [StreamInfoHandle]],
  'lsl_get_desc': [XMLHandle, [StreamInfoHandle]],
  'lsl_get_xml': ['string', [StreamInfoHandle]],
  'lsl_stream_info_matches_query': ['int32', [StreamInfoHandle, 'string']],
  
  // XML functions
  'lsl_destroy_string': ['void', ['pointer']],
  'lsl_first_child': [XMLHandle, [XMLHandle]],
  'lsl_last_child': [XMLHandle, [XMLHandle]],
  'lsl_next_sibling': [XMLHandle, [XMLHandle]],
  'lsl_previous_sibling': [XMLHandle, [XMLHandle]],
  'lsl_parent': [XMLHandle, [XMLHandle]],
  'lsl_child': [XMLHandle, [XMLHandle, 'string']],
  'lsl_next_sibling_n': [XMLHandle, [XMLHandle, 'string']],
  'lsl_previous_sibling_n': [XMLHandle, [XMLHandle, 'string']],
  'lsl_empty': ['int32', [XMLHandle]],
  'lsl_is_text': ['int32', [XMLHandle]],
  'lsl_name': ['string', [XMLHandle]],
  'lsl_value': ['string', [XMLHandle]],
  'lsl_child_value': ['string', [XMLHandle]],
  'lsl_child_value_n': ['string', [XMLHandle, 'string']],
  'lsl_append_child_value': [XMLHandle, [XMLHandle, 'string', 'string']],
  'lsl_prepend_child_value': [XMLHandle, [XMLHandle, 'string', 'string']],
  'lsl_set_child_value': ['int32', [XMLHandle, 'string', 'string']],
  'lsl_set_name': ['int32', [XMLHandle, 'string']],
  'lsl_set_value': ['int32', [XMLHandle, 'string']],
  'lsl_append_child': [XMLHandle, [XMLHandle, 'string']],
  'lsl_prepend_child': [XMLHandle, [XMLHandle, 'string']],
  'lsl_append_copy': [XMLHandle, [XMLHandle, XMLHandle]],
  'lsl_prepend_copy': [XMLHandle, [XMLHandle, XMLHandle]],
  'lsl_remove_child_n': ['void', [XMLHandle, 'string']],
  'lsl_remove_child': ['void', [XMLHandle, XMLHandle]],
  
  // StreamOutlet functions
  'lsl_create_outlet': [StreamOutletHandle, [StreamInfoHandle, 'int32', 'int32']],
  'lsl_destroy_outlet': ['void', [StreamOutletHandle]],
  'lsl_push_sample_f': ['int32', [StreamOutletHandle, FloatArray]],
  'lsl_push_sample_ft': ['int32', [StreamOutletHandle, FloatArray, 'double']],
  'lsl_push_sample_ftp': ['int32', [StreamOutletHandle, FloatArray, 'double', 'int32']],
  'lsl_push_sample_d': ['int32', [StreamOutletHandle, DoubleArray]],
  'lsl_push_sample_dt': ['int32', [StreamOutletHandle, DoubleArray, 'double']],
  'lsl_push_sample_dtp': ['int32', [StreamOutletHandle, DoubleArray, 'double', 'int32']],
  'lsl_push_sample_i': ['int32', [StreamOutletHandle, IntArray]],
  'lsl_push_sample_it': ['int32', [StreamOutletHandle, IntArray, 'double']],
  'lsl_push_sample_itp': ['int32', [StreamOutletHandle, IntArray, 'double', 'int32']],
  'lsl_push_sample_s': ['int32', [StreamOutletHandle, IntArray]],
  'lsl_push_sample_st': ['int32', [StreamOutletHandle, IntArray, 'double']],
  'lsl_push_sample_stp': ['int32', [StreamOutletHandle, IntArray, 'double', 'int32']],
  'lsl_push_sample_c': ['int32', [StreamOutletHandle, CharArray]],
  'lsl_push_sample_ct': ['int32', [StreamOutletHandle, CharArray, 'double']],
  'lsl_push_sample_ctp': ['int32', [StreamOutletHandle, CharArray, 'double', 'int32']],
  'lsl_push_sample_str': ['int32', [StreamOutletHandle, StringArray]],
  'lsl_push_sample_strt': ['int32', [StreamOutletHandle, StringArray, 'double']],
  'lsl_push_sample_strtp': ['int32', [StreamOutletHandle, StringArray, 'double', 'int32']],
  'lsl_push_sample_buf': ['int32', [StreamOutletHandle, CharArray, 'uint32']],
  'lsl_push_sample_buft': ['int32', [StreamOutletHandle, CharArray, 'uint32', 'double']],
  'lsl_push_sample_buftp': ['int32', [StreamOutletHandle, CharArray, 'uint32', 'double', 'int32']],
  'lsl_push_sample_v': ['int32', [StreamOutletHandle, VoidPtr]],
  'lsl_push_sample_vt': ['int32', [StreamOutletHandle, VoidPtr, 'double']],
  'lsl_push_sample_vtp': ['int32', [StreamOutletHandle, VoidPtr, 'double', 'int32']],
  'lsl_push_chunk_f': ['int32', [StreamOutletHandle, FloatArray, 'uint32']],
  'lsl_push_chunk_ft': ['int32', [StreamOutletHandle, FloatArray, 'uint32', 'double']],
  'lsl_push_chunk_ftp': ['int32', [StreamOutletHandle, FloatArray, 'uint32', 'double', 'int32']],
  'lsl_push_chunk_ftn': ['int32', [StreamOutletHandle, FloatArray, 'uint32', DoubleArray]],
  'lsl_push_chunk_ftnp': ['int32', [StreamOutletHandle, FloatArray, 'uint32', DoubleArray, 'int32']],
  'lsl_push_chunk_d': ['int32', [StreamOutletHandle, DoubleArray, 'uint32']],
  'lsl_push_chunk_dt': ['int32', [StreamOutletHandle, DoubleArray, 'uint32', 'double']],
  'lsl_push_chunk_dtp': ['int32', [StreamOutletHandle, DoubleArray, 'uint32', 'double', 'int32']],
  'lsl_push_chunk_dtn': ['int32', [StreamOutletHandle, DoubleArray, 'uint32', DoubleArray]],
  'lsl_push_chunk_dtnp': ['int32', [StreamOutletHandle, DoubleArray, 'uint32', DoubleArray, 'int32']],
  'lsl_push_chunk_i': ['int32', [StreamOutletHandle, IntArray, 'uint32']],
  'lsl_push_chunk_it': ['int32', [StreamOutletHandle, IntArray, 'uint32', 'double']],
  'lsl_push_chunk_itp': ['int32', [StreamOutletHandle, IntArray, 'uint32', 'double', 'int32']],
  'lsl_push_chunk_itn': ['int32', [StreamOutletHandle, IntArray, 'uint32', DoubleArray]],
  'lsl_push_chunk_itnp': ['int32', [StreamOutletHandle, IntArray, 'uint32', DoubleArray, 'int32']],
  'lsl_push_chunk_s': ['int32', [StreamOutletHandle, IntArray, 'uint32']],
  'lsl_push_chunk_st': ['int32', [StreamOutletHandle, IntArray, 'uint32', 'double']],
  'lsl_push_chunk_stp': ['int32', [StreamOutletHandle, IntArray, 'uint32', 'double', 'int32']],
  'lsl_push_chunk_stn': ['int32', [StreamOutletHandle, IntArray, 'uint32', DoubleArray]],
  'lsl_push_chunk_stnp': ['int32', [StreamOutletHandle, IntArray, 'uint32', DoubleArray, 'int32']],
  'lsl_push_chunk_c': ['int32', [StreamOutletHandle, CharArray, 'uint32']],
  'lsl_push_chunk_ct': ['int32', [StreamOutletHandle, CharArray, 'uint32', 'double']],
  'lsl_push_chunk_ctp': ['int32', [StreamOutletHandle, CharArray, 'uint32', 'double', 'int32']],
  'lsl_push_chunk_ctn': ['int32', [StreamOutletHandle, CharArray, 'uint32', DoubleArray]],
  'lsl_push_chunk_ctnp': ['int32', [StreamOutletHandle, CharArray, 'uint32', DoubleArray, 'int32']],
  'lsl_push_chunk_str': ['int32', [StreamOutletHandle, StringArray, 'uint32']],
  'lsl_push_chunk_strt': ['int32', [StreamOutletHandle, StringArray, 'uint32', 'double']],
  'lsl_push_chunk_strtp': ['int32', [StreamOutletHandle, StringArray, 'uint32', 'double', 'int32']],
  'lsl_push_chunk_strtn': ['int32', [StreamOutletHandle, StringArray, 'uint32', DoubleArray]],
  'lsl_push_chunk_strtnp': ['int32', [StreamOutletHandle, StringArray, 'uint32', DoubleArray, 'int32']],
  'lsl_push_chunk_buf': ['int32', [StreamOutletHandle, CharArray, 'uint32', 'uint32']],
  'lsl_push_chunk_buft': ['int32', [StreamOutletHandle, CharArray, 'uint32', 'uint32', 'double']],
  'lsl_push_chunk_buftp': ['int32', [StreamOutletHandle, CharArray, 'uint32', 'uint32', 'double', 'int32']],
  'lsl_push_chunk_buftn': ['int32', [StreamOutletHandle, CharArray, 'uint32', 'uint32', DoubleArray]],
  'lsl_push_chunk_buftnp': ['int32', [StreamOutletHandle, CharArray, 'uint32', 'uint32', DoubleArray, 'int32']],
  'lsl_have_consumers': ['int32', [StreamOutletHandle]],
  'lsl_wait_for_consumers': ['int32', [StreamOutletHandle, 'double']],
  'lsl_get_info': [StreamInfoHandle, [StreamOutletHandle]],
  
  // StreamInlet functions
  'lsl_create_inlet': [StreamInletHandle, [StreamInfoHandle, 'int32', 'int32', 'int32']],
  'lsl_destroy_inlet': ['void', [StreamInletHandle]],
  'lsl_get_fullinfo': [StreamInfoHandle, [StreamInletHandle, 'double', 'pointer']],
  'lsl_open_stream': ['void', [StreamInletHandle, 'double', 'pointer']],
  'lsl_close_stream': ['void', [StreamInletHandle]],
  'lsl_time_correction': ['double', [StreamInletHandle, 'double', 'pointer']],
  'lsl_time_correction_ex': ['double', [StreamInletHandle, DoubleArray, DoubleArray, 'double', 'pointer']],
  'lsl_set_postprocessing': ['int32', [StreamInletHandle, 'uint32']],
  'lsl_pull_sample_f': ['double', [StreamInletHandle, FloatArray, 'int32', 'double', 'pointer']],
  'lsl_pull_sample_d': ['double', [StreamInletHandle, DoubleArray, 'int32', 'double', 'pointer']],
  'lsl_pull_sample_i': ['double', [StreamInletHandle, IntArray, 'int32', 'double', 'pointer']],
  'lsl_pull_sample_s': ['double', [StreamInletHandle, IntArray, 'int32', 'double', 'pointer']],
  'lsl_pull_sample_c': ['double', [StreamInletHandle, CharArray, 'int32', 'double', 'pointer']],
  'lsl_pull_sample_str': ['double', [StreamInletHandle, StringArray, 'int32', 'double', 'pointer']],
  'lsl_pull_sample_buf': ['double', [StreamInletHandle, CharArray, IntArray, 'int32', 'double', 'pointer']],
  'lsl_pull_sample_v': ['double', [StreamInletHandle, VoidPtr, 'int32', 'double', 'pointer']],
  'lsl_pull_chunk_f': ['uint32', [StreamInletHandle, FloatArray, DoubleArray, 'uint32', 'uint32', 'double', 'pointer']],
  'lsl_pull_chunk_d': ['uint32', [StreamInletHandle, DoubleArray, DoubleArray, 'uint32', 'uint32', 'double', 'pointer']],
  'lsl_pull_chunk_i': ['uint32', [StreamInletHandle, IntArray, DoubleArray, 'uint32', 'uint32', 'double', 'pointer']],
  'lsl_pull_chunk_s': ['uint32', [StreamInletHandle, IntArray, DoubleArray, 'uint32', 'uint32', 'double', 'pointer']],
  'lsl_pull_chunk_c': ['uint32', [StreamInletHandle, CharArray, DoubleArray, 'uint32', 'uint32', 'double', 'pointer']],
  'lsl_pull_chunk_str': ['uint32', [StreamInletHandle, StringArray, DoubleArray, 'uint32', 'uint32', 'double', 'pointer']],
  'lsl_pull_chunk_buf': ['uint32', [StreamInletHandle, CharArray, IntArray, DoubleArray, 'uint32', 'uint32', 'double', 'pointer']],
  'lsl_samples_available': ['uint32', [StreamInletHandle]],
  'lsl_was_clock_reset': ['uint32', [StreamInletHandle]],
  'lsl_smoothing_halftime': ['float', [StreamInletHandle, 'float']],
  
  // Resolver functions
  'lsl_resolve_all': ['int32', [VoidPtr, 'uint32', 'double']],
  'lsl_resolve_byprop': ['int32', [VoidPtr, 'uint32', 'string', 'string', 'int32', 'double']],
  'lsl_resolve_bypred': ['int32', [VoidPtr, 'uint32', 'string', 'int32', 'double']],
  
  // Continuous resolver functions
  'lsl_create_continuous_resolver': [ContinuousResolverHandle, ['double']],
  'lsl_create_continuous_resolver_byprop': [ContinuousResolverHandle, ['string', 'string', 'double']],
  'lsl_create_continuous_resolver_bypred': [ContinuousResolverHandle, ['string', 'double']],
  'lsl_resolver_results': ['int32', [ContinuousResolverHandle, VoidPtr, 'uint32']],
  'lsl_destroy_continuous_resolver': ['void', [ContinuousResolverHandle]],
});

export default lib;