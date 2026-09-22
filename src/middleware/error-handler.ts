import type { Request, Response, NextFunction, ErrorRequestHandler } from "express";
import { AppError } from "../errors/app-error.js";
import { systemLogger } from "../utils/logger.js";
import { currentEnvironment } from "../config/environment.js";

export const errorHandlerMiddleware: ErrorRequestHandler = (
  caughtError: unknown,
  incomingRequest: Request,
  outgoingResponse: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  nextMiddlewareFunction: NextFunction,
): void => {
  if (caughtError instanceof AppError) {
    systemLogger.warn(`Operational application error: ${caughtError.message}`, {
      errorCode: caughtError.errorCode,
      httpStatusCode: caughtError.httpStatusCode,
      requestUrl: incomingRequest.originalUrl,
      errorDetails: caughtError.errorDetails,
    });

    outgoingResponse.status(caughtError.httpStatusCode).json({
      error: {
        code: caughtError.errorCode,
        message: caughtError.message,
        details: caughtError.errorDetails,
      },
    });
    return;
  }

  const standardError = caughtError instanceof Error ? caughtError : new Error(String(caughtError));

  systemLogger.error(`Unhandled internal server error: ${standardError.message}`, {
    stackTrace: standardError.stack,
    requestUrl: incomingRequest.originalUrl,
    httpMethod: incomingRequest.method,
  });

  const isDevelopmentEnvironment = currentEnvironment.NODE_ENV === "development";

  outgoingResponse.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: isDevelopmentEnvironment
        ? standardError.message
        : "An unexpected internal server error occurred while processing your request.",
      ...(isDevelopmentEnvironment ? { stack: standardError.stack } : {}),
    },
  });
};
