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

  it.each([
    [
      'Error 거절',
      () => Promise.reject(new Error('error')),
      [null, new Error('error')],
    ],
    ['성공', () => Promise.resolve(42), [42, null]],
    [
      'Error가 아닌 거절',
      () => Promise.reject('거절'),
      [null, new Error('거절')],
    ],
  ])('래퍼는 %s을 [값, 에러]로 돌려준다', async (_, promise, expected) => {
    await expect(asyncErrorWrapper(promise())).resolves.toEqual(expected);
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
    [new ValidationError('bad'), 'Validation error:', 'bad'],
    [new CustomError('custom'), 'Custom error:', 'custom'],
    [new Error('generic'), 'Generic error:', 'generic'],
    ['문자열', 'Unknown error:', '문자열'],
  ])(
    '커스텀 에러 처리 — %s는 %s 분기에서 처리한다',
    (thrown, label, logged) => {
      const logError = vi.spyOn(console, 'error').mockImplementation(() => {});

      handleSpecificErrors(() => {
        throw thrown;
      });

      expect(logError).toHaveBeenCalledWith(label, logged);
    },
  );

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
