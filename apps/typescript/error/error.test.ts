import {
  asyncError,
  asyncErrorWrapper,
  asyncNotThrowError,
  asyncNotThrowError2,
  chainedErrorHandler,
  CustomError,
  handleMultipleAsyncErrors,
  handleSpecificErrors,
  NotThrowError,
  NotThrowError2,
  testError,
  executeTest,
  ValidationError,
} from './error';

// `.resolves.not.toThrow()`는 프라미스가 resolve하기만 하면 값과 상관없이 통과한다 —
// 무엇을 돌려주는지(또는 무엇을 기록하는지)를 직접 확인한다

describe('error test', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('에러 던지는지 확인', () => {
    expect(testError).toThrow();
  });

  it('try catch 잡고 던지지 않음', () => {
    expect(NotThrowError).not.toThrow();
  });

  it('try catch 안 써서 못 잡음', () => {
    expect(NotThrowError2).toThrow();
  });

  it('비동기 에러 처리', async () => {
    await expect(asyncError).rejects.toThrow();
  });

  it('비동기 인대 try catch 잡고 던지지 않음', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    await expect(asyncNotThrowError()).resolves.toBeUndefined();
    expect(log).toHaveBeenCalledWith(expect.any(Error));
  });

  it('비동기 에러 처리', async () => {
    await expect(asyncNotThrowError2).rejects.toThrow();
  });

  it('래퍼로 비동기 오류를 포착해야합니다', async () => {
    const [data, error] = await asyncErrorWrapper(
      new Promise((_, reject) => reject(new Error('error'))),
    );

    expect(data).toBeNull();
    expect(error).toBeInstanceOf(Error);
    expect(error?.message).toBe('error');
  });

  it('래퍼는 성공하면 [값, null]을 돌려준다', async () => {
    await expect(asyncErrorWrapper(Promise.resolve(42))).resolves.toEqual([
      42,
      null,
    ]);
  });

  it('래퍼는 Error가 아닌 거절 값도 Error로 감싼다', async () => {
    const [, error] = await asyncErrorWrapper(Promise.reject('문자열 거절'));

    expect(error).toBeInstanceOf(Error);
    expect(error?.message).toBe('문자열 거절');
  });

  it('비동기 여러개 에러 처리 안 함', async () => {
    const logError = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(handleMultipleAsyncErrors()).resolves.toBeUndefined();
    expect(logError).toHaveBeenCalledWith(
      'One of the promises failed:',
      expect.any(Error),
    );
  });

  it.each([
    ['유효성 검증', new ValidationError('bad'), 'Validation error:'],
    ['커스텀', new CustomError('custom'), 'Custom error:'],
    ['일반', new Error('generic'), 'Generic error:'],
  ])(
    '커스텀 에러 처리 — %s 에러는 자기 분기에서 처리한다',
    (_, error, label) => {
      const logError = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() =>
        handleSpecificErrors(() => {
          throw error;
        }),
      ).not.toThrow();
      expect(logError).toHaveBeenCalledWith(label, error.message);
    },
  );

  it('커스텀 에러 처리 — Error가 아닌 값은 알 수 없는 에러로 처리한다', () => {
    const logError = vi.spyOn(console, 'error').mockImplementation(() => {});

    handleSpecificErrors(() => {
      throw '문자열';
    });

    expect(logError).toHaveBeenCalledWith('Unknown error:', '문자열');
  });

  it('비동기 에러 처리2', async () => {
    await expect(chainedErrorHandler).rejects.toThrow();
  });

  it('에러가 던져지면 콘솔로그가 실행되지 않음', () => {
    const consoleSpy = vi.spyOn(console, 'log');
    expect(executeTest).toThrow();
    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
