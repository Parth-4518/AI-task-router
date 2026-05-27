import { Router } from "express";
import type { Db } from "@paperclipai/db";
import { agentAnalyticsService } from "../services/agent-analytics.js";
import { assertCompanyAccess } from "./authz.js";

export function agentAnalyticsRoutes(db: Db) {
  const router = Router();
  const svc = agentAnalyticsService(db);

  router.get("/companies/:companyId/analytics", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);

    const from = req.query.from ? new Date(req.query.from as string) : undefined;
    const to = req.query.to ? new Date(req.query.to as string) : undefined;

    const summary = await svc.summary(companyId, from, to);
    res.json(summary);
  });

  return router;
}
