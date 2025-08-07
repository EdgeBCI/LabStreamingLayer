/**
 * @fileoverview StreamInfo class and XMLElement class for LSL stream metadata.
 * 
 * This module provides classes for declaring and manipulating stream metadata.
 * StreamInfo objects describe the properties of a data stream including its
 * name, type, channel count, sampling rate, and data format.
 * 
 * @module streamInfo
 * @see {@link https://labstreaminglayer.readthedocs.io/} - LSL Documentation
 */

import { 
  lib, 
  lsl_create_streaminfo,
  lsl_destroy_streaminfo,
  lsl_get_name,
  lsl_get_type,
  lsl_get_channel_count,
  lsl_get_nominal_srate,
  lsl_get_channel_format,
  lsl_get_source_id,
  lsl_get_version,
  lsl_get_created_at,
  lsl_get_uid,
  lsl_get_session_id,
  lsl_get_hostname,
  lsl_get_desc,
  lsl_get_xml,
  lsl_first_child,
  lsl_last_child,
  lsl_next_sibling,
  lsl_next_sibling_n,
  lsl_previous_sibling,
  lsl_previous_sibling_n,
  lsl_parent,
  lsl_child,
  lsl_empty,
  lsl_is_text,
  lsl_name,
  lsl_value,
  lsl_child_value,
  lsl_child_value_n,
  lsl_append_child_value,
  lsl_prepend_child_value,
  lsl_set_child_value,
  lsl_set_name,
  lsl_set_value,
  lsl_append_child,
  lsl_prepend_child,
  lsl_append_copy,
  lsl_prepend_copy,
  lsl_remove_child,
  lsl_remove_child_n,
  cf_float32,
  string2fmt,
  ChannelFormat
} from './lib/index.js';
import { IRREGULAR_RATE } from './util.js';

/**
 * FinalizationRegistry for automatic cleanup of StreamInfo objects.
 * When a StreamInfo instance is garbage collected, this registry ensures
 * the underlying C object is properly freed to prevent memory leaks.
 * 
 * @private
 */
const streamInfoRegistry = new FinalizationRegistry((obj: any) => {
  try {
    lsl_destroy_streaminfo(obj);
  } catch (e) {
    // Silently ignore cleanup errors - the object may already be destroyed
  }
});

/**
 * Represents the declaration of a data stream.
 * 
 * StreamInfo is the primary metadata container for LSL streams. It stores:
 * - Core properties: name, type, channel count, sampling rate, data format
 * - Unique identifiers: source_id, uid, session_id
 * - Host information: hostname, version, creation time
 * - Extended metadata: channel labels, units, types via XML description
 * 
 * @example
 * ```typescript
 * // Create a simple EEG stream
 * const info = new StreamInfo('MyEEGStream', 'EEG', 8, 250, 'float32');
 * 
 * // Add channel labels
 * info.setChannelLabels(['Fp1', 'Fp2', 'F3', 'F4', 'C3', 'C4', 'P3', 'P4']);
 * ```
 * 
 * @class
 */
export class StreamInfo {
  /** Pointer to the underlying LSL streaminfo C object */
  private obj: any;
  
