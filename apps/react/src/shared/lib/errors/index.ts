import { ApiError } from '@package/core';

export class BaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BaseError';
  }
}

// 통계 데이터 에러
export class StatsError extends ApiError {
  constructor(message: string, code?: string) {
    super(message, code, 500);
    this.name = 'StatsError';
  }
}

// 차트 데이터 에러
export class ChartError extends ApiError {
  constructor(message: string, code?: string) {
    super(message, code, 500);
    this.name = 'ChartError';
  }
}

// 활동 데이터 에러
export class ActivityError extends ApiError {
  constructor(message: string, code?: string) {
    super(message, code, 500);
    this.name = 'ActivityError' as const;
  }
}

// 네트워크 에러
export class NetworkError extends ApiError {
  constructor(message: string = '네트워크 오류가 발생했습니다') {
    super(message, 'NETWORK_ERROR', 0);
    this.name = 'NetworkError';
  }
}

// 인증 에러
export class AuthError extends ApiError {
  constructor(message: string = '인증에 실패했습니다') {
    super(message, 'AUTH_ERROR', 401);
    this.name = 'AuthError';
  }
}
