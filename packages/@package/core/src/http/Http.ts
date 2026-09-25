import { HttpStatusCode } from './HttpStatusCode';
import { ApiError } from '../errors';

interface RequestConfig<T = any> {
  headers?: Record<string, string>;
  params?: Record<string, string>;
  data?: T;
}

interface HttpResponse<T = any> {
  data: T;
  status: HttpStatusCode;
  headers: Headers;
}

interface ErrorBodyFields {
  code?: string;
  message?: string;
}

/** 본문이 없다고 규정된 상태 코드 — 여기에 `json()`을 부르면 SyntaxError가 난다 */
const NO_BODY_STATUSES = new Set<number>([
  HttpStatusCode.NoContent,
  HttpStatusCode.ResetContent,
  HttpStatusCode.NotModified,
]);

/**
 * 응답 본문을 읽는다. JSON은 Content-Type이 JSON이거나 비어 있을 때만 파싱하고,
 * 빈 본문은 `undefined`, 그 밖(프록시의 HTML 에러 페이지 등)은 문자열 그대로 돌려준다.
 */
async function readBody(response: Response): Promise<unknown> {
  if (NO_BODY_STATUSES.has(response.status)) return undefined;

  const text = await response.text();
  if (text === '') return undefined;

  const contentType = response.headers.get('content-type') ?? '';
  const declaresJson = /[/+]json\b/i.test(contentType);
  if (!declaresJson && contentType !== '') return text;

  try {
    return JSON.parse(text) as unknown;
  } catch (cause) {
    // JSON이라고 선언한 성공 응답이 깨졌으면 서버 계약 위반이다 — 상태 코드와 함께 알린다
    if (declaresJson && response.ok) {
      throw new ApiError(`Invalid JSON response (${response.status})`, {
        code: 'INVALID_JSON',
        status: response.status,
        cause,
      });
    }
    return text;
  }
}

/** `{ error, message }` 모양의 에러 본문에서 문자열 필드만 꺼낸다 */
function readErrorFields(data: unknown): ErrorBodyFields {
  if (typeof data !== 'object' || data === null) return {};
  const { error, message } = data as { error?: unknown; message?: unknown };
  return {
    code: typeof error === 'string' ? error : undefined,
    message:
      typeof message === 'string' && message !== '' ? message : undefined,
  };
}

export class Http {
  private readonly baseURL: string;
  private readonly defaultHeaders: Record<string, string>;

  constructor(baseURL: string, defaultHeaders: Record<string, string> = {}) {
    this.baseURL = baseURL;
    this.defaultHeaders = defaultHeaders;
  }

  private async request<T = any, D = any>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    url: string,
    config: RequestConfig<D> = {},
  ): Promise<HttpResponse<T>> {
    const fullUrl = new URL(url, this.baseURL);

    if (config.params) {
      Object.entries(config.params).forEach(([key, value]) =>
        fullUrl.searchParams.append(key, value),
      );
    }

    // 0·false·'' 같은 falsy 본문도 보낸다. 본문이 없으면 Content-Type도 붙이지 않는다
    // (GET에 붙이면 교차 출처 요청마다 CORS preflight가 생긴다)
    const hasBody = config.data !== undefined;

    const response = await fetch(fullUrl.toString(), {
      method,
      headers: {
        ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
        ...this.defaultHeaders,
        ...config.headers,
      },
      body: hasBody ? JSON.stringify(config.data) : undefined,
    });

    // 상태부터 본다 — 에러 응답의 본문은 JSON이 아닐 수 있다(502 HTML 등)
    if (!response.ok) {
      const data = await readBody(response).catch(() => undefined);
      const { code, message } = readErrorFields(data);
      const apiError = new ApiError(
        message ?? `HTTP Error: ${response.status} ${response.statusText}`,
        { code, status: response.status },
      );

      // 원본 응답 정보 보존 (API 레이어에서 활용 가능)
      (apiError as any).response = {
        data,
        status: response.status,
        headers: response.headers,
      };

      throw apiError;
    }

    const data = (await readBody(response)) as T;

    return {
      data,
      status: response.status,
      headers: response.headers,
    };
  }

  get<T = any>(url: string, config?: RequestConfig): Promise<HttpResponse<T>> {
    return this.request<T>('GET', url, config);
  }

  post<T = any, D = any>(
    url: string,
    data?: D,
    config?: RequestConfig,
  ): Promise<HttpResponse<T>> {
    return this.request<T, D>('POST', url, { ...config, data });
  }

  put<T = any, D = any>(
    url: string,
    data?: D,
    config?: RequestConfig,
  ): Promise<HttpResponse<T>> {
    return this.request<T, D>('PUT', url, { ...config, data });
  }

  delete<T = any>(
    url: string,
    config?: RequestConfig,
  ): Promise<HttpResponse<T>> {
    return this.request<T>('DELETE', url, config);
  }
}

export default Http;
