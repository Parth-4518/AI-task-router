# AI Task Router

An intelligent task routing system that automatically assigns and manages tasks using AI-powered classification and routing algorithms.

## Overview

AI Task Router is a smart task management system designed to intelligently route tasks to the appropriate agents, handlers, or workflows based on content analysis, priority, and predefined business rules. It leverages artificial intelligence to understand task context and make optimal routing decisions.

## Features

- **Smart Routing Engine**: Automatically routes tasks to the right destination based on content analysis
- **AI-Powered Classification**: Uses machine learning for intelligent task categorization and priority assignment
- **Multi-Agent Support**: Distributes tasks across multiple AI agents or human handlers
- **Scalable Architecture**: Built to handle growing task volumes efficiently
- **Real-time Processing**: Low-latency task routing for time-sensitive operations
- **Extensible Rules**: Customizable routing rules and business logic

## Tech Stack

- **Runtime**: Node.js (v18+)
- **Language**: TypeScript
- **AI/ML**: OpenAI GPT / Custom classification models
- **Queue**: Redis / BullMQ for task queuing
- **Database**: PostgreSQL / MongoDB for task persistence
- **API**: RESTful + WebSocket support

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Redis (for task queue management)
- Database (PostgreSQL or MongoDB)

### Installation

```bash
git clone https://github.com/Parth-4518/AI-task-router.git
cd AI-task-router
npm install
```

### Configuration

Create a `.env` file in the root directory:

```env
PORT=3000
NODE_ENV=development
REDIS_URL=redis://localhost:6379
DATABASE_URL=postgresql://user:pass@localhost:5432/ai_task_router
OPENAI_API_KEY=your_openai_api_key
```

### Usage

```bash
# Development mode
npm run dev

# Production build
npm run build
npm start
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/tasks` | Submit a new task |
| GET | `/api/tasks/:id` | Get task status |
| POST | `/api/tasks/:id/route` | Manually trigger routing |
| GET | `/api/agents` | List available agents |
| GET | `/health` | Health check |

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Client    │────▶│ Task Router  │────▶│   Queue     │
└─────────────┘     └──────────────┘     └─────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │ AI Classifier │
                     └──────────────┘
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
        ┌─────────┐   ┌─────────┐   ┌─────────┐
        │ Agent 1 │   │ Agent 2 │   │ Agent N │
        └─────────┘   └─────────┘   └─────────┘
```

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

**Parth Brid** - [GitHub](https://github.com/Parth-4518)

---

*Built with ❤️ and AI*
