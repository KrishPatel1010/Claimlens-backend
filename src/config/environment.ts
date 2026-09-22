import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const environmentSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(4000),
  SERPAPI_KEY: z.string().optional().default(""),
  GOOGLE_FACT_CHECK_KEY: z.string().optional().default(""),
  LLM_API_KEY: z.string().optional().default(""),
  SUPABASE_URL: z.string().optional().default(""),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional().default(""),
  DATABASE_URL: z.string().optional().default(""),
  REDIS_URL: z.string().default("redis://localhost:6379"),
});

export type EnvironmentConfiguration = z.infer<typeof environmentSchema>;

export const validateEnvironmentConfiguration = (): EnvironmentConfiguration => {
  const parseResult = environmentSchema.safeParse(process.env);

  if (!parseResult.success) {
    const formattedErrorMessages = parseResult.error.errors
      .map((validationIssue) => `${validationIssue.path.join(".")}: ${validationIssue.message}`)
      .join(", ");
    throw new Error(`Environment configuration validation failed: ${formattedErrorMessages}`);
  }

  return parseResult.data;
};

export const currentEnvironment: EnvironmentConfiguration = validateEnvironmentConfiguration();
