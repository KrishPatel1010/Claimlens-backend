export class AppError extends Error {
  public readonly errorCode: string;
  public readonly httpStatusCode: number;
  public readonly errorDetails: unknown;

  constructor(
    errorMessage: string,
    errorCode: string,
    httpStatusCode: number,
    errorDetails: unknown = null,
  ) {
    super(errorMessage);
    this.name = "AppError";
    this.errorCode = errorCode;
    this.httpStatusCode = httpStatusCode;
    this.errorDetails = errorDetails;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export const createValidationError = (
  errorMessage: string,
  errorDetails: unknown = null,
): AppError => {
  return new AppError(errorMessage, "VALIDATION_ERROR", 400, errorDetails);
};

export const createNotFoundError = (
  resourceName: string,
  resourceIdentifier: string,
): AppError => {
  return new AppError(
    `${resourceName} with identifier '${resourceIdentifier}' was not found.`,
    "RESOURCE_NOT_FOUND",
    404,
  );
};

export const createExternalApiError = (
  providerName: string,
  errorMessage: string,
  upstreamStatusCode: number = 502,
): AppError => {
  return new AppError(
    `External provider '${providerName}' failed: ${errorMessage}`,
    "EXTERNAL_API_ERROR",
    upstreamStatusCode,
  );
};

export const createRateLimitExceededError = (
  retryAfterSeconds: number = 60,
): AppError => {
  return new AppError(
    "Rate limit exceeded. Please wait before submitting another video verification request.",
    "RATE_LIMIT_EXCEEDED",
    429,
    { retryAfterSeconds },
  );
};
