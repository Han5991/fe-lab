import { HttpStatusCode } from './HttpStatusCode';

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

    const response = await fetch(fullUrl.toString(), {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...this.defaultHeaders,
        ...config.headers,
      },
      body: config.data ? JSON.stringify(config.data) : undefined,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
    }

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
