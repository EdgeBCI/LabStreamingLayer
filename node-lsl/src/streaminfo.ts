import * as ref from 'ref-napi';
import * as crypto from 'crypto';
import { lib, StreamInfoHandle, XMLHandle } from './lib';
import { ChannelFormat, IRREGULAR_RATE, channelFormatToString } from './constants';

/**
 * XMLElement represents an XML element for stream metadata
 */
export class XMLElement {
  private handle: Buffer;
  private owned: boolean;

  constructor(handle: Buffer, owned = false) {
    this.handle = handle;
    this.owned = owned;
  }

  /**
   * Get the first child element
   */
  firstChild(): XMLElement | null {
    const child = lib.lsl_first_child(this.handle);
    return ref.isNull(child) ? null : new XMLElement(child);
  }

  /**
   * Get the last child element
   */
  lastChild(): XMLElement | null {
    const child = lib.lsl_last_child(this.handle);
    return ref.isNull(child) ? null : new XMLElement(child);
  }

  /**
   * Get the next sibling element
   */
  nextSibling(): XMLElement | null {
    const sibling = lib.lsl_next_sibling(this.handle);
    return ref.isNull(sibling) ? null : new XMLElement(sibling);
  }

  /**
   * Get the previous sibling element
   */
  previousSibling(): XMLElement | null {
    const sibling = lib.lsl_previous_sibling(this.handle);
    return ref.isNull(sibling) ? null : new XMLElement(sibling);
  }

  /**
   * Get the parent element
   */
  parent(): XMLElement | null {
    const parent = lib.lsl_parent(this.handle);
    return ref.isNull(parent) ? null : new XMLElement(parent);
  }

  /**
   * Get a child element by name
   */
  child(name: string): XMLElement | null {
    const child = lib.lsl_child(this.handle, name);
    return ref.isNull(child) ? null : new XMLElement(child);
  }

  /**
   * Get the next sibling with a specific name
   */
  nextSiblingByName(name: string): XMLElement | null {
    const sibling = lib.lsl_next_sibling_n(this.handle, name);
    return ref.isNull(sibling) ? null : new XMLElement(sibling);
  }

  /**
   * Check if the element is empty
   */
  isEmpty(): boolean {
    return lib.lsl_empty(this.handle) !== 0;
  }

  /**
   * Check if the element is text
   */
  isText(): boolean {
    return lib.lsl_is_text(this.handle) !== 0;
  }

  /**
   * Get the element name
   */
  name(): string {
    return lib.lsl_name(this.handle) || '';
  }

  /**
   * Get the element value
   */
  value(): string {
    return lib.lsl_value(this.handle) || '';
  }

  /**
   * Get child value
   */
  childValue(name?: string): string {
    if (name) {
      return lib.lsl_child_value_n(this.handle, name) || '';
    }
    return lib.lsl_child_value(this.handle) || '';
  }

  /**
   * Append a child element with a value
   */
  appendChildValue(name: string, value: string): XMLElement {
    const child = lib.lsl_append_child_value(this.handle, name, value);
    return new XMLElement(child);
  }

  /**
   * Prepend a child element with a value
   */
  prependChildValue(name: string, value: string): XMLElement {
    const child = lib.lsl_prepend_child_value(this.handle, name, value);
    return new XMLElement(child);
  }

  /**
   * Set child value
   */
  setChildValue(name: string, value: string): boolean {
    return lib.lsl_set_child_value(this.handle, name, value) !== 0;
  }

  /**
   * Set the element name
   */
  setName(name: string): boolean {
    return lib.lsl_set_name(this.handle, name) !== 0;
  }

  /**
   * Set the element value
   */
  setValue(value: string): boolean {
    return lib.lsl_set_value(this.handle, value) !== 0;
  }

  /**
   * Append a child element
   */
  appendChild(name: string): XMLElement {
    const child = lib.lsl_append_child(this.handle, name);
    return new XMLElement(child);
  }

  /**
   * Prepend a child element
   */
  prependChild(name: string): XMLElement {
    const child = lib.lsl_prepend_child(this.handle, name);
    return new XMLElement(child);
  }

  /**
   * Remove a child by name
   */
  removeChild(name: string): void {
    lib.lsl_remove_child_n(this.handle, name);
  }

  /**
   * Get the internal handle
   */
  getHandle(): Buffer {
    return this.handle;
  }
}

/**
 * StreamInfo represents the metadata of a stream
 */
export class StreamInfo {
  private handle: Buffer;
  private owned: boolean;

