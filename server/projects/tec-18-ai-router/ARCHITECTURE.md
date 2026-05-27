# TEC-18: AI Router API — Architecture Document

**Date:** 2026-05-21
**Author:** CEO Agent
**Related:** TEC-16 (done — prior implementation)

---

## 1. System Context

```
┌─────────────┐      POST /api/chat/route       ┌─────────────────┐
│   Client    │ ───────────────────────────────► │   AI Router     │
│  (UI/Bot)   │                                  │    Service      │
└─────────────┘                                  └────────┬────────┘
                                                          │
                              ┌───────────────────────────┼───────────┐
                              ▼                           ▼           ▼
                    ┌─────────────────┐         ┌──────────────┐ ┌──────────┐
                    │ Intent Classifier│         │ Agent Matcher │ │ Issue    │
                    │   (Rule/LLM)    │         │  (TEC-9 svc)  │ │ Generator│
                    └─────────────────┘         └──────────────┘ └──────────┘
```

---

## 2. Route Implementation

### 2.1 File Location

```
server/src/routes/chat-router.ts
```

### 2.2 Route Handler

```typescript
import { Router } from "express";
import { z } from "zod";
import { requireCompanyAccess } from "../middleware/auth";
import { logActivity } from "../middleware/activity";
import { IntentClassifier } from "../services/ai-router/intent-classifier";
import { AgentMatcher } from "../services/ai-router/agent-matcher";
import { IssueGenerator } from "../services/ai-router/issue-generator";

const router = Router();

const chatRouteSchema = z.object({
  prompt: z.string().min(1).max(4000),
  companyId: z.string().uuid(),
  context: z.object({
    projectId: z.string().uuid().optional(),
    priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  }).optional(),
});

router.post("/route", requireCompanyAccess, async (req, res) => {
  const parse = chatRouteSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: "Invalid request", details: parse.error });
  }

  const { prompt, companyId, context } = parse.data;

  // 1. Classify intent
  const intent = await IntentClassifier.classify(prompt);

  // 2. Route based on intent
  switch (intent.type) {
    case "create_task":
    case "create_bug":
    case "create_story":
    case "create_epic": {
      const agent = await AgentMatcher.findBest(companyId, intent.skills);
      const issue = await IssueGenerator.generate(prompt, intent, context);
      return res.json({
        matchedAgent: agent,
        generatedIssue: issue,
        routing: { action: "create_issue", targetEndpoint: `/api/companies/${companyId}/issues` },
      });
    }

    case "query_status": {
      const issueId = intent.extractedIssueId;
      const issue = await issueService.findByIdentifier(companyId, issueId);
      return res.json({
        matchedAgent: null,
        generatedIssue: null,
        routing: {
          action: "answer",
          targetEndpoint: `/api/issues/${issueId}`,
          answer: issue ? `${issue.identifier} is ${issue.status}.` : "Issue not found.",
        },
      });
    }

    case "list_issues": {
      const filters = intent.extractedFilters;
      return res.json({
        routing: {
          action: "answer",
          targetEndpoint: `/api/companies/${companyId}/issues`,
          filters,
        },
      });
    }

    case "delegate": {
      const { issueId, agentRole } = intent;
      const agent = await AgentMatcher.findByRole(companyId, agentRole);
      return res.json({
        matchedAgent: agent,
        routing: {
          action: "delegate",
          targetEndpoint: `/api/companies/${companyId}/delegate`,
          issueId,
        },
      });
    }

    case "clarify":
    default: {
      return res.status(400).json({
        error: "Ambiguous request",
        clarifyingQuestions: IntentClassifier.generateQuestions(prompt),
      });
    }
  }
});

export default router;
```

---

## 3. Services

### 3.1 Intent Classifier

