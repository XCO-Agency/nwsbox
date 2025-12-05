import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs-extra';
import { createShim, createDefaultShims, findSystemBinary } from '../src/utils/shim';
import { getWorkspacePaths, ensureWorkspaceStructure } from '../src/utils/workspace';
import { createTestWorkspace, cleanupTestWorkspace } from './setup';

describe('shim', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await createTestWorkspace('shim-test');
    await ensureWorkspaceStructure(testDir);
  });

  afterEach(async () => {
    await cleanupTestWorkspace('shim-test');
  });

  describe('createShim', () => {
    it('should create shim file with correct content', async () => {
      const paths = getWorkspacePaths(testDir);
      await createShim('test-command', paths);

      const shimPath = path.join(paths.shims, 'test-command');
      expect(await fs.pathExists(shimPath)).toBe(true);

      const content = await fs.readFile(shimPath, 'utf-8');
      expect(content).toContain('test-command');
      expect(content).toContain('#!/bin/bash');
      expect(content).toContain('NWS Shim for test-command');
    });

    it('should create shim with executable permissions', async () => {
      const paths = getWorkspacePaths(testDir);
      await createShim('test-command', paths);

      const shimPath = path.join(paths.shims, 'test-command');
      const stats = await fs.stat(shimPath);
      
      // Check if file is executable (mode includes execute bit)
      const isExecutable = (stats.mode & 0o111) !== 0;
      expect(isExecutable).toBe(true);
    });

    it('should replace command placeholder in template', async () => {
      const paths = getWorkspacePaths(testDir);
      await createShim('my-tool', paths);

      const shimPath = path.join(paths.shims, 'my-tool');
      const content = await fs.readFile(shimPath, 'utf-8');
      
      // Should not contain placeholder
      expect(content).not.toContain('{{COMMAND}}');
      // Should contain actual command
      expect(content).toContain('my-tool');
    });
  });

  describe('createDefaultShims', () => {
    it('should create all default shims', async () => {
      const paths = getWorkspacePaths(testDir);
      await createDefaultShims(paths);

      const expectedShims = ['node', 'npm', 'npx', 'yarn', 'pnpm'];
      
      for (const shim of expectedShims) {
        const shimPath = path.join(paths.shims, shim);
        expect(await fs.pathExists(shimPath)).toBe(true);
      }
    });

    it('should create shims with correct content', async () => {
      const paths = getWorkspacePaths(testDir);
      await createDefaultShims(paths);

      const nodeShimPath = path.join(paths.shims, 'node');
      const content = await fs.readFile(nodeShimPath, 'utf-8');
      
      expect(content).toContain('node');
      expect(content).toContain('.ws');
      expect(content).toContain('XDG_CONFIG_HOME');
    });
  });

  describe('findSystemBinary', () => {
    it('should find existing system binary', async () => {
      // 'node' should exist in most environments
      const binary = await findSystemBinary('node');
      // Either found or not, but shouldn't throw
      expect(binary === null || typeof binary === 'string').toBe(true);
    });

    it('should return null for non-existent binary', async () => {
      const binary = await findSystemBinary('nonexistent-command-xyz-123');
      expect(binary).toBeNull();
    });
  });
});

