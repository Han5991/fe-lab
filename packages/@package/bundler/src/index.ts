export { Graph } from './Graph.ts';
export * from './types.ts';

import type { MinibundlerConfig } from './types.ts';

export function defineConfig(config: MinibundlerConfig): MinibundlerConfig {
  return config;
}