  /**
   * Creates a new StreamInfo object.
   * 
   * @param {string} name - Human-readable name of the stream (e.g., 'BioSemi')
   * @param {string} type - Content type of the stream (e.g., 'EEG', 'Markers', 'Audio')
   * @param {number} channelCount - Number of channels in the stream
   * @param {number} nominalSrate - Nominal sampling rate in Hz (0 for irregular)
   * @param {number|string} channelFormat - Data format ('float32', 'string', etc. or constant)
   * @param {string|null} sourceId - Unique source identifier (auto-generated if not provided)
   * @param {any} handle - Internal: existing C object handle for wrapping
   * 
   * @throws {Error} If channel format is unknown or stream creation fails
   */
  constructor(
    name: string = 'untitled',
    type: string = '',
    channelCount: number = 1,
    nominalSrate: number = IRREGULAR_RATE,
    channelFormat: number | string = cf_float32,
    sourceId?: string | null,
    handle?: any
  ) {
    if (handle !== undefined) {
      // Wrap an existing C streaminfo object (used internally by resolver)
      this.obj = handle;
    } else {
      // Create a new streaminfo object
      
      // Convert string format specification to numeric constant
      if (typeof channelFormat === 'string') {
        channelFormat = string2fmt[channelFormat];
        if (channelFormat === undefined) {
          throw new Error(`Unknown channel format: ${channelFormat}`);
        }
      }
      
      // Generate source_id if not provided
      if (sourceId === null || sourceId === undefined) {
        // Create a deterministic hash from stream parameters
        // This ensures the same parameters always generate the same source_id
        const hashInput = `${name}${type}${channelCount}${nominalSrate}${channelFormat}`;
        let hash = 0;
        
        // Simple hash algorithm: djb2 variant
        for (let i = 0; i < hashInput.length; i++) {
          const char = hashInput.charCodeAt(i);
          hash = ((hash << 5) - hash) + char; // hash * 33 + char
          hash = hash & hash; // Convert to 32-bit integer
        }
        
        sourceId = hash.toString();
        console.log(
          `Generated source_id: '${sourceId}' for StreamInfo with name '${name}', type '${type}', ` +
          `channel_count ${channelCount}, nominal_srate ${nominalSrate}, ` +
          `and channel_format ${channelFormat}.`
        );
      }
      
      // Create the LSL streaminfo C object
      this.obj = lsl_create_streaminfo(
        name,
        type,
        channelCount,
        nominalSrate,
        channelFormat as number,
        sourceId
      );
      
      if (!this.obj) {
        throw new Error('Could not create stream description object.');
      }
      
      // Register for automatic cleanup when this object is garbage collected
      streamInfoRegistry.register(this, this.obj, this);
    }
  }
  
  /**
   * Manually destroy the stream info object and free resources.
   * This is called automatically when the object is garbage collected.
   */
  destroy(): void {
    if (this.obj) {
      try {
        streamInfoRegistry.unregister(this);
        lsl_destroy_streaminfo(this.obj);
      } catch (e) {
        console.error('StreamInfo deletion triggered error:', e);
      }
      this.obj = null;
    }
  }
  
  /**
   * Get the stream name.
   * @returns The name of the stream
   */
  name(): string {
    return lsl_get_name(this.obj);
  }
  
  /**
   * Get the stream type.
   * @returns The content type of the stream (e.g., 'EEG', 'Markers')
   */
  type(): string {
    return lsl_get_type(this.obj);
  }
  
  /**
   * Get the number of channels.
   * @returns The channel count of the stream
   */
  channelCount(): number {
    return lsl_get_channel_count(this.obj);
  }
  
  /**
   * Get the nominal sampling rate.
   * @returns The sampling rate in Hz (0 for irregular rate)
   */
  nominalSrate(): number {
    return lsl_get_nominal_srate(this.obj);
  }
  
  /**
   * Get the channel format.
   * @returns The numeric channel format constant
   */
  channelFormat(): number {
    return lsl_get_channel_format(this.obj);
  }
  
  /**
   * Get the unique source identifier.
   * @returns The source ID of the stream
   */
  sourceId(): string {
    return lsl_get_source_id(this.obj);
  }
  
  /* ============================================================================
   * HOSTING INFORMATION
   * These properties are assigned when the stream is bound to an outlet/inlet
   * ============================================================================ */
  /**
   * Get the protocol version used by the stream.
   * @returns {number} LSL protocol version number
   */
  version(): number {
    return lsl_get_version(this.obj);
  }
  
  /**
   * Get the creation timestamp of the stream.
   * @returns {number} LSL timestamp when the stream was created
   */
  createdAt(): number {
    return lsl_get_created_at(this.obj);
  }
  