  /**
   * Create a new StreamInfo object
   * @param nameOrHandle Either a stream name or an existing handle
   * @param type Stream type (e.g., 'EEG', 'Markers')
   * @param channelCount Number of channels
   * @param nominalSrate Nominal sampling rate (use 0 or IRREGULAR_RATE for irregular rate)
   * @param channelFormat Data format of channels
   * @param sourceId Unique source identifier (auto-generated if empty)
   */
  constructor(
    nameOrHandle: string | Buffer = 'untitled',
    type = '',
    channelCount = 1,
    nominalSrate = IRREGULAR_RATE,
    channelFormat = ChannelFormat.Float32,
    sourceId = ''
  ) {
    if (Buffer.isBuffer(nameOrHandle)) {
      // Existing handle passed
      this.handle = nameOrHandle;
      this.owned = false;
    } else {
      // Create new StreamInfo
      const name = nameOrHandle;
      
      // Auto-generate source_id if not provided
      if (!sourceId) {
        const hostname = require('os').hostname();
        const timestamp = Date.now();
        const random = crypto.randomBytes(4).toString('hex');
        sourceId = `${hostname}_${name}_${timestamp}_${random}`;
      }

      this.handle = lib.lsl_create_streaminfo(
        name,
        type,
        channelCount,
        nominalSrate,
        channelFormat,
        sourceId
      );
      this.owned = true;
    }

    // Set up finalizer for automatic cleanup
    if (this.owned && typeof FinalizationRegistry !== 'undefined') {
      const registry = new FinalizationRegistry((handle: Buffer) => {
        try {
          lib.lsl_destroy_streaminfo(handle);
        } catch (e) {
          // Ignore errors during cleanup
        }
      });
      registry.register(this, this.handle);
    }
  }

  /**
   * Destroy the StreamInfo object explicitly
   */
  destroy(): void {
    if (this.owned && this.handle) {
      lib.lsl_destroy_streaminfo(this.handle);
      this.owned = false;
    }
  }

  /**
   * Get the stream name
   */
  name(): string {
    return lib.lsl_get_name(this.handle) || '';
  }

  /**
   * Get the stream type
   */
  type(): string {
    return lib.lsl_get_type(this.handle) || '';
  }

  /**
   * Get the number of channels
   */
  channelCount(): number {
    return lib.lsl_get_channel_count(this.handle);
  }

  /**
   * Get the nominal sampling rate
   */
  nominalSrate(): number {
    return lib.lsl_get_nominal_srate(this.handle);
  }

  /**
   * Get the channel format
   */
  channelFormat(): ChannelFormat {
    return lib.lsl_get_channel_format(this.handle) as ChannelFormat;
  }

  /**
   * Get the channel format as a string
   */
  channelFormatString(): string {
    return channelFormatToString(this.channelFormat());
  }

  /**
   * Get the source identifier
   */
  sourceId(): string {
    return lib.lsl_get_source_id(this.handle) || '';
  }

  /**
   * Get the protocol version
   */
  version(): number {
    return lib.lsl_get_version(this.handle);
  }

  /**
   * Get the creation timestamp
   */
  createdAt(): number {
    return lib.lsl_get_created_at(this.handle);
  }

  /**
   * Get the unique identifier
   */
  uid(): string {
    return lib.lsl_get_uid(this.handle) || '';
  }

  /**
   * Get the session identifier
   */
  sessionId(): string {
    return lib.lsl_get_session_id(this.handle) || '';
  }

  /**
   * Get the hostname
   */
  hostname(): string {
    return lib.lsl_get_hostname(this.handle) || '';
  }

  /**
   * Get the extended description as XMLElement
   */
  desc(): XMLElement {
    const descHandle = lib.lsl_get_desc(this.handle);
    return new XMLElement(descHandle);
  }

  /**
   * Get the full stream info as XML string
   */
  asXml(): string {
    return lib.lsl_get_xml(this.handle) || '';
  }

  /**
   * Check if the stream matches a query
   */
  matchesQuery(query: string): boolean {
    return lib.lsl_stream_info_matches_query(this.handle, query) !== 0;
  }

  /**
   * Get the internal handle
   */
  getHandle(): Buffer {
    return this.handle;
  }

  /**
   * Create a copy of this StreamInfo
   */
  copy(): StreamInfo {
    const newHandle = lib.lsl_copy_streaminfo(this.handle);
    return new StreamInfo(newHandle);
  }

  /**
   * Helper method to set up channel labels
   */
  setupChannels(labels: string[], units?: string[], types?: string[]): void {
    const desc = this.desc();
    const channels = desc.appendChild('channels');
    const channelCount = this.channelCount();

    for (let i = 0; i < channelCount; i++) {
      const channel = channels.appendChild('channel');
      
      if (labels && labels[i]) {
        channel.appendChildValue('label', labels[i]);
      }
      
      if (units && units[i]) {
        channel.appendChildValue('unit', units[i]);
      }
      
      if (types && types[i]) {
        channel.appendChildValue('type', types[i]);
      }
    }
  }
}