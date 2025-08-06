import * as crypto from 'crypto';
import { 
  lsl_create_streaminfo,
  lsl_destroy_streaminfo,
  lsl_copy_streaminfo,
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
  lsl_stream_info_matches_query,
  lsl_first_child,
  lsl_last_child,
  lsl_next_sibling,
  lsl_previous_sibling,
  lsl_parent,
  lsl_child,
  lsl_next_sibling_n,
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
  lsl_remove_child_n
} from './lib';
import { ChannelFormat, IRREGULAR_RATE, channelFormatToString } from './constants';

/**
 * XMLElement represents an XML element for stream metadata
 */
export class XMLElement {
  private handle: any; // koffi pointer

  constructor(handle: any) {
    this.handle = handle;
  }

  /**
   * Get the first child element
   */
  firstChild(): XMLElement | null {
    const child = lsl_first_child(this.handle);
    return !child ? null : new XMLElement(child);
  }

  /**
   * Get the last child element
   */
  lastChild(): XMLElement | null {
    const child = lsl_last_child(this.handle);
    return !child ? null : new XMLElement(child);
  }

  /**
   * Get the next sibling element
   */
  nextSibling(): XMLElement | null {
    const sibling = lsl_next_sibling(this.handle);
    return !sibling ? null : new XMLElement(sibling);
  }

  /**
   * Get the previous sibling element
   */
  previousSibling(): XMLElement | null {
    const sibling = lsl_previous_sibling(this.handle);
    return !sibling ? null : new XMLElement(sibling);
  }

  /**
   * Get the parent element
   */
  parent(): XMLElement | null {
    const parent = lsl_parent(this.handle);
    return !parent ? null : new XMLElement(parent);
  }

  /**
   * Get a child element by name
   */
  child(name: string): XMLElement | null {
    const child = lsl_child(this.handle, name);
    return !child ? null : new XMLElement(child);
  }

  /**
   * Get the next sibling with a specific name
   */
  nextSiblingByName(name: string): XMLElement | null {
    const sibling = lsl_next_sibling_n(this.handle, name);
    return !sibling ? null : new XMLElement(sibling);
  }

  /**
   * Check if the element is empty
   */
  isEmpty(): boolean {
    return lsl_empty(this.handle) !== 0;
  }

  /**
   * Check if the element is text
   */
  isText(): boolean {
    return lsl_is_text(this.handle) !== 0;
  }

  /**
   * Get the element name
   */
  name(): string {
    return lsl_name(this.handle) || '';
  }

  /**
   * Get the element value
   */
  value(): string {
    return lsl_value(this.handle) || '';
  }

  /**
   * Get child value
   */
  childValue(name?: string): string {
    if (name) {
      return lsl_child_value_n(this.handle, name) || '';
    }
    return lsl_child_value(this.handle) || '';
  }

  /**
   * Append a child element with a value
   */
  appendChildValue(name: string, value: string): XMLElement {
    const child = lsl_append_child_value(this.handle, name, value);
    return new XMLElement(child);
  }

  /**
   * Prepend a child element with a value
   */
  prependChildValue(name: string, value: string): XMLElement {
    const child = lsl_prepend_child_value(this.handle, name, value);
    return new XMLElement(child);
  }

  /**
   * Set child value
   */
  setChildValue(name: string, value: string): boolean {
    return lsl_set_child_value(this.handle, name, value) !== 0;
  }

  /**
   * Set the element name
   */
  setName(name: string): boolean {
    return lsl_set_name(this.handle, name) !== 0;
  }

  /**
   * Set the element value
   */
  setValue(value: string): boolean {
    return lsl_set_value(this.handle, value) !== 0;
  }

  /**
   * Append a child element
   */
  appendChild(name: string): XMLElement {
    const child = lsl_append_child(this.handle, name);
    return new XMLElement(child);
  }

  /**
   * Prepend a child element
   */
  prependChild(name: string): XMLElement {
    const child = lsl_prepend_child(this.handle, name);
    return new XMLElement(child);
  }

  /**
   * Remove a child by name
   */
  removeChild(name: string): void {
    lsl_remove_child_n(this.handle, name);
  }

  /**
   * Get the internal handle
   */
  getHandle(): any {
    return this.handle;
  }
}

/**
 * StreamInfo represents the metadata of a stream
 */
export class StreamInfo {
  private handle: any; // koffi pointer
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
    nameOrHandle: string | any = 'untitled',
    type = '',
    channelCount = 1,
    nominalSrate = IRREGULAR_RATE,
    channelFormat = ChannelFormat.Float32,
    sourceId = ''
  ) {
    if (typeof nameOrHandle !== 'string') {
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

      this.handle = lsl_create_streaminfo(
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
      const registry = new FinalizationRegistry((handle: any) => {
        try {
          lsl_destroy_streaminfo(handle);
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
      lsl_destroy_streaminfo(this.handle);
      this.owned = false;
    }
  }

  /**
   * Get the stream name
   */
  name(): string {
    return lsl_get_name(this.handle) || '';
  }

  /**
   * Get the stream type
   */
  type(): string {
    return lsl_get_type(this.handle) || '';
  }

  /**
   * Get the number of channels
   */
  channelCount(): number {
    return lsl_get_channel_count(this.handle);
  }

  /**
   * Get the nominal sampling rate
   */
  nominalSrate(): number {
    return lsl_get_nominal_srate(this.handle);
  }

  /**
   * Get the channel format
   */
  channelFormat(): ChannelFormat {
    return lsl_get_channel_format(this.handle) as ChannelFormat;
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
    return lsl_get_source_id(this.handle) || '';
  }

  /**
   * Get the protocol version
   */
  version(): number {
    return lsl_get_version(this.handle);
  }

  /**
   * Get the creation timestamp
   */
  createdAt(): number {
    return lsl_get_created_at(this.handle);
  }

  /**
   * Get the unique identifier
   */
  uid(): string {
    return lsl_get_uid(this.handle) || '';
  }

  /**
   * Get the session identifier
   */
  sessionId(): string {
    return lsl_get_session_id(this.handle) || '';
  }

  /**
   * Get the hostname
   */
  hostname(): string {
    return lsl_get_hostname(this.handle) || '';
  }

  /**
   * Get the extended description as XMLElement
   */
  desc(): XMLElement {
    const descHandle = lsl_get_desc(this.handle);
    return new XMLElement(descHandle);
  }

  /**
   * Get the full stream info as XML string
   */
  asXml(): string {
    return lsl_get_xml(this.handle) || '';
  }

  /**
   * Check if the stream matches a query
   */
  matchesQuery(query: string): boolean {
    return lsl_stream_info_matches_query(this.handle, query) !== 0;
  }

  /**
   * Get the internal handle
   */
  getHandle(): any {
    return this.handle;
  }

  /**
   * Create a copy of this StreamInfo
   */
  copy(): StreamInfo {
    const newHandle = lsl_copy_streaminfo(this.handle);
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