  /**
   * Get the unique identifier of the stream.
   * This UID is generated when the stream is created and remains constant.
   * @returns {string} Unique stream identifier
   */
  uid(): string {
    return lsl_get_uid(this.obj);
  }
  
  /**
   * Get the session identifier.
   * Changes when the host system restarts or LSL is reinitialized.
   * @returns {string} Current session identifier
   */
  sessionId(): string {
    return lsl_get_session_id(this.obj);
  }
  
  /**
   * Get the hostname of the machine hosting the stream.
   * @returns {string} Hostname or IP address
   */
  hostname(): string {
    return lsl_get_hostname(this.obj);
  }
  
  /* ============================================================================
   * DATA DESCRIPTION
   * Extended metadata stored as XML
   * ============================================================================ */
  
  /**
   * Get the XML description of the stream.
   * This contains extended metadata like channel labels, units, etc.
   * @returns {XMLElement} Root XML element for manipulation
   */
  desc(): XMLElement {
    return new XMLElement(lsl_get_desc(this.obj));
  }
  
  /**
   * Get the complete stream metadata as an XML string.
   * Useful for debugging or saving stream configuration.
   * @returns {string} XML representation of all stream metadata
   */
  asXml(): string {
    return lsl_get_xml(this.obj);
  }
  
  /* ============================================================================
   * CHANNEL METADATA METHODS
   * Convenience methods for managing channel properties
   * ============================================================================ */
  
  /**
   * Get the labels for all channels.
   * @returns {string[]|null} Array of channel labels or null if not set
   * @example
   * const labels = info.getChannelLabels(); // ['Fp1', 'Fp2', ...]
   */
  getChannelLabels(): string[] | null {
    return this._getChannelInfo('label');
  }
  
  /**
   * Get the types for all channels.
   * @returns {string[]|null} Array of channel types or null if not set
   * @example
   * const types = info.getChannelTypes(); // ['EEG', 'EEG', ...]
   */
  getChannelTypes(): string[] | null {
    return this._getChannelInfo('type');
  }
  
  /**
   * Get the units for all channels.
   * @returns {string[]|null} Array of channel units or null if not set
   * @example
   * const units = info.getChannelUnits(); // ['microvolts', 'microvolts', ...]
   */
  getChannelUnits(): string[] | null {
    return this._getChannelInfo('unit');
  }
  
  /**
   * Generic helper to extract channel information from XML.
   * @private
   * @param {string} name - Property name to extract ('label', 'type', or 'unit')
   * @returns {string[]|null} Array of values or null if not found
   */
  private _getChannelInfo(name: string): string[] | null {
    const desc = this.desc();
    
    // Check if channels element exists
    if (desc.child('channels').empty()) {
      return null;
    }
    
    const chInfos: (string | null)[] = [];
    const channels = desc.child('channels');
    let ch = channels.child('channel');
    
    // Iterate through all channel elements
    while (!ch.empty()) {
      const chInfo = ch.child(name).firstChild().value();
      if (chInfo.length !== 0) {
        chInfos.push(chInfo);
      } else {
        chInfos.push(null);
      }
      ch = ch.nextSibling();
    }
    
    // Return null if no channel has this property
    if (chInfos.every(info => info === null)) {
      return null;
    }
    
    // Warn if channel count mismatch
    if (chInfos.length !== this.channelCount()) {
      console.warn(
        `The stream description contains ${chInfos.length} elements for ` +
        `${this.channelCount()} channels.`
      );
    }
    
    return chInfos.filter(info => info !== null) as string[];
  }
  
  /**
   * Set labels for all channels.
   * @param {string[]} labels - Array of channel labels (must match channel count)
   * @throws {Error} If array length doesn't match channel count
   * @example
   * info.setChannelLabels(['Fp1', 'Fp2', 'F3', 'F4']);
   */
  setChannelLabels(labels: string[]): void {
    this._setChannelInfo(labels, 'label');
  }
  
