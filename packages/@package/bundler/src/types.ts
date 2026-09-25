export interface MinibundlerConfig {
  entry: string;
  externals?: string[];
  /** require가 없는 브라우저에서 external을 찾을 전역 이름. 예: `{ react: 'React' }` */
  globals?: Record<string, string>;
}
