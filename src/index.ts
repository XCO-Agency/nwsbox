import {execute} from '@oclif/core'
import * as path from 'path'
import * as fs from 'fs'

function findPackageRoot(): string {
  let rootDir = __dirname;
  const root = path.parse(rootDir).root;
  
  while (rootDir !== root) {
    if (fs.existsSync(path.join(rootDir, 'package.json'))) {
      return rootDir;
    }
    rootDir = path.dirname(rootDir);
  }
  
  return __dirname;
}

export async function run(args = process.argv.slice(2)) {
  return execute({
    development: false,
    dir: findPackageRoot(),
    args,
  });
}

