import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as os from 'os';
import {
  findWorkspaceRoot,
  readWorkspaceConfig,
  writeWorkspaceConfig,
  getWorkspacePaths,
} from '../src/utils/workspace';
import { createTestWorkspace, cleanupTestWorkspace } from './setup';

describe('workspace edge cases', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await createTestWorkspace('workspace-edge-test');
  });

  afterEach(async () => {
    await cleanupTestWorkspace('workspace-edge-test');
  });

  describe('findWorkspaceRoot edge cases', () => {
    it('should handle root directory correctly', () => {
      const root = os.platform() === 'win32' ? 'C:\\' : '/';
      const result = findWorkspaceRoot(root);
      // Should return null when at filesystem root
      expect(result).toBeNull();
    });

    it('should not find workspace when .ws is a file', async () => {
      const wsPath = path.join(testDir, '.ws');
      await fs.writeFile(wsPath, 'not a directory');

      const root = findWorkspaceRoot(testDir);
      expect(root).toBeNull();
    });

    it('should handle paths with special characters', async () => {
      const specialDir = path.join(testDir, 'test-dir with spaces');
      await fs.ensureDir(specialDir);
      const wsPath = path.join(specialDir, '.ws');
      await fs.ensureDir(wsPath);

      const root = findWorkspaceRoot(specialDir);
      expect(root).toBe(specialDir);
    });

    it('should handle deeply nested directories', async () => {
      const wsPath = path.join(testDir, '.ws');
      await fs.ensureDir(wsPath);
      
      const deepPath = path.join(testDir, 'a', 'b', 'c', 'd', 'e', 'f', 'g');
      await fs.ensureDir(deepPath);

      const root = findWorkspaceRoot(deepPath);
      expect(root).toBe(testDir);
    });
  });

  describe('config edge cases', () => {
    it('should handle empty config object', async () => {
      await writeWorkspaceConfig(testDir, {});
      const config = await readWorkspaceConfig(testDir);
      
      expect(config).toBeDefined();
      expect(config.updated).toBeDefined();
    });

    it('should handle config with empty strings', async () => {
      await writeWorkspaceConfig(testDir, { name: '', node: '' });
      const config = await readWorkspaceConfig(testDir);
      
      expect(config.name).toBe('');
      expect(config.node).toBe('');
    });

    it('should handle multiple rapid config writes', async () => {
      // Test sequential writes (concurrent writes would need locking)
      await writeWorkspaceConfig(testDir, { name: 'test1' });
      await writeWorkspaceConfig(testDir, { node: 'v20.0.0' });

      const config = await readWorkspaceConfig(testDir);
      // Should have both values after sequential writes
      expect(config.name).toBe('test1');
      expect(config.node).toBe('v20.0.0');
    });

    it('should handle very long config values', async () => {
      const longName = 'a'.repeat(1000);
      await writeWorkspaceConfig(testDir, { name: longName });
      
      const config = await readWorkspaceConfig(testDir);
      expect(config.name).toBe(longName);
    });

    it('should handle unicode characters in config', async () => {
      await writeWorkspaceConfig(testDir, { name: '测试 🚀 café' });
      
      const config = await readWorkspaceConfig(testDir);
      expect(config.name).toBe('测试 🚀 café');
    });
  });

  describe('getWorkspacePaths edge cases', () => {
    it('should handle paths with spaces', () => {
      const pathWithSpaces = path.join(testDir, 'path with spaces');
      const paths = getWorkspacePaths(pathWithSpaces);
      
      expect(paths.root).toContain('path with spaces');
      expect(paths.config).toContain('config.json');
    });

    it('should handle very long paths', () => {
      const longPath = path.join(testDir, 'a'.repeat(200));
      const paths = getWorkspacePaths(longPath);
      
      expect(paths.root).toBeDefined();
      expect(paths.config).toBeDefined();
    });
  });

  describe('config file corruption', () => {
    it('should handle empty config file', async () => {
      const configPath = path.join(testDir, '.ws', 'config.json');
      await fs.ensureDir(path.dirname(configPath));
      await fs.writeFile(configPath, '');

      const config = await readWorkspaceConfig(testDir);
      expect(config).toEqual({});
    });

    it('should handle config file with only whitespace', async () => {
      const configPath = path.join(testDir, '.ws', 'config.json');
      await fs.ensureDir(path.dirname(configPath));
      await fs.writeFile(configPath, '   \n\t  ');

      const config = await readWorkspaceConfig(testDir);
      expect(config).toEqual({});
    });

    it('should handle malformed JSON gracefully', async () => {
      const configPath = path.join(testDir, '.ws', 'config.json');
      await fs.ensureDir(path.dirname(configPath));
      await fs.writeFile(configPath, '{"name": "test", "node": }'); // Invalid JSON

      const config = await readWorkspaceConfig(testDir);
      expect(config).toEqual({});
    });
  });
});

