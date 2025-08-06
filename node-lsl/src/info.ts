import * as koffi from 'koffi';
import {
  StreamInfoHandle,
  XMLPtr,
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
  lsl_first_child,
  lsl_last_child,
  lsl_next_sibling,
  lsl_previous_sibling,
  lsl_parent,
  lsl_child,
  lsl_next_sibling_n,
  lsl_previous_sibling_n,
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
  lsl_remove_child_n,
  lsl_remove_child,
} from './lib';
import { IRREGULAR_RATE, cfFloat32, string2fmt } from './util';

/**
 * XMLElement class for handling LSL XML descriptions
 */
export class XMLElement {
  private handle: any;

  constructor(handle: any) {
    this.handle = handle;
  }

  // Tree navigation
  firstChild(): XMLElement | null {
    const child = lsl_first_child(this.handle);
    return child ? new XMLElement(child) : null;
  }

  lastChild(): XMLElement | null {
    const child = lsl_last_child(this.handle);
    return child ? new XMLElement(child) : null;
  }

  child(name: string): XMLElement | null {
    const child = lsl_child(this.handle, name);
    return child ? new XMLElement(child) : null;
  }

  nextSibling(name?: string): XMLElement | null {
    const sibling = name 
      ? lsl_next_sibling_n(this.handle, name)
      : lsl_next_sibling(this.handle);
    return sibling ? new XMLElement(sibling) : null;
  }

  previousSibling(name?: string): XMLElement | null {
    const sibling = name
      ? lsl_previous_sibling_n(this.handle, name)
      : lsl_previous_sibling(this.handle);
    return sibling ? new XMLElement(sibling) : null;
  }

  parent(): XMLElement | null {
    const parent = lsl_parent(this.handle);
    return parent ? new XMLElement(parent) : null;
  }

  // Content queries
  empty(): boolean {
    return lsl_empty(this.handle) !== 0;
  }

  isText(): boolean {
    return lsl_is_text(this.handle) !== 0;
  }

  name(): string {
    return lsl_name(this.handle) || '';
  }

  value(): string {
    return lsl_value(this.handle) || '';
  }

  childValue(name?: string): string {
    if (name) {
      return lsl_child_value_n(this.handle, name) || '';
    }
    return lsl_child_value(this.handle) || '';
  }

  // Modification
  appendChildValue(name: string, value: string): XMLElement {
    const child = lsl_append_child_value(this.handle, name, value);
    return new XMLElement(child);
  }

  prependChildValue(name: string, value: string): XMLElement {
    const child = lsl_prepend_child_value(this.handle, name, value);
    return new XMLElement(child);
  }

  setChildValue(name: string, value: string): boolean {
    return lsl_set_child_value(this.handle, name, value) !== 0;
  }

  setName(name: string): boolean {
    return lsl_set_name(this.handle, name) !== 0;
  }

  setValue(value: string): boolean {
    return lsl_set_value(this.handle, value) !== 0;
  }

  appendChild(name: string): XMLElement {
    const child = lsl_append_child(this.handle, name);
    return new XMLElement(child);
  }

  prependChild(name: string): XMLElement {
    const child = lsl_prepend_child(this.handle, name);
    return new XMLElement(child);
  }

  appendCopy(other: XMLElement): XMLElement {
    const copy = lsl_append_copy(this.handle, other.handle);
    return new XMLElement(copy);
  }

  prependCopy(other: XMLElement): XMLElement {
    const copy = lsl_prepend_copy(this.handle, other.handle);
    return new XMLElement(copy);
  }

  removeChild(name: string | XMLElement): void {
    if (typeof name === 'string') {
      lsl_remove_child_n(this.handle, name);
    } else {
      lsl_remove_child(this.handle, name.handle);
    }
  }
}

/**
 * StreamInfo class stores the declaration of a data stream.
 */
export class StreamInfo {
  private handle: any;
  private destroyed: boolean = false;

  /**
   * Construct a new StreamInfo object.
   * 
   * @param name - Name of the stream. Describes the device (or product series)
   * @param type - Content type of the stream (e.g., "EEG", "Gaze")
   * @param channelCount - Number of channels per sample (default 1)
   * @param nominalSrate - The sampling rate (in Hz) as advertised by the data source (default IRREGULAR_RATE)
   * @param channelFormat - Format/type of each channel (default cfFloat32)
   * @param sourceId - Unique identifier of the device or source of the data
   * @param handle - Internal handle for copying (used internally)
   */
  constructor(
    name: string = 'untitled',
    type: string = '',
    channelCount: number = 1,
    nominalSrate: number = IRREGULAR_RATE,
    channelFormat: number | string = cfFloat32,
    sourceId?: string,
    handle?: any
  ) {
    if (handle) {
      // Internal use: wrap existing handle
      this.handle = handle;
    } else {
      // Convert string format to number if needed
      if (typeof channelFormat === 'string') {
        channelFormat = string2fmt[channelFormat];
      }

      // Generate source ID if not provided
      if (sourceId === undefined || sourceId === null) {
        sourceId = String(this.hashCode(name, type, channelCount, nominalSrate, channelFormat));
        console.log(
          `Generated source_id: '${sourceId}' for StreamInfo with name '${name}', type '${type}', ` +
          `channel_count ${channelCount}, nominal_srate ${nominalSrate}, and channel_format ${channelFormat}.`
        );
      }

      this.handle = lsl_create_streaminfo(
        name,
        type,
        channelCount,
        nominalSrate,
        channelFormat,
        sourceId
      );

      if (!this.handle) {
        throw new Error('Could not create stream description object.');
      }
    }
  }

