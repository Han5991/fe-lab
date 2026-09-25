import { defineConfig } from '@package/bundler';

export default defineConfig({
  entry: './src/index.js',
  externals: ['react', 'react-dom'],
  // 브라우저 <script>로 쓸 때 external을 찾을 전역 이름
  globals: { react: 'React', 'react-dom': 'ReactDOM' },
});
