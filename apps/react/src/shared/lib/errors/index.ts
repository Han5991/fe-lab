export class BaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BaseError';
  }
}
export class CustomError extends BaseError {
  constructor(message: string) {
    super(message);
    this.name = 'CustomError';
  }
}