  /**
   * Set types for all channels.
   * @param {string|string[]} types - Single type for all channels or array of types
   * @example
   * info.setChannelTypes('EEG'); // All channels are EEG
   * info.setChannelTypes(['EEG', 'EEG', 'EOG', 'EOG']); // Mixed types
   */
  setChannelTypes(types: string | string[]): void {
    const typeArray = typeof types === 'string' 
      ? new Array(this.channelCount()).fill(types)
      : types;
    this._setChannelInfo(typeArray, 'type');
  }
  
  /**
   * Set units for all channels.
   * @param {string|number|(string|number)[]} units - Single unit or array of units
   * @example
   * info.setChannelUnits('microvolts'); // All channels in microvolts
   * info.setChannelUnits(['microvolts', 'millivolts', 'celsius', 'percent']);
   */
  setChannelUnits(units: string | number | (string | number)[]): void {
    let unitArray: string[];
    
    if (typeof units === 'string' || typeof units === 'number') {
      unitArray = new Array(this.channelCount()).fill(
        typeof units === 'number' ? units.toString() : units
      );
    } else {
      unitArray = (units as (string | number)[]).map(unit => 
        typeof unit === 'number' ? unit.toString() : unit
      );
    }
    
    this._setChannelInfo(unitArray, 'unit');
  }
  
  /**
   * Generic helper to set channel information in XML.
   * @private
   * @param {string[]} chInfos - Array of values to set
   * @param {string} name - Property name ('label', 'type', or 'unit')
   * @throws {Error} If array length doesn't match channel count
   */
  private _setChannelInfo(chInfos: string[], name: string): void {
    if (chInfos.length !== this.channelCount()) {
      throw new Error(
        `The number of provided channel ${name} ${chInfos.length} ` +
        `must match the number of channels ${this.channelCount()}.`
      );
    }
    
    // Ensure channels element exists
    const channels = StreamInfo._addFirstNode(this.desc.bind(this), 'channels');
    let ch = channels.child('channel');
    
    // Set info for each channel
    for (const chInfo of chInfos) {
      // Create channel element if needed
      ch = ch.empty() ? channels.appendChild('channel') : ch;
      StreamInfo._setDescriptionNode(ch, { [name]: chInfo });
      ch = ch.nextSibling();
    }
    
    // Remove any extra channel elements
    StreamInfo._pruneDescriptionNode(ch, channels);
  }
  
  /**
   * Helper to ensure an XML node exists, creating it if necessary.
   * @private
   */
  private static _addFirstNode(desc: () => XMLElement, name: string): XMLElement {
    const node = desc().child(name);
    return node.empty() ? desc().appendChild(name) : node;
  }
  
  /**
   * Helper to remove excess XML nodes.
   * @private
   */
  private static _pruneDescriptionNode(node: XMLElement, parent: XMLElement): void {
    while (!node.empty()) {
      const nodeNext = node.nextSibling();
      parent.removeChild(node);
      node = nodeNext;
    }
  }
  
  /**
   * Helper to set values in XML nodes.
   * @private
   */
  private static _setDescriptionNode(node: XMLElement, mapping: { [key: string]: string }): void {
    for (const [key, value] of Object.entries(mapping)) {
      // Value is already a string since mapping is { [key: string]: string }
      if (node.child(key).empty()) {
        node.appendChildValue(key, value);
      } else {
        node.child(key).firstChild().setValue(value);
      }
    }
  }
  
  /**
   * Get the internal C object handle.
   * @internal Used by StreamOutlet and StreamInlet
   * @returns {any} Pointer to the C streaminfo object
   */
  getHandle(): any {
    return this.obj;
  }
}

