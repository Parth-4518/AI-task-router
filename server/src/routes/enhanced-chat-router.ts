import { Router, type Request, type Response } from "express";
import type { Db } from "@paperclipai/db";
import { agents, issues } from "@paperclipai/db";
import { eq, and } from "drizzle-orm";
import { validate } from "../middleware/validate.js";
import { assertCompanyAccess } from "./authz.js";
import { agentService, issueService } from "../services/index.js";
import { logActivity } from "../services/index.js";
import { forbidden, notFound } from "../errors.js";
import { z } from "zod";

// Enhanced classification mapping
const CLASSIFICATION_MAP: Record<string, string[]> = {
  // Content/Marketing
  content: ["cmo", "content", "marketing"],
  blog: ["cmo", "content", "marketing"],
  social: ["cmo", "content", "marketing"],
  marketing: ["cmo", "content", "marketing"],
  copy: ["cmo", "content", "marketing"],
  
  // Security
  security: ["security", "secops"],
  audit: ["security", "secops"],
  vulnerability: ["security", "secops"],
  penetration: ["security", "secops"],
  
  // Engineering
  backend: ["engineer", "developer"],
  api: ["engineer", "developer"],
  code: ["engineer", "developer"],
  programming: ["engineer", "developer"],
  software: ["engineer", "developer"],
  feature: ["engineer", "developer"],
  implement: ["engineer", "developer"],
  build: ["engineer", "developer"],
  
  // QA/Testing
  testing: ["qa", "tester"],
  bug: ["qa", "tester"],
  test: ["qa", "tester"],
  quality: ["qa", "tester"],
  regression: ["qa", "tester"],
  
  // Leadership
  roadmap: ["ceo", "cto"],
  strategy: ["ceo", "cto"],
  vision: ["ceo", "cto"],
  planning: ["ceo", "cto"],
  
  // DevOps
  deploy: ["devops", "sre"],
  deployment: ["devops", "sre"],
  infrastructure: ["devops", "sre"],
  pipeline: ["devops", "sre"],
  ci: ["devops", "sre"],
  cd: ["devops", "sre"],
  
  // Data
  data: ["data", "analyst"],
  analytics: ["data", "analyst"],
  report: ["data", "analyst"],
  metrics: ["data", "analyst"],
  
  // Design
  design: ["designer", "ui", "ux"],
  ui: ["designer", "ui", "ux"],
  ux: ["designer", "ui", "ux"],
  frontend: ["designer", "ui", "ux"],
  
  // Product
  product: ["pm", "product"],
  requirement: ["pm", "product"],
  spec: ["pm", "product"],
};

// Request/Response schemas
const enhancedChatRouteRequestSchema = z.object({
  prompt: z.string().trim().min(1).max(10000),
  companyId: z.string().uuid(),
  autoCreateIssue: z.boolean().optional().default(false),
});

const enhancedChatRouteResponseSchema = z.object({
  matchedAgent: z.object({
    id: z.string().uuid(),
    name: z.string(),
    role: z.string(),
    adapterType: z.string(),
  }),
  issue: z.object({
    title: z.string(),
    description: z.string(),
    status: z.string(),
    priority: z.string(),
  }),
  classification: z.object({
    detectedKeywords: z.array(z.string()),
    matchedRoles: z.array(z.string()),
    confidence: z.number(),
  }),
});

type EnhancedChatRouteRequest = z.infer<typeof enhancedChatRouteRequestSchema>;
type EnhancedChatRouteResponse = z.infer<typeof enhancedChatRouteResponseSchema>;

