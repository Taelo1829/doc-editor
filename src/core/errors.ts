/** Thrown when the user backs out of something, e.g. closes a password prompt. Not a failure. */
export class OperationCancelledError extends Error {
  constructor(what: string) {
    super(`${what} was cancelled`);
    this.name = "OperationCancelledError";
  }
}
