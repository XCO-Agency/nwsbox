import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs-extra';
import {
  findWorkspaceRoot,
  getWorkspacePaths,
  readWorkspaceConfig,
  writeWorkspaceConfig,
  ensureWorkspaceStructure,
  WORKSPACE_ERROR,
} from '../src/utils/workspace';
import { createTestWorkspace, cleanupTestWorkspace } from './setup';

describe('workspace', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await createTestWorkspace('workspace-test');
  });

  afterEach(async () => {
    await cleanupTestWorkspace('workspace-test');
  });

  describe('findWorkspaceRoot', () => {
    it('should find workspace root when .ws exists', async () => {
      const wsPath = path.join(testDir, '.ws');
      await fs.ensureDir(wsPath);

      const root = findWorkspaceRoot(testDir);
      expect(root).toBe(testDir);
    });

    it('should find workspace root from subdirectory', async () => {
      const wsPath = path.join(testDir, '.ws');
      await fs.ensureDir(wsPath);
      const subDir = path.join(testDir, 'sub', 'deep', 'nested');
      await fs.ensureDir(subDir);

      const root = findWorkspaceRoot(subDir);
      expect(root).toBe(testDir);
    });

    it('should return null when no workspace exists', () => {
      const root = findWorkspaceRoot(testDir);
      expect(root).toBeNull();
    });
  });

  describe('getWorkspacePaths', () => {
    it('should return correct paths', () => {
      const paths = getWorkspacePaths(testDir);
      expect(paths.root).toBe(path.join(testDir, '.ws'));
      expect(paths.config).toBe(path.join(testDir, '.ws', 'config.json'));
      expect(paths.node).toBe(path.join(testDir, '.ws', 'node'));
      expect(paths.env).toBe(path.join(testDir, '.ws', 'env'));
      expect(paths.cache).toBe(path.join(testDir, '.ws', 'cache'));
      expect(paths.shims).toBe(path.join(testDir, '.ws', 'shims'));
    });
  });

  describe('readWorkspaceConfig', () => {
    it('should return empty object when config does not exist', async () => {
      const config = await readWorkspaceConfig(testDir);
      expect(config).toEqual({});
    });

    it('should read existing config', async () => {
      const configPath = path.join(testDir, '.ws', 'config.json');
      await fs.ensureDir(path.dirname(configPath));
      await fs.writeJson(configPath, { name: 'test', node: 'v20.0.0' });

      const config = await readWorkspaceConfig(testDir);
      expect(config.name).toBe('test');
      expect(config.node).toBe('v20.0.0');
    });

    it('should return empty object on invalid JSON', async () => {
      const configPath = path.join(testDir, '.ws', 'config.json');
      await fs.ensureDir(path.dirname(configPath));
      await fs.writeFile(configPath, 'invalid json');

      const config = await readWorkspaceConfig(testDir);
      expect(config).toEqual({});
    });
  });

  describe('writeWorkspaceConfig', () => {
    it('should write config file', async () => {
      await writeWorkspaceConfig(testDir, { name: 'test', node: 'v20.0.0' });

      const config = await readWorkspaceConfig(testDir);
      expect(config.name).toBe('test');
      expect(config.node).toBe('v20.0.0');
      expect(config.created).toBeUndefined();
      expect(config.updated).toBeDefined();
    });

    it('should merge with existing config', async () => {
      await writeWorkspaceConfig(testDir, { name: 'test' });
      await writeWorkspaceConfig(testDir, { node: 'v20.0.0' });

      const config = await readWorkspaceConfig(testDir);
      expect(config.name).toBe('test');
      expect(config.node).toBe('v20.0.0');
    });
  });

  describe('ensureWorkspaceStructure', () => {
    it('should create all required directories', async () => {
      const paths = await ensureWorkspaceStructure(testDir);

      expect(await fs.pathExists(paths.root)).toBe(true);
      expect(await fs.pathExists(paths.node)).toBe(true);
      expect(await fs.pathExists(paths.env)).toBe(true);
      expect(await fs.pathExists(paths.cache)).toBe(true);
      expect(await fs.pathExists(paths.shims)).toBe(true);
      expect(await fs.pathExists(path.join(paths.env, '.config'))).toBe(true);
    });
  });

  describe('WORKSPACE_ERROR', () => {
    it('should export error message', () => {
      expect(WORKSPACE_ERROR).toBe('Not in a workspace. Run "nwsbox init" first.');
    });
  });
});

