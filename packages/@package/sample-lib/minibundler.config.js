import { defineConfig } from '@package/bundler';

export default defineConfig({
  entry: './src/index.js',
  externals: ['react', 'react-dom'],
});
