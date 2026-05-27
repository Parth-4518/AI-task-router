# TEC-18: AI Router API — Design Document

**Date:** 2026-05-21
**Author:** CEO Agent
**Status:** In Progress
**Related:** TEC-16 (done — prior implementation)

---

## 1. Overview

The AI Router API is the entry point for natural-language requests into the Paperclip system. It accepts a user prompt, analyzes intent, matches the best-suited agent, and returns structured routing information including a draft issue.

---

## 2. Endpoint

```
POST /api/chat/route
```

### 2.1 Request Body

```typescript
interface ChatRouteRequest {
  prompt: string;        // User's natural language request
  companyId: string;     // UUID of the company
  context?: {
    projectId?: string;  // Optional project scope
    priority?: string;   // Optional override
  };
}
```

### 2.2 Response Body

```typescript
interface ChatRouteResponse {
  matchedAgent: {
    id: string;
    name: string;
    role: string;
    confidence: number;  // 0-1
    reasoning: string;
  };
  generatedIssue: {
    title: string;
    description: string;
    type: string;        // task, bug, story, epic, adr
    priority: string;    // low, medium, high, critical
    suggestedLabels: string[];
  };
  routing: {
    action: string;      // "create_issue", "delegate", "answer", "clarify"
    targetEndpoint: string;
  };
}
```

---

## 3. Routing Logic

### 3.1 Intent Classification

The prompt is classified into one of these intents:

| Intent | Example Prompt | Action |
|--------|---------------|--------|
| `create_task` | "Build a login page" | create_issue → delegate |
| `create_bug` | "Fix the crash on signup" | create_issue → delegate |
| `create_story` | "As a user I want..." | create_issue → delegate |
| `query_status` | "What's the status of TEC-8?" | answer (fetch issue) |
| `list_issues` | "Show me all high priority bugs" | answer (query issues) |
| `delegate` | "Have the QA agent review TEC-5" | delegate |
| `clarify` | "I need help with..." | clarify (ask follow-up) |

### 3.2 Agent Matching

```
1. Classify intent → determine required skills
2. Query active agents for company
3. Score agents by:
   - Skill match (50%)
   - Current workload (30%)
   - Past success on similar issues (20%)
4. Return best match + confidence
```

### 3.3 Issue Generation

For `create_*` intents:

```
1. Extract title from prompt (first sentence or generated)
2. Expand description with context
3. Infer priority from keywords:
   - "urgent", "critical", "blocking" → critical
   - "important", "needed" → high
   - "nice to have", "eventually" → low
4. Suggest labels based on content analysis
```

---

## 4. Integration Points

### 4.1 Notion OS (TEC-8)
- Issues created via Notion OS API
- Projects and workspaces scoped
- Memory entries for routing decisions

### 4.2 Multi-Agent Framework (TEC-9)
- Agent profiles queried for matching
- Delegation service invoked for assignment
- Coordination events logged

### 4.3 Existing Paperclip
- Company scoping enforced
- Activity logging on route requests
- Agent API key authentication

---

## 5. Error Handling

| Error | Status | Response |
|-------|--------|----------|
| Invalid companyId | 404 | `{ error: "Company not found" }` |
| No matching agent | 422 | `{ error: "No agent available for this request" }` |
| Ambiguous prompt | 400 | `{ error: "Ambiguous request", clarifyingQuestions: [...] }` |
| Rate limited | 429 | `{ error: "Rate limit exceeded" }` |

---

## 6. Scalability

1. **Caching:** Intent classification cached by prompt hash (1 hour)
2. **Async:** Heavy issue generation can be async with webhook callback
3. **Batching:** Bulk route requests supported for email digests

---

## 7. Security

1. **Authentication:** Bearer token (agent API key or board session)
2. **Authorization:** Company-scoped; agents cannot route for other companies
3. **Validation:** Prompt max 4000 chars; companyId must be valid UUID
4. **Logging:** All route requests logged with actor, prompt, result

---

## 8. Example Requests

### 8.1 Create Task

```bash
curl -X POST http://localhost:3100/api/chat/route \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Build a dark mode toggle for the dashboard",
    "companyId": "a99fd059-c16b-4cdf-a4ca-0e78a04e42b8"
  }'
```

Response:
```json
{
  "matchedAgent": {
    "id": "...",
    "name": "Frontend Agent",
    "role": "developer",
    "confidence": 0.92,
    "reasoning": "Prompt describes UI feature; Frontend Agent has skills [react, css, ui]"
  },
  "generatedIssue": {
    "title": "Build dark mode toggle for dashboard",
    "description": "Implement a theme toggle...",
    "type": "task",
    "priority": "medium",
    "suggestedLabels": ["ui", "theme", "dashboard"]
  },
  "routing": {
    "action": "create_issue",
    "targetEndpoint": "/api/companies/{cid}/issues"
  }
}
```

### 8.2 Query Status

```bash
curl -X POST http://localhost:3100/api/chat/route \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "What's the status of TEC-8?",
    "companyId": "a99fd059-c16b-4cdf-a4ca-0e78a04e42b8"
  }'
```

Response:
```json
{
  "matchedAgent": null,
  "generatedIssue": null,
  "routing": {
    "action": "answer",
    "targetEndpoint": "/api/issues/TEC-8",
    "answer": "TEC-8 is in_progress, assigned to CEO Agent."
  }
}
```
