import { describe, it, expect } from 'vitest';
import { parseNodeVersion } from '../src/utils/node-installer';

describe('node-installer', () => {
  describe('parseNodeVersion', () => {
    it('should add v prefix when missing', () => {
      expect(parseNodeVersion('20')).toBe('v20');
      expect(parseNodeVersion('18.17.0')).toBe('v18.17.0');
    });

    it('should keep v prefix when present', () => {
      expect(parseNodeVersion('v20')).toBe('v20');
      expect(parseNodeVersion('v18.17.0')).toBe('v18.17.0');
    });

    it('should trim whitespace', () => {
      expect(parseNodeVersion('  20  ')).toBe('v20');
      expect(parseNodeVersion('  v20  ')).toBe('v20');
    });

    it('should handle partial versions', () => {
      expect(parseNodeVersion('20')).toBe('v20');
      expect(parseNodeVersion('18.17')).toBe('v18.17');
    });
  });
});


