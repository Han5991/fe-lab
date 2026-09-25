export interface MinibundlerConfig {
  entry: string;
  externals?: string[];
  /**
   * require가 없는 브라우저에서 external을 찾을 전역 이름.
   * 예: `{ react: 'React' }`이면 `<script>`로 먼저 올려 둔 `window.React`를 쓴다.
   */
  globals?: Record<string, string>;
}
