import winston from "winston";
import { currentEnvironment } from "../config/environment.js";

const { combine, timestamp, printf, colorize, json, errors } = winston.format;

const maskSensitiveData = (rawLogMessage: string): string => {
  return rawLogMessage.replace(
    /(key|token|secret|password|authorization)=["']?([^"'\s&]+)["']?/gi,
    "$1=***MASKED***",
  );
};

const developmentConsoleFormat = printf(
  ({ level, message, timestamp: logTimestamp, stack, ...metaProperties }) => {
    const formattedMeta = Object.keys(metaProperties).length > 0
      ? `\n${JSON.stringify(metaProperties, null, 2)}`
      : "";
    const logOutput = `${logTimestamp} [${level}]: ${stack ?? message}${formattedMeta}`;
    return maskSensitiveData(logOutput);
  },
);

const isProductionEnvironment = currentEnvironment.NODE_ENV === "production";

export const systemLogger: winston.Logger = winston.createLogger({
  level: isProductionEnvironment ? "info" : "debug",
  format: combine(
    timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
    errors({ stack: true }),
    isProductionEnvironment ? json() : combine(colorize({ all: true }), developmentConsoleFormat),
  ),
  defaultMeta: {
    serviceName: "claimlens-api",
  },
  transports: [
    new winston.transports.Console(),
  ],
});

export interface PipelineLogContext {
  readonly pipelineStage: string;
  readonly youtubeVideoId?: string;
  readonly claimId?: string;
}

export const createPipelineLogger = (context: PipelineLogContext): winston.Logger => {
  return systemLogger.child({
    pipelineStage: context.pipelineStage,
    ...(context.youtubeVideoId ? { youtubeVideoId: context.youtubeVideoId } : {}),
    ...(context.claimId ? { claimId: context.claimId } : {}),
  });
};
