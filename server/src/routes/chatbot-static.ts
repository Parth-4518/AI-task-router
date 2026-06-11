import { Router, type Request, type Response } from "express";
import * as path from "node:path";
import * as fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const chatbotPath = path.resolve(__dirname, "../../public/chatbot.html"); // resolved from src/routes/

export function chatbotStaticRoutes() {
  const router = Router();

  // Serve chatbot.html from the public directory
  router.get("/chatbot", (req: Request, res: Response) => {
    if (fs.existsSync(chatbotPath)) {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      res.sendFile(chatbotPath);
    } else {
      res.status(404).json({ error: "Chatbot not found" });
    }
  });

  router.get("/chatbot.html", (req: Request, res: Response) => {
    if (fs.existsSync(chatbotPath)) {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      res.sendFile(chatbotPath);
    } else {
      res.status(404).json({ error: "Chatbot not found" });
    }
  });

  router.get("/chat", (req: Request, res: Response) => {
    if (fs.existsSync(chatbotPath)) {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      res.sendFile(chatbotPath);
    } else {
      res.status(404).json({ error: "Chatbot not found" });
    }
  });

  return router;
}