```typescript
// server/src/services/ai-router/intent-classifier.ts

export class IntentClassifier {
  static async classify(prompt: string): Promise<Intent> {
    const lower = prompt.toLowerCase();

    // Rule-based classification (fast path)
    if (lower.match(/\b(status of|how is|what's happening with)\b/)) {
      const issueId = this.extractIssueId(prompt);
      return { type: "query_status", extractedIssueId: issueId };
    }

    if (lower.match(/\b(show me|list|find all|search for)\b/)) {
      const filters = this.extractFilters(prompt);
      return { type: "list_issues", extractedFilters: filters };
    }

    if (lower.match(/\b(assign|delegate|have .* review|give .* to)\b/)) {
      const { issueId, agentRole } = this.extractDelegation(prompt);
      return { type: "delegate", issueId, agentRole };
    }

    if (lower.match(/\b(bug|crash|error|fix|broken)\b/)) {
      return { type: "create_bug", skills: ["debugging", "testing"] };
    }

    if (lower.match(/\b(as a user|user story|feature request)\b/)) {
      return { type: "create_story", skills: ["product", "design"] };
    }

    if (lower.match(/\b(build|create|implement|add|make)\b/)) {
      return { type: "create_task", skills: this.inferSkills(prompt) };
    }

    return { type: "clarify" };
  }

  private static extractIssueId(prompt: string): string | null {
    const match = prompt.match(/\b(TEC-\d+|\d+)\b/);
    return match ? match[1] : null;
  }

  private static extractFilters(prompt: string): IssueFilters {
    const filters: IssueFilters = {};
    if (prompt.match(/\b(high priority|urgent|important)\b/)) filters.priority = "high";
    if (prompt.match(/\b(bug|bugs)\b/)) filters.type = "bug";
    if (prompt.match(/\b(done|completed|finished)\b/)) filters.status = "done";
    return filters;
  }

  private static inferSkills(prompt: string): string[] {
    const skillMap: Record<string, string[]> = {
      "frontend": ["react", "css", "ui"],
      "backend": ["api", "database", "server"],
      "database": ["sql", "schema", "migration"],
      "test": ["testing", "qa", "jest"],
      "deploy": ["devops", "ci/cd", "docker"],
    };

    const skills: string[] = [];
    for (const [keyword, skillList] of Object.entries(skillMap)) {
      if (prompt.toLowerCase().includes(keyword)) {
        skills.push(...skillList);
      }
    }
    return skills.length > 0 ? skills : ["general"];
  }

  static generateQuestions(prompt: string): string[] {
    return [
      "Could you clarify what you'd like to build?",
      "Is this a bug fix, feature, or research task?",
      "Which project or area should this be assigned to?",
    ];
  }
}
```

### 3.2 Agent Matcher

```typescript
// server/src/services/ai-router/agent-matcher.ts

export class AgentMatcher {
  static async findBest(companyId: string, skills: string[]): Promise<MatchedAgent> {
    const agents = await db.query.agentProfiles.findMany({
      where: (a, { eq, and }) => and(
        eq(a.companyId, companyId),
        eq(a.status, "active")
      ),
    });

    const scored = agents.map(agent => {
      const skillOverlap = agent.skills.filter(s =>
        skills.some(req => req.toLowerCase() === s.toLowerCase())
      ).length;

      const skillScore = Math.min(skillOverlap / Math.max(skills.length, 1), 1) * 0.5;
      const workloadScore = Math.max(1 - (agent.openIssues || 0) / agent.capacity, 0) * 0.3;
      const successScore = (agent.successRate || 0.8) * 0.2;

      return {
        agent,
        score: skillScore + workloadScore + successScore,
      };
    });

    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];

    return {
      id: best.agent.id,
      name: best.agent.name,
      role: best.agent.role,
      confidence: Math.round(best.score * 100) / 100,
      reasoning: `Skill match: ${Math.round(best.score * 100)}%, workload: ${best.agent.openIssues || 0}/${best.agent.capacity}`,
    };
  }

  static async findByRole(companyId: string, role: string): Promise<MatchedAgent | null> {
    const agent = await db.query.agentProfiles.findFirst({
      where: (a, { eq, and }) => and(
        eq(a.companyId, companyId),
        eq(a.role, role),
        eq(a.status, "active")
      ),
    });

    return agent ? {
      id: agent.id,
      name: agent.name,
      role: agent.role,
      confidence: 1.0,
      reasoning: `Explicitly requested ${role} role`,
    } : null;
  }
}
```

