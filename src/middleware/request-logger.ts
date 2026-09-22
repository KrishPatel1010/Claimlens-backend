import type { Request, Response, NextFunction, RequestHandler } from "express";
import { systemLogger } from "../utils/logger.js";

export const requestLoggerMiddleware: RequestHandler = (
  incomingRequest: Request,
  outgoingResponse: Response,
  nextMiddlewareFunction: NextFunction,
): void => {
  const requestStartTime = Date.now();
  const { method: httpMethod, originalUrl: requestUrl, ip: clientIpAddress } = incomingRequest;

  outgoingResponse.on("finish", () => {
    const processingDurationMilliseconds = Date.now() - requestStartTime;
    const httpStatusCode = outgoingResponse.statusCode;

    const logMetadata = {
      httpMethod,
      requestUrl,
      httpStatusCode,
      clientIpAddress,
      processingDurationMilliseconds,
    };

    if (httpStatusCode >= 500) {
      systemLogger.error(`HTTP ${httpMethod} ${requestUrl} finished with status ${httpStatusCode}`, logMetadata);
    } else if (httpStatusCode >= 400) {
      systemLogger.warn(`HTTP ${httpMethod} ${requestUrl} finished with status ${httpStatusCode}`, logMetadata);
    } else {
      systemLogger.info(`HTTP ${httpMethod} ${requestUrl} finished with status ${httpStatusCode}`, logMetadata);
    }
  });

  nextMiddlewareFunction();
};
