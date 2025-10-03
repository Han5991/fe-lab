export class ApiError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface HttpErrorResponse {
  response?: {
    data?: {
      error?: string;
      message?: string;
    };
    status?: number;
  };
  message?: string;
}

export function isHttpError(error: unknown): error is HttpErrorResponse {
  return (error as ApiError).name === 'ApiError';
}