### 3.3 Issue Generator

```typescript
// server/src/services/ai-router/issue-generator.ts

export class IssueGenerator {
  static async generate(
    prompt: string,
    intent: Intent,
    context?: ChatRouteRequest["context"]
  ): Promise<GeneratedIssue> {
    const title = this.extractTitle(prompt);
    const description = this.expandDescription(prompt, intent);
    const priority = context?.priority || this.inferPriority(prompt);
    const labels = this.inferLabels(prompt);

    return {
      title,
      description,
      type: this.mapIntentToType(intent.type),
      priority,
      suggestedLabels: labels,
    };
  }

  private static extractTitle(prompt: string): string {
    // Use first sentence, capped at 100 chars
    const firstSentence = prompt.split(/[.!?]/)[0].trim();
    return firstSentence.length > 100
      ? firstSentence.slice(0, 97) + "..."
      : firstSentence;
  }

  private static expandDescription(prompt: string, intent: Intent): string {
    return `## Request\n${prompt}\n\n## Intent\n${intent.type}\n\n## Acceptance Criteria\n- [ ] TBD\n\n## Notes\nAuto-generated by AI Router.`;
  }

  private static inferPriority(prompt: string): string {
    const lower = prompt.toLowerCase();
    if (lower.match(/\b(urgent|critical|blocking|asap|immediately)\b/)) return "critical";
    if (lower.match(/\b(important|needed|should|high)\b/)) return "high";
    if (lower.match(/\b(nice to have|eventually|low|minor)\b/)) return "low";
    return "medium";
  }

  private static inferLabels(prompt: string): string[] {
    const labels: string[] = [];
    const lower = prompt.toLowerCase();
    if (lower.includes("ui") || lower.includes("frontend")) labels.push("ui");
    if (lower.includes("api") || lower.includes("backend")) labels.push("backend");
    if (lower.includes("bug") || lower.includes("fix")) labels.push("bug");
    if (lower.includes("test")) labels.push("testing");
    if (lower.includes("doc")) labels.push("documentation");
    return labels;
  }

  private static mapIntentToType(intentType: string): string {
    const map: Record<string, string> = {
      create_bug: "bug",
      create_story: "story",
      create_epic: "epic",
      create_task: "task",
    };
    return map[intentType] || "task";
  }
}
```

---

## 4. Middleware

### 4.1 Auth

```typescript
// Require valid company access + actor
requireCompanyAccess(req, res, next);
```

### 4.2 Activity Log

```typescript
// Log all route requests
logActivity({
  action: "chat_route",
  actorId: req.actor.id,
  companyId: req.body.companyId,
  metadata: { prompt: req.body.prompt, intent: intent.type },
});
```

### 4.3 Rate Limiting

```typescript
// 100 requests per minute per company
rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  keyGenerator: (req) => req.body.companyId,
});
```

---

## 5. Testing

### 5.1 Unit Tests

```typescript
describe("IntentClassifier", () => {
  it("classifies bug reports", async () => {
    const intent = await IntentClassifier.classify("Fix the crash on login");
    expect(intent.type).toBe("create_bug");
  });

  it("classifies status queries", async () => {
    const intent = await IntentClassifier.classify("What's the status of TEC-8?");
    expect(intent.type).toBe("query_status");
    expect(intent.extractedIssueId).toBe("TEC-8");
  });
});
```

### 5.2 Integration Tests

```typescript
describe("POST /api/chat/route", () => {
  it("returns matched agent and issue for task creation", async () => {
    const res = await request(app)
      .post("/api/chat/route")
      .send({ prompt: "Build a dark mode toggle", companyId: testCompany.id });

    expect(res.status).toBe(200);
    expect(res.body.matchedAgent).toBeDefined();
    expect(res.body.generatedIssue.title).toContain("dark mode");
  });
});
```

---

## 6. Files Created

- `/home/parth/paperclip/server/projects/tec-18-ai-router/DESIGN.md` — Product design
- `/home/parth/paperclip/server/projects/tec-18-ai-router/ARCHITECTURE.md` — Technical architecture
