# Paperclip VS Code Setup Guide

## A) VS Code Copilot Chat + Paperclip ACP (Option A)

### Prerequisites
1. VS Code Insiders (has built-in ACP support)
2. GitHub Copilot Chat extension
3. ACPX CLI (`npm install -g acpx` or use from paperclip repo)

### Setup Steps

1. **Enable ACP in VS Code:**
   - Open Command Palette (`Ctrl+Shift+P`)
   - Run: `Developer: Enable Agent Client Protocol`

2. **Start ACPX Server:**
   ```bash
   cd ~/paperclip
   npx acpx server
   ```

3. **Configure Paperclip Agents (Already Done):**
   All agents are now on `acpx_local` adapter and will communicate via ACP.

4. **Use in VS Code:**
   - Open Copilot Chat (`Ctrl+Shift+I`)
   - Select "Claude via ACPX" or "Codex via ACPX" as the agent
   - Start chatting!

---

## C) Paperclip CLI Commands in VS Code Terminal

### Quick Setup
```bash
# In VS Code terminal, run:
source ~/paperclip/vscode-paperclip-commands.sh
```

### Available Commands
| Command | Description |
|---------|-------------|
| `pc-health` | Check server health |
| `pc-agents` | List all agents |
| `pc-issues` | List all issues |
| `pc-agent "NAME"` | Get agent details |
| `pc-reset "NAME"` | Reset agent to idle |
| `pc-reset-all` | Reset all agents |
| `pc-create-issue "TITLE" "DESC" [AGENT]` | Create issue |
| `pc-issue ID` | Get issue details |
| `pc-adapters` | List adapters |
| `pc-logs` | Watch server logs |

### Examples
```bash
# Check health
pc-health

# List agents
pc-agents

# Reset CEO agent
pc-reset "CEO"

# Create issue assigned to DevOps Engineer
pc-create-issue "Fix deployment" "Fix the broken deployment pipeline" "DevOps Engineer"

# Get issue details
pc-issue "ISSUE-123"
```

---

## D) Debug Paperclip Server in VS Code

### Option 1: Launch Configuration (Recommended)
1. Open VS Code in the paperclip folder
2. Go to Run and Debug (`Ctrl+Shift+D`)
3. Select "Debug Paperclip Server" from dropdown
4. Press F5 to start debugging

### Option 2: Attach to Running Process
1. Start server with debug flag:
   ```bash
   cd ~/paperclip/server
   node --inspect=9229 -r tsx src/index.ts
   ```
2. In VS Code, select "Debug Paperclip Server (Attach)"
3. Press F5

### VS Code Tasks (Ctrl+Shift+P → "Run Task")
- `Start Paperclip Server` - Start production server
- `Start Paperclip Dev` - Start dev mode (server + UI)
- `Build Paperclip` - Build all packages
- `List Paperclip Agents` - Quick agent status
- `Check Paperclip Health` - Health check

### Debug Features
- Set breakpoints in TypeScript files
- Inspect variables
- Step through code
- View call stack
- Debug console for expressions

---

## Current Agent Status

All agents are now on `acpx_local` adapter:
- CEO: idle
- Product Manager: idle
- QA Engineer: idle
- DevOps Engineer: idle
- Founding Engineer: idle
- Data Analyst: idle
