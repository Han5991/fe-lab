import {
  asyncError,
  asyncErrorWrapper,
  asyncNotThrowError,
  asyncNotThrowError2,
  chainedErrorHandler,
  handleMultipleAsyncErrors,
  handleSpecificErrors,
  NotThrowError,
  NotThrowError2,
  testError,
  executeTest,
} from "./error";

describe("error test", () => {
  it("에러 던지는지 확인", () => {
    expect(testError).toThrow();
  });

  it("try catch 잡고 던지지 않음", () => {
    expect(NotThrowError).not.toThrow();
  });

  it("try catch 안 써서 못 잡음", () => {
    expect(NotThrowError2).toThrow();
  });

  it("비동기 에러 처리", async () => {
    await expect(asyncError).rejects.toThrow();
  });

  it("비동기 인대 try catch 잡고 던지지 않음", async () => {
    await expect(asyncNotThrowError()).resolves.not.toThrow();
  });

  it("비동기 에러 처리", async () => {
    await expect(asyncNotThrowError2).rejects.toThrow();
  });

  it("래퍼로 비동기 오류를 포착해야합니다", async () => {
    await expect(
      asyncErrorWrapper(new Promise((_, reject) => reject(new Error("error")))),
    ).resolves.not.toThrow();
  });

  it("비동기 여러개 에러 처리 안 함", async () => {
    await expect(handleMultipleAsyncErrors()).resolves.not.toThrow();
  });

  it("커스텀 에러 처리", () => {
    expect(handleSpecificErrors).not.toThrow();
  });

  it("비동기 에러 처리2", async () => {
    await expect(chainedErrorHandler).rejects.toThrow();
  });

  it("에러가 던져지면 콘솔로그가 실행되지 않음", () => {
    const consoleSpy = jest.spyOn(console, "log");
    expect(executeTest).toThrow();
    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