/**
 * Represents an XML element in the stream description.
 * 
 * XMLElement provides methods for navigating and manipulating the XML tree
 * structure that stores extended stream metadata. This is used for channel
 * descriptions, hardware settings, synchronization parameters, etc.
 * 
 * @example
 * ```typescript
 * const desc = info.desc();
 * const acq = desc.appendChild('acquisition');
 * acq.appendChildValue('manufacturer', 'ACME');
 * acq.appendChildValue('model', 'StreamMaster3000');
 * ```
 * 
 * @class
 */
export class XMLElement {
  /** Pointer to the underlying LSL XML element */
  private e: any;
  
  /**
   * Creates an XMLElement wrapper.
   * @internal Created internally by StreamInfo methods
   * @param {any} handle - C XML element pointer
   */
  constructor(handle: any) {
    this.e = handle;
  }
  
  /* ============================================================================
   * TREE NAVIGATION
   * Methods for traversing the XML tree structure
   * ============================================================================ */
  firstChild(): XMLElement {
    return new XMLElement(lsl_first_child(this.e));
  }
  
  lastChild(): XMLElement {
    return new XMLElement(lsl_last_child(this.e));
  }
  
  child(name: string): XMLElement {
    return new XMLElement(lsl_child(this.e, name));
  }
  
  nextSibling(name?: string): XMLElement {
    if (name === undefined) {
      return new XMLElement(lsl_next_sibling(this.e));
    } else {
      return new XMLElement(lsl_next_sibling_n(this.e, name));
    }
  }
  
  previousSibling(name?: string): XMLElement {
    if (name === undefined) {
      return new XMLElement(lsl_previous_sibling(this.e));
    } else {
      return new XMLElement(lsl_previous_sibling_n(this.e, name));
    }
  }
  
  parent(): XMLElement {
    return new XMLElement(lsl_parent(this.e));
  }
  

  /* ============================================================================
   * CONTENT QUERIES
   * Methods for inspecting element content
   * ============================================================================ */
  empty(): boolean {
    return Boolean(lsl_empty(this.e));
  }
  
  isText(): boolean {
    return Boolean(lsl_is_text(this.e));
  }
  
  name(): string {
    return lsl_name(this.e) || '';
  }
  
  value(): string {
    return lsl_value(this.e) || '';
  }
  
  childValue(name?: string): string {
    if (name === undefined) {
      return lsl_child_value(this.e) || '';
    } else {
      return lsl_child_value_n(this.e, name) || '';
    }
  }
  

  /* ============================================================================
   * MODIFICATION
   * Methods for modifying the XML tree
   * ============================================================================ */
  appendChildValue(name: string, value: string): XMLElement {
    return new XMLElement(lsl_append_child_value(this.e, name, value));
  }
  
  prependChildValue(name: string, value: string): XMLElement {
    return new XMLElement(lsl_prepend_child_value(this.e, name, value));
  }
  
  setChildValue(name: string, value: string): XMLElement {
    lsl_set_child_value(this.e, name, value);
    return this;
  }
  
  setName(name: string): boolean {
    return Boolean(lsl_set_name(this.e, name));
  }
  
  setValue(value: string): boolean {
    return Boolean(lsl_set_value(this.e, value));
  }
  
  appendChild(name: string): XMLElement {
    return new XMLElement(lsl_append_child(this.e, name));
  }
  
  prependChild(name: string): XMLElement {
    return new XMLElement(lsl_prepend_child(this.e, name));
  }
  
  appendCopy(elem: XMLElement): XMLElement {
    return new XMLElement(lsl_append_copy(this.e, elem.e));
  }
  
  prependCopy(elem: XMLElement): XMLElement {
    return new XMLElement(lsl_prepend_copy(this.e, elem.e));
  }
  
  removeChild(rhs: XMLElement | string): void {
    if (rhs instanceof XMLElement) {
      lsl_remove_child(this.e, rhs.e);
    } else {
      lsl_remove_child_n(this.e, rhs);
    }
  }
}