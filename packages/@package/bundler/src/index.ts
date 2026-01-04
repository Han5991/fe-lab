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

  console.log('🛠️ Generating bundle...');
  const bundle = graph.generate();
  
  console.log('✅ Bundle built successfully! (dist/bundle.js)');
  
  // 간단하게 생성된 번들의 길이를 출력
  console.log(`📏 Bundle Size: ${bundle.length} bytes`);
} catch (err) {
  console.error('❌ Build failed:', err);
  process.exit(1);
}
