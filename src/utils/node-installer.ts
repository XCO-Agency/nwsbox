import * as path from 'path';
import * as fs from 'fs-extra';
import * as os from 'os';
import * as https from 'https';
import * as zlib from 'zlib';
import * as tar from 'tar';
import { pipeline } from 'stream/promises';
import { WorkspacePaths } from '../types/workspace';

const NODE_DIST_URL = 'https://nodejs.org/dist';

function getPlatform(): string {
  const platform = os.platform();
  return platform === 'win32' ? 'win' : platform === 'darwin' ? 'darwin' : 'linux';
}

function getArch(): string {
  return os.arch();
}

export function parseNodeVersion(version: string): string {
  const trimmed = version.trim();
  return trimmed.startsWith('v') ? trimmed : `v${trimmed}`;
}

async function fetchLatestVersion(major: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(`${NODE_DIST_URL}/index.json`, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const versions = JSON.parse(data);
          const matching = versions
            .filter((v: any) => v.version.startsWith(`v${major}.`))
            .sort((a: any, b: any) => 
              new Date(b.date).getTime() - new Date(a.date).getTime()
            );
          if (matching.length > 0) {
            resolve(matching[0].version);
          } else {
            reject(new Error(`No version found for Node ${major}`));
          }
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', reject);
  });
}

async function downloadNodeVersion(version: string, targetDir: string): Promise<string> {
  const platform = getPlatform();
  const arch = getArch();
  let normalizedVersion = parseNodeVersion(version);
  
  if (normalizedVersion.match(/^v\d+$/)) {
    normalizedVersion = await fetchLatestVersion(normalizedVersion.slice(1));
  }

  const filename = platform === 'win' 
    ? `node-${normalizedVersion}-${platform}-${arch}.zip`
    : `node-${normalizedVersion}-${platform}-${arch}.tar.gz`;

  const url = `${NODE_DIST_URL}/${normalizedVersion}/${filename}`;
  const extractDir = path.join(targetDir, normalizedVersion);

  await fs.ensureDir(extractDir);

  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }

      if (platform === 'win') {
        reject(new Error('Windows ZIP extraction not yet implemented. Please extract manually or use WSL.'));
      } else {
        pipeline(
          response,
          zlib.createGunzip(),
          tar.extract({ cwd: extractDir, strip: 1 })
        ).then(() => resolve(normalizedVersion)).catch(reject);
      }
    }).on('error', reject);
  });
}

export async function installNodeVersion(
  version: string,
  paths: WorkspacePaths
): Promise<string> {
  return downloadNodeVersion(version, paths.node);
}
