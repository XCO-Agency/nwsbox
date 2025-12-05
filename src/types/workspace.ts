export interface WorkspaceConfig {
  node?: string;
  name?: string;
  created?: string;
  updated?: string;
}

export interface WorkspacePaths {
  root: string;
  config: string;
  node: string;
  env: string;
  cache: string;
  shims: string;
}



