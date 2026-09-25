export class ApiError extends Error {
  code?: string;
  status?: number;

  constructor(
    message: string,
    opts?: { code?: string; status?: number; cause?: unknown },
  ) {
    // ES2022를 쓰면: super(message, { cause: opts?.cause })
    super(message);
    // 타입 밖 호출(JS에서 문자열 코드를 넘기는 등)에서 `'cause' in`이 TypeError를 던지지 않게 한다
    const options = typeof opts === 'object' && opts !== null ? opts : {};
    // cause 필드 직접 부여(ES2022 미사용 시)
    if ('cause' in options) (this as any).cause = options.cause;

    this.name = new.target.name;
    this.code = typeof options.code === 'string' ? options.code : undefined;
    this.status =
      typeof options.status === 'number' ? options.status : undefined;

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

export function isHttpError(error: unknown): error is HttpErrorResponse {
  return (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as any).response === 'object'
  );
}
