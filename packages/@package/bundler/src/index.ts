import path from 'node:path';
import { Graph } from './Graph.js';

console.log('📦 Minibundler started...');

const entryPath = path.resolve(
  process.cwd(),
  '../bundler-playground/src/index.js',
);
console.log(`🔍 Entry: ${entryPath}`);

try {
  const graph = new Graph(entryPath);
  graph.build();

  console.log('✅ Graph built successfully!');

  console.log('--- Modules in Graph ---');
  for (const [filePath] of graph.modules) {
    console.log(`- ${filePath}`);
  }
  console.log('------------------------');
} catch (err) {
  console.error('❌ Build failed:', err);
  process.exit(1);
}
