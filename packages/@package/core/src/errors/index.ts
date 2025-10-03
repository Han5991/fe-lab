// 기본 애플리케이션 에러
export class AppError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
