import { describe, it, expect } from 'vitest';
import { parseNodeVersion } from '../src/utils/node-installer';

describe('node-installer edge cases', () => {
  describe('parseNodeVersion edge cases', () => {
    it('should handle empty string', () => {
      expect(parseNodeVersion('')).toBe('v');
    });

    it('should handle whitespace-only string', () => {
      // Function trims whitespace, so empty string becomes 'v'
      expect(parseNodeVersion('   ')).toBe('v');
    });

    it('should handle version with leading zeros', () => {
      expect(parseNodeVersion('020')).toBe('v020');
      expect(parseNodeVersion('v020')).toBe('v020');
    });

    it('should handle version with many dots', () => {
      expect(parseNodeVersion('20.1.2.3.4')).toBe('v20.1.2.3.4');
      expect(parseNodeVersion('v20.1.2.3.4')).toBe('v20.1.2.3.4');
    });

    it('should handle single character version', () => {
      expect(parseNodeVersion('1')).toBe('v1');
      expect(parseNodeVersion('v1')).toBe('v1');
    });

    it('should handle very long version string', () => {
      const longVersion = '20.' + '1.'.repeat(50) + '0';
      expect(parseNodeVersion(longVersion)).toBe('v' + longVersion);
    });

    it('should handle version with special characters in middle', () => {
      // Should still add v prefix even if invalid
      expect(parseNodeVersion('20-test')).toBe('v20-test');
    });

    it('should handle version starting with v and whitespace', () => {
      // Function trims whitespace first, then adds v if needed
      expect(parseNodeVersion(' v20')).toBe('v20'); // Trims to 'v20', already has v
      expect(parseNodeVersion('v 20')).toBe('v 20'); // Trims to 'v 20', starts with v so kept as-is
    });

    it('should handle unicode characters', () => {
      expect(parseNodeVersion('v20🚀')).toBe('v20🚀');
      expect(parseNodeVersion('20🚀')).toBe('v20🚀');
    });
  });
});

