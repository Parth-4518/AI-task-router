import { z } from "zod";
import { ISSUE_PRIORITIES, ISSUE_STATUSES } from "../constants.js";
import { multilineTextSchema } from "./text.js";

export const enhancedChatRouteRequestSchema = z.object({
  prompt: z.string().trim().min(1).max(10000),
  companyId: z.string().uuid(),
  autoCreateIssue: z.boolean().optional().default(false),
});

export type EnhancedChatRouteRequest = z.infer<typeof enhancedChatRouteRequestSchema>;

export const enhancedChatRouteResponseSchema = z.object({
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
  classification: z.object({
    detectedKeywords: z.array(z.string()),
    matchedRoles: z.array(z.string()),
    confidence: z.number(),
  }),
  createdIssue: z.object({
    id: z.string().uuid(),
    identifier: z.string(),
    url: z.string(),
  }).optional(),
});

export type EnhancedChatRouteResponse = z.infer<typeof enhancedChatRouteResponseSchema>;