export function enhancedChatRouterRoutes(db: Db) {
  const router = Router();
  const agentSvc = agentService(db);
  const issueSvc = issueService(db);

  /**
   * POST /api/chat/route
   *
   * Enhanced AI Router with:
   * - Keyword-based intent classification
   * - Role mapping
   * - Auto-issue creation
   * - Confidence scoring
   */
  router.post("/chat/route", validate(enhancedChatRouteRequestSchema), async (req: Request, res: Response) => {
    const body = req.body as EnhancedChatRouteRequest;
    const companyId = body.companyId;

    // Verify actor has access to the company
    assertCompanyAccess(req, companyId);

    // Only board users can use this endpoint
    if (req.actor.type === "agent") {
      throw forbidden("Only board users can route chat requests");
    }

    // List active agents in the company
    const companyAgents = await agentSvc.list(companyId);
    const activeAgents = companyAgents.filter(
      (a) => a.status !== "terminated" && a.status !== "pending_approval"
    );

    if (activeAgents.length === 0) {
      res.status(404).json({ error: "No active agents found in this company" });
      return;
    }

    // Classify intent
    const classification = classifyIntent(body.prompt);

    // Find best matching agent
    const matchResult = findBestAgent(body.prompt, activeAgents, classification);

    if (!matchResult.agent) {
      res.status(404).json({ 
        error: "Could not match prompt to any agent",
        classification 
      });
      return;
    }

    const matchedAgent = matchResult.agent;

    // Generate issue details
    const issueTitle = generateIssueTitle(body.prompt);
    const issueDescription = generateIssueDescription(body.prompt, matchedAgent, classification);
    const priority = detectPriority(body.prompt);

    // Auto-create issue if requested
    let createdIssue = null;
    if (body.autoCreateIssue) {
      try {
        createdIssue = await issueSvc.create(companyId, {
          title: issueTitle,
          description: issueDescription,
          status: "backlog",
          priority,
          assigneeAgentId: matchedAgent.id,
        });
      } catch (err) {
        console.error("Failed to auto-create issue:", err);
      }
    }

    // Build the response
    const response: EnhancedChatRouteResponse = {
      matchedAgent: {
        id: matchedAgent.id,
        name: matchedAgent.name,
        role: matchedAgent.role ?? "",
        adapterType: matchedAgent.adapterType ?? "",
      },
      issue: {
        title: issueTitle,
        description: issueDescription,
        status: "backlog",
        priority,
      },
      classification: {
        detectedKeywords: classification.detectedKeywords,
        matchedRoles: classification.matchedRoles,
        confidence: matchResult.confidence,
      },
    };

    // Add issue ID if auto-created
    if (createdIssue) {
      (response as any).createdIssue = {
        id: createdIssue.id,
        identifier: createdIssue.identifier,
        url: `/issues/${createdIssue.identifier}`,
      };
    }

    // Log activity
    await logActivity(db, {
      companyId,
      entityType: "agent",
      entityId: matchedAgent.id,
      action: "agent.chat_routed",
      actorType: req.actor.type === "board" ? "user" : (req.actor.type === "none" ? "system" : req.actor.type),
      actorId: req.actor.type === "board" ? (req.actor.userId ?? "unknown") : (req.actor.agentId ?? "unknown"),
      agentId: null,
      runId: null,
      details: {
        prompt: body.prompt,
        matchedAgentId: matchedAgent.id,
        matchedAgentName: matchedAgent.name,
        suggestedIssueTitle: issueTitle,
        classification: classification.detectedKeywords,
        autoCreated: body.autoCreateIssue,
        createdIssueId: createdIssue?.id,
      },
    });

    res.json(response);
  });

  /**
   * GET /api/chat/agents
   * 
   * List available agents for the chat interface
   */
  router.get("/chat/agents", async (req: Request, res: Response) => {
    const companyId = req.query.companyId as string;
    
    if (!companyId) {
      res.status(400).json({ error: "companyId is required" });
      return;
    }

    assertCompanyAccess(req, companyId);

    const companyAgents = await agentSvc.list(companyId);
    const activeAgents = companyAgents.filter(
      (a) => a.status !== "terminated" && a.status !== "pending_approval"
    );

    const agentCards = activeAgents.map(agent => ({
      id: agent.id,
      name: agent.name,
      role: agent.role,
      title: agent.title,
      status: agent.status,
      adapterType: agent.adapterType,
      avatar: getAgentAvatar(agent.role),
      color: getAgentColor(agent.role),
    }));

    res.json({ agents: agentCards });
  });

  return router;
}

// Intent classification
function classifyIntent(prompt: string) {
  const lower = prompt.toLowerCase();
  const words = lower.split(/\s+/);
  
  const detectedKeywords: string[] = [];
  const matchedRoles: string[] = [];
  
  for (const [keyword, roles] of Object.entries(CLASSIFICATION_MAP)) {
    if (lower.includes(keyword)) {
      detectedKeywords.push(keyword);
      matchedRoles.push(...roles);
    }
  }
  
  // Remove duplicates
  const uniqueRoles = [...new Set(matchedRoles)];
  
  return {
    detectedKeywords: [...new Set(detectedKeywords)],
    matchedRoles: uniqueRoles,
    wordCount: words.length,
  };
}

