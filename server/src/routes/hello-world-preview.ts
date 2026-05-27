import { Router, type Request, type Response } from "express";

export function helloWorldPreviewRoutes() {
  const router = Router();

  /**
   * GET /hello-world-preview
   * 
   * Serves the Hello World HTML page
   */
  router.get("/hello-world-preview", (req: Request, res: Response) => {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hello World - Paperclip AI</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            color: white;
        }
        .container {
            text-align: center;
            padding: 2rem;
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
            max-width: 600px;
            width: 90%;
        }
        h1 {
            font-size: 3.5rem;
            margin-bottom: 1rem;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
            animation: fadeInDown 1s ease-out;
        }
        .subtitle {
            font-size: 1.5rem;
            margin-bottom: 2rem;
            opacity: 0.9;
            animation: fadeInUp 1s ease-out 0.5s both;
        }
        .info {
            background: rgba(255, 255, 255, 0.15);
            padding: 1.5rem;
            border-radius: 10px;
            margin-top: 2rem;
            text-align: left;
            animation: fadeIn 1s ease-out 1s both;
        }
        .info h2 {
            font-size: 1.2rem;
            margin-bottom: 1rem;
            color: #ffd700;
        }
        .info ul {
            list-style: none;
            padding-left: 0;
        }
        .info li {
            padding: 0.5rem 0;
            padding-left: 1.5rem;
            position: relative;
        }
        .info li:before {
            content: "✓";
            position: absolute;
            left: 0;
            color: #ffd700;
            font-weight: bold;
        }
        .timestamp {
            margin-top: 2rem;
            font-size: 0.9rem;
            opacity: 0.7;
            animation: fadeIn 1s ease-out 1.5s both;
        }
        @keyframes fadeInDown {
            from { opacity: 0; transform: translateY(-30px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        .emoji {
            font-size: 4rem;
            margin-bottom: 1rem;
            animation: bounce 2s infinite;
        }
        @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-20px); }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="emoji">🎉</div>
        <h1>Hello World!</h1>
        <p class="subtitle">Welcome to Paperclip AI</p>
        <div class="info">
            <h2>What was delivered:</h2>
            <ul>
                <li>AI Task-Routing Chatbot</li>
                <li>Paperclip Integration</li>
                <li>Auto Issue Creation</li>
                <li>Smart Agent Matching</li>
                <li>Working HTML Output</li>
            </ul>
        </div>
        <p class="timestamp">
            Generated on: ${new Date().toLocaleString()}<br>
            By: Paperclip AI Router
        </p>
    </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  });

  return router;
}
