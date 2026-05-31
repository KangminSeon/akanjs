export class Exception extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly details?: unknown,
    public readonly data?: unknown,
  ) {
    super(message);
    this.name = this.constructor.name;
  }

  toJSON() {
    return {
      error: this.message,
      statusCode: this.statusCode,
      ...(this.details !== undefined ? { details: this.details } : {}),
      ...(this.data !== undefined ? { data: this.data } : {}),
    };
  }
  static BadRequest = class BadRequestException extends Exception {
    constructor(message = "Bad Request", details?: unknown) {
      super(400, message, details);
    }
  };
  static Unauthorized = class UnauthorizedException extends Exception {
    constructor(message = "Unauthorized", details?: unknown) {
      super(401, message, details);
    }
  };
  static Forbidden = class ForbiddenException extends Exception {
    constructor(message = "Forbidden", details?: unknown) {
      super(403, message, details);
    }
  };
  static NotFound = class NotFoundException extends Exception {
    constructor(message = "Not Found", details?: unknown) {
      super(404, message, details);
    }
  };
  static Conflict = class ConflictException extends Exception {
    constructor(message = "Conflict", details?: unknown) {
      super(409, message, details);
    }
  };
  static Error = class InternalServerErrorException extends Exception {
    constructor(message = "Internal Server Error", details?: unknown) {
      super(500, message, details);
    }
  };
}
