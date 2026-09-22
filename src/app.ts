import express from "express";
import type { Express, Request, Response } from "express";
import cors from "cors";
import { requestLoggerMiddleware } from "./middleware/request-logger.js";
import { errorHandlerMiddleware } from "./middleware/error-handler.js";
import { createNotFoundError } from "./errors/app-error.js";

export const createExpressApplication = (): Express => {
  const application: Express = express();

  application.use(cors());
  application.use(express.json({ limit: "1mb" }));
  application.use(requestLoggerMiddleware);

  application.get("/api/health", (_incomingRequest: Request, outgoingResponse: Response): void => {
    outgoingResponse.status(200).json({
      status: "healthy",
      service: "claimlens-api",
      timestamp: new Date().toISOString(),
    });
  });

  // Catch unmatched routes and convert to NotFoundError
  application.use((incomingRequest: Request): void => {
    throw createNotFoundError("Route endpoint", incomingRequest.originalUrl);
  });

  application.use(errorHandlerMiddleware);

  return application;
};
