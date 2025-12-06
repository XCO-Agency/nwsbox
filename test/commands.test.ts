import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs-extra';
import { ensureWorkspaceStructure, writeWorkspaceConfig } from '../src/utils/workspace';
import { createTestWorkspace, cleanupTestWorkspace } from './setup';

describe('commands integration', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await createTestWorkspace('commands-test');
  });

  afterEach(async () => {
    await cleanupTestWorkspace('commands-test');
  });

  describe('init workflow', () => {
    it('should create workspace structure', async () => {
      const paths = await ensureWorkspaceStructure(testDir);
      
      expect(await fs.pathExists(paths.root)).toBe(true);
      expect(await fs.pathExists(paths.node)).toBe(true);
      expect(await fs.pathExists(paths.env)).toBe(true);
      expect(await fs.pathExists(paths.cache)).toBe(true);
      expect(await fs.pathExists(paths.shims)).toBe(true);
    });

    it('should write initial config', async () => {
      await writeWorkspaceConfig(testDir, {
        created: new Date().toISOString(),
        name: 'test-workspace',
      });

      const configPath = path.join(testDir, '.ws', 'config.json');
      expect(await fs.pathExists(configPath)).toBe(true);
      
      const config = await fs.readJson(configPath);
      expect(config.name).toBe('test-workspace');
      expect(config.created).toBeDefined();
    });
  });

  describe('workspace config', () => {
    it('should update config with node version', async () => {
      await writeWorkspaceConfig(testDir, { name: 'test' });
      await writeWorkspaceConfig(testDir, { node: 'v20.0.0' });

      const configPath = path.join(testDir, '.ws', 'config.json');
      const config = await fs.readJson(configPath);
      
      expect(config.name).toBe('test');
      expect(config.node).toBe('v20.0.0');
      expect(config.updated).toBeDefined();
    });
  });
});


