#!/usr/bin/env node
import path from 'node:path';
import { Graph } from './Graph.ts';
import type { MinibundlerConfig } from './types.ts';

console.log('📦 Minibundler started...');

const configPath = path.resolve(process.cwd(), 'minibundler.config.js');

async function run() {
  try {
    let config: MinibundlerConfig = { entry: 'src/index.js', externals: [] };

    try {
      const { pathToFileURL } = await import('node:url');
      const importedConfig = await import(pathToFileURL(configPath).href);
      config = { ...config, ...(importedConfig.default || {}) };
      console.log(`🔧 Config loaded from: ${configPath}`);
    } catch (e) {
      console.log('⚠️ No config found or failed to load, using defaults.', e);
    }

    const entryPath = path.resolve(process.cwd(), config.entry);
    console.log(`🔍 Entry: ${entryPath}`);

    const graph = new Graph(
      entryPath,
      config.externals || [],
      config.globals || {},
    );
    graph.build();

    console.log('🛠️ Generating bundle...');
    const bundle = graph.generate();

    console.log(
      '✅ Bundle built successfully! (dist/index.js, dist/index.mjs)',
    );
    console.log(`📏 Bundle Size: ${bundle.length} bytes`);
  } catch (err) {
    console.error('❌ Build failed:', err);
    console.error(err);
    process.exit(1);
  }
}

run();
