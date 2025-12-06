import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs-extra';
import { WORKSPACE_ERROR } from '../src/utils/command-runner';
import { findWorkspaceRoot } from '../src/utils/workspace';
import { createTestWorkspace, cleanupTestWorkspace } from './setup';

describe('command-runner', () => {
  let testDir: string;
  let noWorkspaceDir: string;

  beforeEach(async () => {
    testDir = await createTestWorkspace('command-runner-test');
    
    // Create a directory without workspace
    noWorkspaceDir = path.join(os.tmpdir(), 'nws-test-no-ws');
    await fs.ensureDir(noWorkspaceDir);
  });

  afterEach(async () => {
    await cleanupTestWorkspace('command-runner-test');
    if (await fs.pathExists(noWorkspaceDir)) {
      await fs.remove(noWorkspaceDir);
    }
  });

  describe('workspace detection for command runner', () => {
    it('should detect workspace when it exists', () => {
      const wsPath = path.join(testDir, '.ws');
      // Create workspace directory
      fs.ensureDirSync(wsPath);
      
      const root = findWorkspaceRoot(testDir);
      expect(root).toBe(testDir);
    });

    it('should not find workspace when it does not exist', () => {
      const root = findWorkspaceRoot(noWorkspaceDir);
      expect(root).toBeNull();
    });

    it('should find workspace from nested directory', async () => {
      const wsPath = path.join(testDir, '.ws');
      await fs.ensureDir(wsPath);
      
      const nestedDir = path.join(testDir, 'sub', 'deep', 'nested');
      await fs.ensureDir(nestedDir);
      
      const root = findWorkspaceRoot(nestedDir);
      expect(root).toBe(testDir);
    });
  });

  describe('WORKSPACE_ERROR', () => {
    it('should export correct error message', () => {
      expect(WORKSPACE_ERROR).toBe('Not in a workspace. Run "nwsbox init" first.');
    });
  });
});

