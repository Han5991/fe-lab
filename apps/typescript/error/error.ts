export const testError = () => {
  throw new Error('error');
};

export const NotThrowError = () => {
  try {
    testError();
  } catch (e: any) {
    console.log(e);
  }
};

export const NotThrowError2 = () => {
  testError();
};

export const asyncError = async () => {
  throw new Error('error');
};

export const asyncNotThrowError = async () => {
  try {
    await asyncError();
  } catch (e: any) {
    console.log(e);
  }
};

export const asyncNotThrowError2 = async () => {
  await asyncError();
};

// 커스텀 에러 클래스들
class CustomError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CustomError';
  }
}

class ValidationError extends CustomError {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export const handleSpecificErrors = () => {
  try {
    testError();
  } catch (e) {
    if (e instanceof ValidationError) {
      // 유효성 검증 에러 처리
      console.error('Validation error:', e.message);
    } else if (e instanceof CustomError) {
      // 커스텀 에러 처리
      console.error('Custom error:', e.message);
    } else if (e instanceof Error) {
      // 기본 에러 처리
      console.error('Generic error:', e.message);
    } else {
      // 알 수 없는 에러 처리
      console.error('Unknown error:', e);
    }
  }
};

export const handleMultipleAsyncErrors = async () => {
  try {
    await Promise.all([asyncError(), asyncError(), asyncError()]);
  } catch (e) {
    // Promise.all의 에러 처리
    console.error('One of the promises failed:', e);
  }
};

export const chainedErrorHandler = async () => {
  try {
    await asyncError();
  } catch (e: any) {
    // 에러를 수정하거나 추가 정보를 덧붙여 다시 던지기
    throw new CustomError(`추가 컨텍스트와 함께 에러 전파: ${e.message}`);
  }
};

export const asyncErrorWrapper = async <T>(
  promise: Promise<T>,
): Promise<[T | null, Error | null]> => {
  try {
    const data = await promise;
    return [data, null];
  } catch (error) {
    return [null, error instanceof Error ? error : new Error(String(error))];
  }
};

export const executeTest = () => {
  testError();
  console.log('test');
};