  private hashCode(...args: any[]): number {
    const str = JSON.stringify(args);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  }

  /**
   * Destroy the StreamInfo object.
   */
  destroy(): void {
    if (!this.destroyed && this.handle) {
      try {
        lsl_destroy_streaminfo(this.handle);
        this.destroyed = true;
      } catch (e) {
        console.error('StreamInfo deletion triggered error:', e);
      }
    }
  }

  // Core information getters
  getName(): string {
    return lsl_get_name(this.handle) || '';
  }

  getType(): string {
    return lsl_get_type(this.handle) || '';
  }

  getChannelCount(): number {
    return lsl_get_channel_count(this.handle);
  }

  getNominalSrate(): number {
    return lsl_get_nominal_srate(this.handle);
  }

  getChannelFormat(): number {
    return lsl_get_channel_format(this.handle);
  }

  getSourceId(): string {
    return lsl_get_source_id(this.handle) || '';
  }

  // Hosting information
  getVersion(): number {
    return lsl_get_version(this.handle);
  }

  getCreatedAt(): number {
    return lsl_get_created_at(this.handle);
  }

  getUid(): string {
    return lsl_get_uid(this.handle) || '';
  }

  getSessionId(): string {
    return lsl_get_session_id(this.handle) || '';
  }

  getHostname(): string {
    return lsl_get_hostname(this.handle) || '';
  }

  // XML description
  getDesc(): XMLElement {
    const desc = lsl_get_desc(this.handle);
    return new XMLElement(desc);
  }

  asXml(): string {
    return lsl_get_xml(this.handle) || '';
  }

  // Channel metadata helper methods
  getChannelLabels(): string[] {
    const labels: string[] = [];
    const desc = this.getDesc();
    const channels = desc.child('channels');
    
    if (channels) {
      let channel = channels.firstChild();
      while (channel) {
        const label = channel.child('label');
        if (label) {
          labels.push(label.childValue());
        }
        channel = channel.nextSibling();
      }
    }
    
    return labels;
  }

  getChannelTypes(): string[] {
    const types: string[] = [];
    const desc = this.getDesc();
    const channels = desc.child('channels');
    
    if (channels) {
      let channel = channels.firstChild();
      while (channel) {
        const type = channel.child('type');
        if (type) {
          types.push(type.childValue());
        }
        channel = channel.nextSibling();
      }
    }
    
    return types;
  }

  getChannelUnits(): string[] {
    const units: string[] = [];
    const desc = this.getDesc();
    const channels = desc.child('channels');
    
    if (channels) {
      let channel = channels.firstChild();
      while (channel) {
        const unit = channel.child('unit');
        if (unit) {
          units.push(unit.childValue());
        }
        channel = channel.nextSibling();
      }
    }
    
    return units;
  }

  setChannelLabels(labels: string[]): void {
    const desc = this.getDesc();
    let channels = desc.child('channels');
    if (!channels) {
      channels = desc.appendChild('channels');
    }
    
    // Remove existing channels
    while (channels.firstChild()) {
      channels.removeChild(channels.firstChild()!);
    }
    
    // Add new channels with labels
    for (const label of labels) {
      const channel = channels.appendChild('channel');
      channel.appendChildValue('label', label);
    }
  }

  setChannelTypes(types: string[]): void {
    const desc = this.getDesc();
    let channels = desc.child('channels');
    if (!channels) {
      channels = desc.appendChild('channels');
    }
    
    let channel = channels.firstChild();
    for (const type of types) {
      if (!channel) {
        channel = channels.appendChild('channel');
      }
      let typeNode = channel.child('type');
      if (!typeNode) {
        channel.appendChildValue('type', type);
      } else {
        typeNode.setValue(type);
      }
      channel = channel.nextSibling();
    }
  }

  setChannelUnits(units: string[]): void {
    const desc = this.getDesc();
    let channels = desc.child('channels');
    if (!channels) {
      channels = desc.appendChild('channels');
    }
    
    let channel = channels.firstChild();
    for (const unit of units) {
      if (!channel) {
        channel = channels.appendChild('channel');
      }
      let unitNode = channel.child('unit');
      if (!unitNode) {
        channel.appendChildValue('unit', unit);
      } else {
        unitNode.setValue(unit);
      }
      channel = channel.nextSibling();
    }
  }

  // Copy the stream info
  copy(): StreamInfo {
    const handle = lsl_copy_streaminfo(this.handle);
    return new StreamInfo('', '', 0, 0, 0, '', handle);
  }

  // Get the internal handle (for internal use)
  getHandle(): any {
    return this.handle;
  }
}