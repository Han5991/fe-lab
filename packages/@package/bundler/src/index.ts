#!/usr/bin/env node
import path from 'node:path';
import { Graph } from './Graph.js';

console.log('📦 Minibundler started...');

const entryPath = path.resolve(process.cwd(), 'src/index.js');
console.log(`🔍 Entry: ${entryPath}`);

try {
  const graph = new Graph(entryPath, ['react', 'react-dom']);
  graph.build();

  console.log('🛠️ Generating bundle...');
  const bundle = graph.generate();

  console.log('✅ Bundle built successfully! (dist/bundle.js)');
  console.log(`📏 Bundle Size: ${bundle.length} bytes`);
} catch (err) {
  console.error('❌ Build failed:', err);
  console.error(err);
  process.exit(1);
}
