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

  it("should throw async error", async () => {
    await expect(asyncError).rejects.toThrow();
  });

  it("should catch async error", async () => {
    await expect(asyncNotThrowError()).resolves.not.toThrow();
  });

  it("should not catch async error", async () => {
    await expect(asyncNotThrowError2).rejects.toThrow();
  });

  it("should catch async error with wrapper", async () => {
    await expect(
      asyncErrorWrapper(new Promise((_, reject) => reject(new Error("error")))),
    ).resolves.not.toThrow();
  });

  it("should handle multiple async errors", async () => {
    await expect(handleMultipleAsyncErrors()).resolves.not.toThrow();
  });

  it("should handle specific errors", () => {
    expect(handleSpecificErrors).not.toThrow();
  });

  it("should handle chained error handlers", async () => {
    await expect(chainedErrorHandler).rejects.toThrow();
  });
});
