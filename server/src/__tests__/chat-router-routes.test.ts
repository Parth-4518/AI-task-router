
import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAgentService = vi.hoisted(() => ({
  list: vi.fn(),
}));

const mockLogActivity = vi.hoisted(() => vi.fn());

vi.mock("../services/index.js", () => ({
  agentService: () => mockAgentService,
  issueService: () => ({}),
  logActivity: mockLogActivity,
}));

function registerModuleMocks() {
  vi.doMock("../services/index.js", () => ({
    agentService: () => mockAgentService,
    issueService: () => ({}),
    logActivity: mockLogActivity,
  }));
}

async function createApp(actor: Record<string, unknown>) {
  const [{ chatRouterRoutes }, { errorHandler }] = await Promise.all([
    vi.importActual<typeof import("../routes/chat-router.js")>("../routes/chat-router.js"),
    vi.importActual<typeof import("../middleware/index.js")>("../middleware/index.js"),
  ]);
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).actor = actor;
    next();
  });
  app.use("/api", chatRouterRoutes({} as never));
  app.use(errorHandler);
  return app;
}

describe("POST /api/chat/route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doUnmock("../routes/chat-router.js");
    vi.doUnmock("../middleware/index.js");
    registerModuleMocks();
    vi.clearAllMocks();
    mockLogActivity.mockResolvedValue(undefined);
  });

  it("debug - print response", async () => {
    mockAgentService.list.mockResolvedValue([
      { id: "agent-1", name: "Engineer", role: "engineer", status: "idle", adapterType: "claude_local", capabilities: ["coding", "debugging"] },
    ]);

    const app = await createApp({
      type: "board",
      userId: "board-user",
      companyIds: ["company-1"],
      source: "local_implicit",
      isInstanceAdmin: true,
    });

    const res = await request(app)
      .post("/api/chat/route")
      .send({ prompt: "Fix a bug in the login code", companyId: "company-1" });

    console.log("STATUS:", res.status);
    console.log("BODY:", JSON.stringify(res.body, null, 2));
    expect(true).toBe(true);
  });
});
