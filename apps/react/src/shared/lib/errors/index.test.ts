import { describe, test, expect } from 'vitest';
import {
  BaseError,
  StatsError,
  ChartError,
  ActivityError,
  NetworkError,
  AuthError,
} from './index';

describe('BaseError', () => {
  test('메시지와 함께 생성된다', () => {
    const error = new BaseError('기본 에러 메시지');

    expect(error.message).toBe('기본 에러 메시지');
    expect(error.name).toBe('BaseError');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(BaseError);
  });
});

describe('StatsError', () => {
  test('메시지만으로 생성된다', () => {
    const error = new StatsError('통계 에러 발생');

    expect(error.message).toBe('통계 에러 발생');
    expect(error.name).toBe('StatsError');
    expect(error.status).toBe(500);
    expect(error.code).toBeUndefined();
  });

  test('메시지와 에러 코드로 생성된다', () => {
    const error = new StatsError('통계 에러 발생', 'STATS_ERROR');

    expect(error.message).toBe('통계 에러 발생');
    expect(error.code).toBe('STATS_ERROR');
    expect(error.name).toBe('StatsError');
    expect(error.status).toBe(500);
  });
});

describe('ChartError', () => {
  test('메시지만으로 생성된다', () => {
    const error = new ChartError('차트 에러 발생');

    expect(error.message).toBe('차트 에러 발생');
    expect(error.name).toBe('ChartError');
    expect(error.status).toBe(500);
    expect(error.code).toBeUndefined();
  });

  test('메시지와 에러 코드로 생성된다', () => {
    const error = new ChartError('차트 에러 발생', 'CHART_ERROR');

    expect(error.message).toBe('차트 에러 발생');
    expect(error.code).toBe('CHART_ERROR');
    expect(error.name).toBe('ChartError');
    expect(error.status).toBe(500);
  });
});

describe('ActivityError', () => {
  test('메시지만으로 생성된다', () => {
    const error = new ActivityError('활동 에러 발생');

    expect(error.message).toBe('활동 에러 발생');
    expect(error.name).toBe('ActivityError');
    expect(error.status).toBe(500);
    expect(error.code).toBeUndefined();
  });

  test('메시지와 에러 코드로 생성된다', () => {
    const error = new ActivityError('활동 에러 발생', 'ACTIVITY_ERROR');

    expect(error.message).toBe('활동 에러 발생');
    expect(error.code).toBe('ACTIVITY_ERROR');
    expect(error.name).toBe('ActivityError');
    expect(error.status).toBe(500);
  });
});

describe('NetworkError', () => {
  test('기본 메시지로 생성된다', () => {
    const error = new NetworkError();

    expect(error.message).toBe('네트워크 오류가 발생했습니다');
    expect(error.name).toBe('NetworkError');
    expect(error.code).toBe('NETWORK_ERROR');
    expect(error.status).toBe(0);
  });

  test('커스텀 메시지로 생성된다', () => {
    const error = new NetworkError('연결 실패');

    expect(error.message).toBe('연결 실패');
    expect(error.name).toBe('NetworkError');
    expect(error.code).toBe('NETWORK_ERROR');
    expect(error.status).toBe(0);
  });
});

describe('에러 클래스 상속 관계', () => {
  test('모든 커스텀 에러는 Error를 상속한다', () => {
    expect(new StatsError('test')).toBeInstanceOf(Error);
    expect(new ChartError('test')).toBeInstanceOf(Error);
    expect(new ActivityError('test')).toBeInstanceOf(Error);
    expect(new NetworkError()).toBeInstanceOf(Error);
    expect(new AuthError()).toBeInstanceOf(Error);
  });

  test('각 에러는 고유한 타입을 가진다', () => {
    const statsError = new StatsError('test');
    const chartError = new ChartError('test');
    const activityError = new ActivityError('test');

    expect(statsError).toBeInstanceOf(StatsError);
    expect(statsError).not.toBeInstanceOf(ChartError);
    expect(chartError).toBeInstanceOf(ChartError);
    expect(chartError).not.toBeInstanceOf(ActivityError);
    expect(activityError).toBeInstanceOf(ActivityError);
    expect(activityError).not.toBeInstanceOf(StatsError);
  });
});
