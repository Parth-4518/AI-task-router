import { z } from "zod";
import { ISSUE_PRIORITIES, ISSUE_STATUSES } from "../constants.js";
import { multilineTextSchema } from "./text.js";

export const chatRouteRequestSchema = z.object({
  prompt: z.string().trim().min(1).max(10000),
  companyId: z.string().uuid(),
});

export type ChatRouteRequest = z.infer<typeof chatRouteRequestSchema>;

export const chatRouteResponseSchema = z.object({
  matchedAgent: z.object({
    id: z.string().uuid(),
    name: z.string(),
    role: z.string(),
    adapterType: z.string(),
  }),
  issue: z.object({
    title: z.string(),
    description: multilineTextSchema.nullable().optional(),
    status: z.enum(ISSUE_STATUSES).optional().default("backlog"),
    priority: z.enum(ISSUE_PRIORITIES).optional().default("medium"),
  }),
});

export type ChatRouteResponse = z.infer<typeof chatRouteResponseSchema>;
