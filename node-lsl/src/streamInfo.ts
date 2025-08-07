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

export class StreamInfo {
  private obj: any; // Pointer to the LSL streaminfo object
  
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
      // Create from existing handle
      this.obj = handle;
    } else {
      // Convert string format to number if needed
      if (typeof channelFormat === 'string') {
        channelFormat = string2fmt[channelFormat];
        if (channelFormat === undefined) {
          throw new Error(`Unknown channel format: ${channelFormat}`);
        }
      }
      
      // Generate source_id if not provided
      if (sourceId === null || sourceId === undefined) {
        // Create a hash-like source_id from the parameters
        const hashInput = `${name}${type}${channelCount}${nominalSrate}${channelFormat}`;
        let hash = 0;
        for (let i = 0; i < hashInput.length; i++) {
          const char = hashInput.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash; // Convert to 32bit integer
        }
        sourceId = hash.toString();
        console.log(
          `Generated source_id: '${sourceId}' for StreamInfo with name '${name}', type '${type}', ` +
          `channel_count ${channelCount}, nominal_srate ${nominalSrate}, ` +
          `and channel_format ${channelFormat}.`
        );
      }
      
      // Create the streaminfo object
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
    }
  }
  
  // Destructor - called when object is garbage collected
  destroy(): void {
    if (this.obj) {
      try {
        lsl_destroy_streaminfo(this.obj);
      } catch (e) {
        console.error('StreamInfo deletion triggered error:', e);
      }
      this.obj = null;
    }
  }
  
  // Core Information (assigned at construction)
  name(): string {
    return lsl_get_name(this.obj);
  }
  
  type(): string {
    return lsl_get_type(this.obj);
  }
  
  channelCount(): number {
    return lsl_get_channel_count(this.obj);
  }
  
  nominalSrate(): number {
    return lsl_get_nominal_srate(this.obj);
  }
  
  channelFormat(): number {
    return lsl_get_channel_format(this.obj);
  }
  
  sourceId(): string {
    return lsl_get_source_id(this.obj);
  }
  
  // Hosting Information (assigned when bound to an outlet/inlet)
  version(): number {
    return lsl_get_version(this.obj);
  }
  
  createdAt(): number {
    return lsl_get_created_at(this.obj);
  }
  
  uid(): string {
    return lsl_get_uid(this.obj);
  }
  
  sessionId(): string {
    return lsl_get_session_id(this.obj);
  }
  
  hostname(): string {
    return lsl_get_hostname(this.obj);
  }
  
  // Data Description
  desc(): XMLElement {
    return new XMLElement(lsl_get_desc(this.obj));
  }
  
  asXml(): string {
    return lsl_get_xml(this.obj);
  }
  
  // Channel metadata methods
  getChannelLabels(): string[] | null {
    return this._getChannelInfo('label');
  }
  
  getChannelTypes(): string[] | null {
    return this._getChannelInfo('type');
  }
  
  getChannelUnits(): string[] | null {
    return this._getChannelInfo('unit');
  }
  
  private _getChannelInfo(name: string): string[] | null {
    const desc = this.desc();
    if (desc.child('channels').empty()) {
      return null;
    }
    
    const chInfos: (string | null)[] = [];
    const channels = desc.child('channels');
    let ch = channels.child('channel');
    
    while (!ch.empty()) {
      const chInfo = ch.child(name).firstChild().value();
      if (chInfo.length !== 0) {
        chInfos.push(chInfo);
      } else {
        chInfos.push(null);
      }
      ch = ch.nextSibling();
    }
    
    if (chInfos.every(info => info === null)) {
      return null;
    }
    
    if (chInfos.length !== this.channelCount()) {
      console.warn(
        `The stream description contains ${chInfos.length} elements for ` +
        `${this.channelCount()} channels.`
      );
    }
    
    return chInfos.filter(info => info !== null) as string[];
  }
  
  setChannelLabels(labels: string[]): void {
    this._setChannelInfo(labels, 'label');
  }
  
  setChannelTypes(types: string | string[]): void {
    const typeArray = typeof types === 'string' 
      ? new Array(this.channelCount()).fill(types)
      : types;
    this._setChannelInfo(typeArray, 'type');
  }
  
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
  
  private _setChannelInfo(chInfos: string[], name: string): void {
    if (chInfos.length !== this.channelCount()) {
      throw new Error(
        `The number of provided channel ${name} ${chInfos.length} ` +
        `must match the number of channels ${this.channelCount()}.`
      );
    }
    
    const channels = StreamInfo._addFirstNode(this.desc.bind(this), 'channels');
    let ch = channels.child('channel');
    
    for (const chInfo of chInfos) {
      ch = ch.empty() ? channels.appendChild('channel') : ch;
      StreamInfo._setDescriptionNode(ch, { [name]: chInfo });
      ch = ch.nextSibling();
    }
    
    StreamInfo._pruneDescriptionNode(ch, channels);
  }
  
  private static _addFirstNode(desc: () => XMLElement, name: string): XMLElement {
    const node = desc().child(name);
    return node.empty() ? desc().appendChild(name) : node;
  }
  
  private static _pruneDescriptionNode(node: XMLElement, parent: XMLElement): void {
    while (!node.empty()) {
      const nodeNext = node.nextSibling();
      parent.removeChild(node);
      node = nodeNext;
    }
  }
  
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
  
  // Get the internal handle (for use by other classes)
  getHandle(): any {
    return this.obj;
  }
}

export class XMLElement {
  private e: any; // Pointer to the XML element
  
  constructor(handle: any) {
    this.e = handle;
  }
  
  // Tree Navigation
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
  
  // Content Queries
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
  
  // Modification
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