# AI Task Router

An intelligent task routing system that automatically assigns and manages tasks using AI.

## Overview

AI Task Router is designed to intelligently route tasks to the appropriate agents or handlers based on content analysis and predefined rules.

## Features

- **Smart Routing**: Automatically routes tasks to the right destination
- **AI-Powered**: Uses artificial intelligence for task classification and assignment
- **Scalable Architecture**: Built to handle growing task volumes efficiently

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

```bash
git clone https://github.com/Parth-4518/AI-task-router.git
cd AI-task-router
npm install
```

### Environment Setup

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# AI Provider API Keys
OPENAI_API_KEY=your_openai_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here

# Database (if applicable)
DATABASE_URL=your_database_url_here

# Optional: Logging Level
LOG_LEVEL=info
```

Copy from the example:
```bash
cp .env.example .env
# Edit .env with your actual values
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
| POST | `/api/tasks` | Create a new task |
| GET | `/api/tasks` | List all tasks |
| GET | `/api/tasks/:id` | Get task by ID |
| PATCH | `/api/tasks/:id` | Update task status |
| DELETE | `/api/tasks/:id` | Delete a task |
| POST | `/api/route` | Route task to appropriate agent |

## Testing

```bash
# Run unit tests
npm test

# Run with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e
```

## Docker Setup (Optional)

```bash
# Build image
docker build -t ai-task-router .

# Run container
docker run -p 3000:3000 --env-file .env ai-task-router
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

---

*Built with ❤️ by Parth Brid*
