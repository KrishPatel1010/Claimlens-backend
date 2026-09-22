import { createExpressApplication } from "./app.js";
import { currentEnvironment } from "./config/environment.js";
import { systemLogger } from "./utils/logger.js";

const startServer = (): void => {
  const application = createExpressApplication();
  const serverPort = currentEnvironment.PORT;

  const serverInstance = application.listen(serverPort, () => {
    systemLogger.info(`ClaimLens API server successfully started on port ${serverPort}`, {
      port: serverPort,
      environment: currentEnvironment.NODE_ENV,
      healthCheckUrl: `http://localhost:${serverPort}/api/health`,
    });
  });

  const initiateGracefulShutdown = (receivedSignal: string): void => {
    systemLogger.info(`Received ${receivedSignal}. Initiating graceful server shutdown...`);

    serverInstance.close((shutdownError) => {
      if (shutdownError) {
        systemLogger.error("Error encountered during server shutdown", {
          shutdownError: shutdownError.message,
        });
        process.exit(1);
      }

      systemLogger.info("Server terminated gracefully.");
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => initiateGracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => initiateGracefulShutdown("SIGINT"));
};

startServer();
