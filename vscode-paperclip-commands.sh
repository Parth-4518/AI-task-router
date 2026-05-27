#!/bin/bash
# Paperclip CLI Commands for VS Code Terminal
# Source this file: source ./vscode-paperclip-commands.sh

export PAPERCLIP_API_URL="http://localhost:3100"
export PAPERCLIP_COMPANY_ID="a99fd059-c16b-4cdf-a4ca-0e78a04e42b8"

# Helper function for API calls
pcurl() {
    curl -s "${PAPERCLIP_API_URL}/api$1" "${@:2}"
}

# Health check
alias pc-health='pcurl /health | python3 -m json.tool'

# List all agents
alias pc-agents='pcurl /companies/${PAPERCLIP_COMPANY_ID}/agents | python3 -c "import sys,json;[print(f\"{a[chr(39)+chr(39)]name[chr(39)+chr(39)]}: {a[chr(39)+chr(39)]status[chr(39)+chr(39)]} ({a.get(chr(39)+chr(39)]adapterType[chr(39)+chr(39)],chr(39)+chr(39)]?[chr(39)+chr(39)]})\") for a in json.load(sys.stdin)]"'

# List all issues
alias pc-issues='pcurl /companies/${PAPERCLIP_COMPANY_ID}/issues | python3 -c "import sys,json;[print(f\"{i[chr(39)+chr(39)]identifier[chr(39)+chr(39)]}: {i[chr(39)+chr(39)]status[chr(39)+chr(39)]} - {i[chr(39)+chr(39)]title[chr(39)+chr(39)]}\") for i in json.load(sys.stdin)]"'

# Get agent by name
pc-agent() {
    pcurl /companies/${PAPERCLIP_COMPANY_ID}/agents | python3 -c "import sys,json;agents=json.load(sys.stdin);a=next((x for x in agents if x['name']=='$1'),None);print(json.dumps(a,indent=2) if a else 'Agent not found')"
}

# Reset agent to idle
pc-reset() {
    local agent_id=$(pcurl /companies/${PAPERCLIP_COMPANY_ID}/agents | python3 -c "import sys,json;agents=json.load(sys.stdin);a=next((x for x in agents if x['name']=='$1'),None);print(a['id'] if a else '')")
    if [ -z "$agent_id" ]; then
        echo "Agent not found: $1"
        return 1
    fi
    pcurl /agents/${agent_id} -X PATCH -H "Content-Type: application/json" -d '{"status":"idle"}' | python3 -m json.tool
}

# Reset all agents
alias pc-reset-all='pcurl /companies/${PAPERCLIP_COMPANY_ID}/agents | python3 -c "import sys,json,urllib.request;agents=json.load(sys.stdin);[urllib.request.urlopen(urllib.request.Request(\"${PAPERCLIP_API_URL}/api/agents/\"+a[chr(39)+chr(39)]id[chr(39)+chr(39)],data=b[chr(39)+chr(39)]{chr(92)chr(34)]status[chr(92)chr(34)]:chr(92)chr(34)]idle[chr(92)chr(34)]}[chr(39)+chr(39)],headers={chr(92)chr(34)]Content-Type[chr(92)chr(34)]:chr(92)chr(34)]application/json[chr(92)chr(34)]},method=chr(92)chr(34)]PATCH[chr(92)chr(34)])) for a in agents]"

# Create issue
pc-create-issue() {
    local title="$1"
    local description="$2"
    local assignee="$3"
    
    # Get agent ID if assignee provided
    local assignee_id=""
    if [ -n "$assignee" ]; then
        assignee_id=$(pcurl /companies/${PAPERCLIP_COMPANY_ID}/agents | python3 -c "import sys,json;agents=json.load(sys.stdin);a=next((x for x in agents if x['name']=='$assignee'),None);print(a['id'] if a else '')")
    fi
    
    local data="{\"title\":\"$title\",\"description\":\"$description\",\"status\":\"backlog\",\"priority\":\"medium\""
    if [ -n "$assignee_id" ]; then
        data="$data,\"assigneeAgentId\":\"$assignee_id\""
    fi
    data="$data}"
    
    pcurl /companies/${PAPERCLIP_COMPANY_ID}/issues -X POST -H "Content-Type: application/json" -d "$data" | python3 -m json.tool
}

# Get issue details
pc-issue() {
    pcurl /issues/$1 | python3 -m json.tool
}

# List adapters
alias pc-adapters='pcurl /adapters | python3 -c "import sys,json;[print(f\"{a[chr(39)+chr(39)]type[chr(39)+chr(39)]}: {a[chr(39)+chr(39)]label[chr(39)+chr(39)]} ({a[chr(39)+chr(39)]source[chr(39)+chr(39)]})\") for a in json.load(sys.stdin)]"'

# Watch server logs
alias pc-logs='tail -f ~/.paperclip/logs/server.log 2>/dev/null || echo "No log file found"'

echo "Paperclip CLI commands loaded!"
echo "Available commands:"
echo "  pc-health         - Check server health"
echo "  pc-agents         - List all agents"
echo "  pc-issues         - List all issues"
echo "  pc-agent NAME     - Get agent details"
echo "  pc-reset NAME     - Reset agent to idle"
echo "  pc-reset-all      - Reset all agents"
echo "  pc-create-issue TITLE DESC [AGENT] - Create issue"
echo "  pc-issue ID       - Get issue details"
echo "  pc-adapters       - List adapters"
echo "  pc-logs           - Watch server logs"
