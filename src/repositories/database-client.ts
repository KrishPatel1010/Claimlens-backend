import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { currentEnvironment } from "../config/environment.js";
import { systemLogger } from "../utils/logger.js";
import * as databaseSchema from "../schemas/database.schema.js";

let databaseClientInstance: PostgresJsDatabase<typeof databaseSchema> | null = null;

export const getDatabaseClient = (): PostgresJsDatabase<typeof databaseSchema> | null => {
  if (databaseClientInstance !== null) {
    return databaseClientInstance;
  }

  const databaseConnectionUrl = currentEnvironment.DATABASE_URL;

  if (!databaseConnectionUrl || databaseConnectionUrl.trim().length === 0) {
    systemLogger.warn(
      "DATABASE_URL is not configured. Running database layer in offline in-memory fallback mode.",
    );
    return null;
  }

  try {
    const postgresClient = postgres(databaseConnectionUrl, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    });

    databaseClientInstance = drizzle(postgresClient, { schema: databaseSchema });
    systemLogger.info("Database client connection successfully established with PostgreSQL.");
    return databaseClientInstance;
  } catch (connectionError) {
    systemLogger.error(
      "Failed to establish PostgreSQL connection. Falling back to local in-memory store.",
      { connectionError: connectionError instanceof Error ? connectionError.message : String(connectionError) },
    );
    return null;
  }
};
