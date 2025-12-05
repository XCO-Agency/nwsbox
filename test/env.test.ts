import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs-extra';
import { buildWorkspaceEnvironment, mergeEnvironment } from '../src/utils/env';
import { getWorkspacePaths, ensureWorkspaceStructure, writeWorkspaceConfig } from '../src/utils/workspace';
import { createTestWorkspace, cleanupTestWorkspace } from './setup';

describe('env', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await createTestWorkspace('env-test');
    await ensureWorkspaceStructure(testDir);
  });

  afterEach(async () => {
    await cleanupTestWorkspace('env-test');
  });

  describe('buildWorkspaceEnvironment', () => {
    it('should build environment without node version', async () => {
      const paths = getWorkspacePaths(testDir);
      const env = await buildWorkspaceEnvironment(testDir, paths);

      expect(env.HOME).toBe(paths.env);
      expect(env.USERPROFILE).toBe(paths.env);
      expect(env.XDG_CONFIG_HOME).toBe(path.join(paths.env, '.config'));
      expect(env.XDG_CACHE_HOME).toBe(path.join(paths.cache, 'xdg'));
      expect(env.NPM_CONFIG_CACHE).toBe(path.join(paths.cache, 'npm'));
      expect(env.YARN_CACHE_FOLDER).toBe(path.join(paths.cache, 'yarn'));
      expect(env.PNPM_HOME).toBe(path.join(paths.cache, 'pnpm'));
      expect(env.PATH).toContain(paths.shims);
      expect(env.NODE_PATH).toBeUndefined();
    });

    it('should build environment with node version', async () => {
      await writeWorkspaceConfig(testDir, { node: 'v20.0.0' });
      const nodeBinPath = path.join(testDir, '.ws', 'node', 'v20.0.0', 'bin');
      await fs.ensureDir(nodeBinPath);

      const paths = getWorkspacePaths(testDir);
      const env = await buildWorkspaceEnvironment(testDir, paths);

      expect(env.PATH).toContain(nodeBinPath);
      expect(env.PATH).toContain(paths.shims);
      expect(env.NODE_PATH).toBe(path.join(testDir, 'node_modules'));
    });

    it('should preserve system environment variables', async () => {
      const originalTerm = process.env.TERM;
      const originalShell = process.env.SHELL;

      const paths = getWorkspacePaths(testDir);
      const env = await buildWorkspaceEnvironment(testDir, paths);

      expect(env.TERM).toBe(originalTerm);
      expect(env.SHELL).toBe(originalShell);
    });

    it('should handle missing system environment variables', async () => {
      const originalEditor = process.env.EDITOR;
      delete process.env.EDITOR;

      const paths = getWorkspacePaths(testDir);
      const env = await buildWorkspaceEnvironment(testDir, paths);

      expect(env.EDITOR).toBeUndefined();

      if (originalEditor) {
        process.env.EDITOR = originalEditor;
      }
    });
  });

  describe('mergeEnvironment', () => {
    it('should merge overrides with existing environment', () => {
      const overrides = {
        TEST_VAR: 'test-value',
        HOME: '/custom/home',
      };

      const merged = mergeEnvironment(overrides);

      expect(merged.TEST_VAR).toBe('test-value');
      expect(merged.HOME).toBe('/custom/home');
      expect(merged.PATH).toBeDefined(); // Should preserve existing PATH
    });

    it('should handle undefined values', () => {
      const overrides = {
        TEST_VAR: undefined,
        HOME: '/custom/home',
      };

      const merged = mergeEnvironment(overrides);

      expect(merged.TEST_VAR).toBeUndefined();
      expect(merged.HOME).toBe('/custom/home');
    });

    it('should preserve all existing environment variables', () => {
      const originalPath = process.env.PATH;
      const overrides = {
        NEW_VAR: 'new-value',
      };

      const merged = mergeEnvironment(overrides);

      expect(merged.NEW_VAR).toBe('new-value');
      expect(merged.PATH).toBe(originalPath);
    });
  });
});