// Find best matching agent
function findBestAgent(
  prompt: string, 
  agents: any[], 
  classification: { detectedKeywords: string[]; matchedRoles: string[] }
) {
  const lower = prompt.toLowerCase();
  
  const scoredAgents = agents.map((agent) => {
    let score = 0;
    const role = (agent.role ?? "").toLowerCase();
    const title = (agent.title ?? "").toLowerCase();
    const name = (agent.name ?? "").toLowerCase();
    
    // Direct role match from classification
    for (const matchedRole of classification.matchedRoles) {
      if (role.includes(matchedRole.toLowerCase())) {
        score += 15;
      }
      if (title.includes(matchedRole.toLowerCase())) {
        score += 10;
      }
    }
    
    // Keyword matches
    for (const keyword of classification.detectedKeywords) {
      if (role.includes(keyword)) score += 8;
      if (title.includes(keyword)) score += 6;
      if (name.includes(keyword)) score += 4;
    }
    
    // Generic keyword boosts
    const genericKeywords: Record<string, string[]> = {
      code: ["engineer", "developer", "dev"],
      bug: ["engineer", "developer", "qa"],
      design: ["designer", "ui", "ux"],
      deploy: ["devops", "sre"],
      data: ["data", "analyst"],
      product: ["product", "pm"],
      security: ["security", "secops"],
    };
    
    for (const [keyword, relatedRoles] of Object.entries(genericKeywords)) {
      if (lower.includes(keyword)) {
        for (const relatedRole of relatedRoles) {
          if (role.includes(relatedRole) || title.includes(relatedRole)) {
            score += 5;
          }
        }
      }
    }
    
    return { agent, score };
  });
  
  scoredAgents.sort((a, b) => b.score - a.score);
  const bestMatch = scoredAgents[0];
  
  if (!bestMatch || bestMatch.score < 0) {
    return { agent: null, confidence: 0 };
  }
  
  // Calculate confidence (0-1)
  const maxPossibleScore = 50;
  const confidence = Math.min(bestMatch.score / maxPossibleScore, 1);
  
  return { agent: bestMatch.agent, confidence };
}

function generateIssueTitle(prompt: string): string {
  const firstSentence = prompt.split(/[.!?]/)[0]?.trim() ?? prompt;
  if (firstSentence.length <= 80) return firstSentence;
  return firstSentence.slice(0, 77) + "...";
}

function generateIssueDescription(
  prompt: string, 
  agent: { name: string; role?: string | null },
  classification: { detectedKeywords: string[] }
): string {
  const lines = [
    `**Routed to:** ${agent.name}${agent.role ? ` (${agent.role})` : ""}`,
    "",
    "**User Request:**",
    prompt,
    "",
    "**Detected Keywords:**",
    classification.detectedKeywords.map(k => `- ${k}`).join("\n") || "- None",
    "",
    "**Suggested Next Steps:**",
    "- Review and refine the issue details",
    "- Assign to the matched agent if appropriate",
    "- Add any relevant labels or priorities",
  ];
  return lines.join("\n");
}

function detectPriority(prompt: string): "low" | "medium" | "high" | "critical" {
  const lower = prompt.toLowerCase();
  
  if (
    lower.includes("urgent") ||
    lower.includes("critical") ||
    lower.includes("emergency") ||
    lower.includes("asap") ||
    lower.includes("down") ||
    lower.includes("broken") ||
    lower.includes("failure") ||
    lower.includes("security") ||
    lower.includes("vulnerability")
  ) {
    return "critical";
  }
  
  if (
    lower.includes("important") ||
    lower.includes("high priority") ||
    lower.includes("blocking")
  ) {
    return "high";
  }
  
  if (
    lower.includes("nice to have") ||
    lower.includes("low priority") ||
    lower.includes("whenever")
  ) {
    return "low";
  }
  
  return "medium";
}

function getAgentAvatar(role?: string | null): string {
  const avatars: Record<string, string> = {
    ceo: "👔",
    cto: "💻",
    cmo: "📢",
    engineer: "⚙️",
    developer: "💻",
    qa: "🧪",
    tester: "🔍",
    devops: "🚀",
    sre: "🔧",
    designer: "🎨",
    pm: "📋",
    product: "📦",
    data: "📊",
    analyst: "📈",
    security: "🔒",
    secops: "🛡️",
  };
  
  return avatars[role ?? ""] ?? "🤖";
}

function getAgentColor(role?: string | null): string {
  const colors: Record<string, string> = {
    ceo: "#FF6B6B",
    cto: "#4ECDC4",
    cmo: "#FF8C42",
    engineer: "#45B7D1",
    developer: "#96CEB4",
    qa: "#FFEAA7",
    tester: "#DDA0DD",
    devops: "#98D8C8",
    sre: "#F7DC6F",
    designer: "#BB8FCE",
    pm: "#85C1E9",
    product: "#F8C471",
    data: "#82E0AA",
    analyst: "#AED6F1",
    security: "#E74C3C",
    secops: "#C0392B",
  };
  
  return colors[role ?? ""] ?? "#95A5A6";
}
