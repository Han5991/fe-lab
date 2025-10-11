export class ApiError extends Error {
  code?: string;
  status?: number;

  constructor(
    message: string,
    opts?: { code?: string; status?: number; cause?: unknown },
  ) {
    // ES2022를 쓰면: super(message, { cause: opts?.cause })
    super(message);
    // cause 필드 직접 부여(ES2022 미사용 시)
    if (opts && 'cause' in opts) (this as any).cause = opts.cause;

    this.name = new.target.name;
    this.code = opts?.code;
    this.status = opts?.status;

    // V8/Node 전용 API는 가드 후 사용
    const ErrorCtor = Error as unknown as {
      captureStackTrace?: (target: object, ctor?: Function) => void;
    };

    if (typeof ErrorCtor.captureStackTrace === 'function') {
      ErrorCtor.captureStackTrace(this, new.target);
    } else {
      this.stack = new Error(message).stack;
    }
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

export function isHttpError(
  error: unknown,
): error is ApiError & HttpErrorResponse {
  return error instanceof ApiError && 'response' in error;
}
