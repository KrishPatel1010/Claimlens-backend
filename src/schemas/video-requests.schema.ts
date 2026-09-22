import { z } from "zod";

export const processVideoRequestSchema = z.object({
  youtubeUrl: z
    .string({ required_error: "A 'youtubeUrl' field is required in the request body." })
    .min(1, "The 'youtubeUrl' string cannot be empty."),
  videoTitle: z.string().optional().nullable(),
});

export type ProcessVideoRequestBody = z.infer<typeof processVideoRequestSchema>;
