import { StreamInfo, XMLElement, cfFloat32, cfDouble64, cfString, cfInt32 } from '../src';

describe('StreamInfo', () => {
  describe('constructor', () => {
    it('should create a StreamInfo with basic parameters', () => {
      const info = new StreamInfo('TestStream', 'Test', 8, 100, cfFloat32, 'test123');
      
      expect(info.getName()).toBe('TestStream');
      expect(info.getType()).toBe('Test');
      expect(info.getChannelCount()).toBe(8);
      expect(info.getNominalSrate()).toBe(100);
      expect(info.getChannelFormat()).toBe(cfFloat32);
      expect(info.getSourceId()).toBe('test123');
    });

    it('should create a StreamInfo with default source_id', () => {
      const info = new StreamInfo('TestStream', 'Test', 8, 100, cfFloat32);
      
      expect(info.getSourceId()).toBeTruthy();
      expect(info.getSourceId()).not.toBe('');
    });

    it('should handle different channel formats', () => {
      const formats = [cfFloat32, cfDouble64, cfString, cfInt32];
      
      formats.forEach(format => {
        const info = new StreamInfo('Test', 'Test', 1, 0, format);
        expect(info.getChannelFormat()).toBe(format);
      });
    });
  });

  describe('metadata methods', () => {
    it('should return correct metadata', () => {
      const info = new StreamInfo('TestStream', 'EEG', 32, 250, cfFloat32);
      
      expect(info.getVersion()).toBeGreaterThan(0);
      expect(info.getCreatedAt()).toBeGreaterThan(0);
      expect(info.getUID()).toBeTruthy();
      expect(info.getSessionId()).toBeTruthy();
      expect(info.getHostname()).toBeTruthy();
    });
  });

  describe('XML description', () => {
    it('should get and manipulate XML description', () => {
      const info = new StreamInfo('TestStream', 'Test', 2, 100, cfFloat32);
      const desc = info.desc();
      
      expect(desc).toBeInstanceOf(XMLElement);
      
      // Add channel labels
      const channels = desc.appendChild('channels');
      const ch1 = channels.appendChild('channel');
      ch1.appendChildValue('label', 'Channel1');
      ch1.appendChildValue('unit', 'microvolts');
      ch1.appendChildValue('type', 'EEG');
      
      const ch2 = channels.appendChild('channel');
      ch2.appendChildValue('label', 'Channel2');
      ch2.appendChildValue('unit', 'microvolts');
      ch2.appendChildValue('type', 'EEG');
      
      // Verify the structure
      const channelsNode = desc.child('channels');
      expect(channelsNode).toBeTruthy();
      
      const firstChannel = channelsNode.child('channel');
      expect(firstChannel.childValue('label')).toBe('Channel1');
      expect(firstChannel.childValue('unit')).toBe('microvolts');
    });
  });

  describe('copy and destroy', () => {
    it('should copy StreamInfo', () => {
      const original = new StreamInfo('Original', 'Test', 4, 50, cfFloat32);
      const copy = original.copy();
      
      expect(copy.getName()).toBe(original.getName());
      expect(copy.getType()).toBe(original.getType());
      expect(copy.getChannelCount()).toBe(original.getChannelCount());
      expect(copy.getNominalSrate()).toBe(original.getNominalSrate());
      
      // Clean up
      original.destroy();
      copy.destroy();
    });
  });
});