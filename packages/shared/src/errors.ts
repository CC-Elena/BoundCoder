export class BoundCoderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BoundCoderError";
  }
}
