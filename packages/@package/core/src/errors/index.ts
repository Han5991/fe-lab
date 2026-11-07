/** HTTP 에러 응답의 원본 — API 레이어가 본문·헤더를 다시 읽을 때 쓴다. */
export interface ApiErrorResponse {
  data?: unknown;
  status: number;
  headers?: Headers;
}

type CaptureStackTrace = (target: object, constructorOpt?: Function) => void;

/** V8/Node 전용 API라 런타임에 있을 때만 쓴다 */
function hasCaptureStackTrace(
  ctor: object,
): ctor is { captureStackTrace: CaptureStackTrace } {
  return (
    'captureStackTrace' in ctor && typeof ctor.captureStackTrace === 'function'
  );
}

export class ApiError extends Error {
  code?: string;
  status?: number;
  response?: ApiErrorResponse;
  // 소비 앱이 ES2022 이전 lib로 이 소스를 검사해도 cause가 보이게 선언만 한다(값은 내보내지 않는다)
  declare cause?: unknown;

  constructor(
    message: string,
    opts?: {
      code?: string;
      status?: number;
      cause?: unknown;
      response?: ApiErrorResponse;
    },
  ) {
    // ES2022를 쓰면: super(message, { cause: opts?.cause })
    super(message);
    // 타입 밖 호출(JS에서 문자열 코드를 넘기는 등)에서 `'cause' in`이 TypeError를 던지지 않게 한다
    const options = typeof opts === 'object' && opts !== null ? opts : {};
    // cause 필드 직접 부여(ES2022 미사용 시)
    if ('cause' in options) this.cause = options.cause;

    this.name = new.target.name;
    this.code = typeof options.code === 'string' ? options.code : undefined;
    this.status =
      typeof options.status === 'number' ? options.status : undefined;
    if (typeof options.response === 'object' && options.response !== null) {
      this.response = options.response;
    }

    // 전역 Error를 직접 좁히면 node 타입이 있는 소비 앱에서 else의 Error가 never가 된다 — 지역 값으로 좁힌다
    const errorCtor: object = Error;
    if (hasCaptureStackTrace(errorCtor)) {
      errorCtor.captureStackTrace(this, new.target);
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
    typeof error.response === 'object'
  );
}
