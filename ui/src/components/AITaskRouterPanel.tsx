import { useState, useEffect, useRef } from "react";
import { X, Sparkles, Maximize2, Minimize2, ExternalLink, CheckCircle2, Bot, Flag, Send, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { issuesApi } from "@/api/issues";
import { agentsApi } from "@/api/agents";
import type { Issue, Agent } from "@paperclipai/shared";

// Types for chat messages
interface ChatMessage {
  id: string;
  type: "user" | "system" | "task-created";
  content: string;
  timestamp: Date;
  issue?: Issue;
  status?: "created" | "done" | "cancelled";
}

// Mock task data for initial display
const mockTasks: ChatMessage[] = [
  {
    id: "1",
    type: "task-created",
    content: "Raise GitHub issue to test automatic issue creation",
    timestamp: new Date("2026-06-11T10:00:00Z"),
    status: "cancelled",
  },
  {
    id: "2",
    type: "user",
    content: "create a roadmap md file in the github",
    timestamp: new Date("2026-06-11T10:05:00Z"),
  },
  {
    id: "3",
    type: "system",
    content: "Task created and assigned!",
    timestamp: new Date("2026-06-11T10:05:30Z"),
  },
  {
    id: "4",
    type: "task-created",
    content: "create a roadmap md file in the github",
    timestamp: new Date("2026-06-11T10:06:00Z"),
    status: "done",
  },
  {
    id: "5",
    type: "user",
    content: "raise a issue of roadmap.md file on github",
    timestamp: new Date("2026-06-11T10:07:00Z"),
  },
];

function TaskCard({ message, agents }: { message: ChatMessage; agents: Agent[] }) {
  const isDone = message.status === "done";
  const isCancelled = message.status === "cancelled";
  const priority = message.issue?.priority || "Medium";
  const issueId = message.issue?.identifier || "TEC-254";
  
  // Find agent from the assigned agent ID
  const assignedAgentId = message.issue?.assigneeAgentId;
  const assignedAgent = agents.find(a => a.id === assignedAgentId);
  const agentName = assignedAgent?.name || (assignedAgentId ? "Assigned Agent" : "Unassigned");
  
  return (
    <div className="bg-card border border-border rounded-lg p-4 mb-3 shadow-sm">
      {/* Status Header */}
      <div className="flex items-center gap-2 mb-2">
        <CheckCircle2 className={cn(
          "h-4 w-4",
          isDone ? "text-green-500" : "text-emerald-500"
        )} />
        <span className="text-sm font-semibold text-foreground">Task Created</span>
        {isCancelled && (
          <span className="text-xs text-muted-foreground line-through">Cancelled</span>
        )}
        {isDone && (
          <span className="text-xs text-green-500 font-medium">Done</span>
        )}
      </div>
      
      {/* Task Details */}
      <div className="space-y-1.5">
        <div className="flex items-start gap-2">
          <span className="text-xs text-muted-foreground shrink-0 mt-0.5">Title:</span>
          <span className="text-sm font-medium text-foreground">{message.content}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <Bot className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Agent:</span>
          <span className={cn(
            "text-xs font-medium",
            assignedAgentId ? "text-green-500" : "text-foreground"
          )}>{agentName}</span>
          {assignedAgent?.role && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              {assignedAgent.role}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Flag className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Priority:</span>
          <span className={cn(
            "text-xs font-medium",
            priority === "high" ? "text-red-500" : 
            priority === "medium" ? "text-amber-500" : "text-blue-500"
          )}>{priority.charAt(0).toUpperCase() + priority.slice(1)}</span>
        </div>
      </div>
      
      {/* Issue Link */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-border">
        <span className="text-xs text-muted-foreground">Issue: {issueId}</span>
        <button 
          className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
          onClick={() => {
            if (message.issue?.id) {
              window.open(`/issues/${message.issue.id}`, "_blank");
            }
          }}
        >
          Open <ExternalLink className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

function UserMessage({ content }: { content: string }) {
  return (
    <div className="flex justify-end mb-3">
      <div className="bg-primary text-primary-foreground rounded-lg px-4 py-2.5 max-w-[85%] shadow-sm">
        <p className="text-sm">{content}</p>
      </div>
    </div>
  );
}

function SystemMessage({ content }: { content: string }) {
  return (
    <div className="flex items-center gap-2 mb-3 px-2">
      <div className="bg-muted rounded-lg px-3 py-2 flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-green-500" />
        <span className="text-sm text-foreground">{content}</span>
      </div>
    </div>
  );
}

const STORAGE_KEY = "ai-task-router-messages";

function loadMessages(): ChatMessage[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Revive Date objects from strings
      return parsed.map((m: ChatMessage) => ({
        ...m,
        timestamp: new Date(m.timestamp),
      }));
    }
  } catch {
    // ignore parse errors
  }
  return mockTasks;
}

function saveMessages(msgs: ChatMessage[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(msgs));
  } catch {
    // ignore storage errors
  }
}

export function AITaskRouterPanel({ companyId }: { companyId?: string }) {
  const [isOpen, setIsOpen] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(loadMessages);
  const [agents, setAgents] = useState<Agent[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Fetch agents when companyId is available
  useEffect(() => {
    if (!companyId) return;
    
    const fetchAgents = async () => {
      try {
        const agentList = await agentsApi.list(companyId);
        setAgents(agentList);
      } catch (error) {
        console.error("Failed to fetch agents:", error);
      }
    };
    
    fetchAgents();
  }, [companyId]);
  
  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  
  // Persist messages to localStorage whenever they change
  useEffect(() => {
    saveMessages(messages);
  }, [messages]);
  
  // Smart agent routing based on task content
  const findBestAgentForTask = (taskContent: string, availableAgents: Agent[]): Agent | null => {
    if (availableAgents.length === 0) return null;
    
    const content = taskContent.toLowerCase();
    
    // Define keyword-to-role mappings
    const roleKeywords: Record<string, string[]> = {
      engineer: ["fix", "bug", "code", "implement", "feature", "build", "create", "develop", "program", "function", "api", "script", "app", "application", "software"],
      designer: ["design", "ui", "ux", "layout", "style", "css", "visual", "mockup", "wireframe", "prototype", "brand"],
      qa: ["test", "testing", "quality", "verify", "validation", "check", "review", "bug report", "regression", "qa"],
      researcher: ["research", "analyze", "investigate", "study", "data", "report", "survey", "find", "lookup", "search"],
      devops: ["deploy", "deployment", "server", "infrastructure", "pipeline", "ci/cd", "docker", "kubernetes", "hosting", "cloud", "aws"],
      security: ["security", "auth", "authentication", "vulnerability", "encrypt", "protect", "secure", "password", "penetration"],
      pm: ["plan", "roadmap", "strategy", "project", "milestone", "timeline", "coordinate", "manage", "schedule", "requirements"],
    };
    
    // Score each agent based on keyword matches
    let bestAgent: Agent | null = null;
    let bestScore = 0;
    
    for (const agent of availableAgents) {
      let score = 0;
      const role = agent.role || "general";
      const name = (agent.name || "").toLowerCase();
      const title = (agent.title || "").toLowerCase();
      const capabilities = (agent.capabilities || "").toLowerCase();
      
      // Check role-specific keywords
      if (roleKeywords[role]) {
        for (const keyword of roleKeywords[role]) {
          if (content.includes(keyword)) score += 3;
        }
      }
      
      // Check name/title/capabilities matches
      const agentDesc = `${name} ${title} ${capabilities}`;
      for (const keyword of content.split(/\s+/)) {
        if (keyword.length > 3 && agentDesc.includes(keyword)) score += 1;
      }
      
      // Prefer active agents
      if (agent.status === "active" || agent.status === "ready") score += 2;
      
      if (score > bestScore) {
        bestScore = score;
        bestAgent = agent;
      }
    }
    
    // If no good match, return the first active agent
    if (!bestAgent) {
      const activeAgent = availableAgents.find(a => a.status === "active" || a.status === "ready");
      return activeAgent || availableAgents[0];
    }
    
    return bestAgent;
  };
  
  const handleSendMessage = async () => {
    console.log("Send clicked! input:", inputValue.trim(), "companyId:", companyId);
    if (!inputValue.trim()) return;
    
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: "user",
      content: inputValue.trim(),
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);
    
    // If no companyId, just show mock response for now
    if (!companyId) {
      setTimeout(() => {
        const systemResponse: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: "system",
          content: "Task created and assigned! (Demo mode - no company context)",
          timestamp: new Date(),
        };
        const taskCard: ChatMessage = {
          id: (Date.now() + 2).toString(),
          type: "task-created",
          content: userMessage.content,
          timestamp: new Date(),
          status: "created",
        };
        setMessages(prev => [...prev, systemResponse, taskCard]);
        setIsLoading(false);
      }, 1000);
      return;
    }
    
    try {
      // Find the best agent for this task using smart routing
      const bestAgent = findBestAgentForTask(userMessage.content, agents);
      const assigneeAgentId = bestAgent?.id;
      const agentName = bestAgent?.name || "Unassigned";
      const agentRole = bestAgent?.role || "";
      
      // Create a real issue via API with smart agent assignment
      const newIssue = await issuesApi.create(companyId, {
        title: userMessage.content,
        description: `Created via AI Task Router: ${userMessage.content}`,
        status: "todo",
        priority: "medium",
        assigneeAgentId: assigneeAgentId,
      });
      
      // Add system confirmation with agent name and role
      const systemResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: "system",
        content: `Task created and assigned to ${agentName}${agentRole ? ` (${agentRole})` : ""}!`,
        timestamp: new Date(),
      };
      
      // Add task card with real issue data and agent info
      const taskCard: ChatMessage = {
        id: (Date.now() + 2).toString(),
        type: "task-created",
        content: newIssue.title,
        timestamp: new Date(),
        status: "created",
        issue: newIssue,
      };
      
      setMessages(prev => [...prev, systemResponse, taskCard]);
    } catch (error) {
      console.error("Failed to create issue:", error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: "system",
        content: "Failed to create task. Please try again.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed right-4 bottom-4 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-xl hover:scale-110 transition-all duration-200 flex items-center justify-center group"
        title="Open AI Task Router"
      >
        <Sparkles className="h-6 w-6 group-hover:animate-pulse" />
      </button>
    );
  }
  
  const width = isExpanded ? "600px" : "420px";
  
  return (
    <div 
      className="fixed top-0 right-0 h-screen bg-background border-l border-border shadow-2xl z-50 flex flex-col transition-all duration-300"
      style={{ width }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-r from-indigo-500/90 to-purple-600/90 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-white" />
          <h3 className="text-sm font-semibold text-white">AI Task Router</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            title={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
          <div className="w-px h-4 bg-white/20" />
          <button
            onClick={() => {
              setMessages([]);
              localStorage.removeItem(STORAGE_KEY);
            }}
            className="p-1.5 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            title="Clear chat"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <div className="w-px h-4 bg-white/20" />
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            title="Hide"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 min-h-0">
        {messages.map((message) => (
          <div key={message.id}>
            {message.type === "task-created" && <TaskCard message={message} agents={agents} />}
            {message.type === "user" && <UserMessage content={message.content} />}
            {message.type === "system" && <SystemMessage content={message.content} />}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input Area */}
      <div className="border-t border-border p-3 shrink-0 bg-card">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isLoading ? "Creating task..." : "Type a task or message..."}
              disabled={isLoading}
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
            />
            {isLoading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            className={cn(
              "p-2.5 rounded-lg transition-colors",
              inputValue.trim() && !isLoading
                ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
