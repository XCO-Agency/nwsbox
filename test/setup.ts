import * as path from 'path';
import * as fs from 'fs-extra';
import * as os from 'os';

export const TEST_DIR = path.join(os.tmpdir(), 'nws-test');

export async function createTestWorkspace(name: string = 'test-workspace'): Promise<string> {
  const testPath = path.join(TEST_DIR, name);
  await fs.ensureDir(testPath);
  await fs.emptyDir(testPath);
  return testPath;
}

export async function cleanupTestWorkspace(name: string = 'test-workspace'): Promise<void> {
  const testPath = path.join(TEST_DIR, name);
  if (await fs.pathExists(testPath)) {
    await fs.remove(testPath);
  }
}

export async function cleanupAll(): Promise<void> {
  if (await fs.pathExists(TEST_DIR)) {
    await fs.remove(TEST_DIR);
  }
}


