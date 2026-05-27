import type { Agent, AgentRole } from '../types.js';

export class AgentRegistry {
  private agents = new Map<string, Agent>();
  private agentsByRole = new Map<AgentRole, Set<string>>();

  register(agent: Agent): void {
    if (this.agents.has(agent.id)) {
      throw new Error(`Agent ${agent.id} already registered`);
    }
    this.agents.set(agent.id, agent);

    const roleSet = this.agentsByRole.get(agent.role) ?? new Set<string>();
    roleSet.add(agent.id);
    this.agentsByRole.set(agent.role, roleSet);
  }

  unregister(agentId: string): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;

    this.agents.delete(agentId);
    this.agentsByRole.get(agent.role)?.delete(agentId);
    return true;
  }

  get(agentId: string): Agent | undefined {
    return this.agents.get(agentId);
  }

  getAll(): Agent[] {
    return Array.from(this.agents.values());
  }

  getByRole(role: AgentRole): Agent[] {
    const ids = this.agentsByRole.get(role);
    if (!ids) return [];
    return Array.from(ids)
      .map((id) => this.agents.get(id))
      .filter((a): a is Agent => a !== undefined);
  }

  getAvailable(role?: AgentRole): Agent[] {
    const pool = role ? this.getByRole(role) : this.getAll();
    return pool.filter((a) => a.status === 'idle');
  }

  updateStatus(agentId: string, status: Agent['status']): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.status = status;
      agent.heartbeatAt = new Date().toISOString();
    }
  }

  heartbeat(agentId: string): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.heartbeatAt = new Date().toISOString();
    }
  }

  findCapable(capability: string): Agent[] {
    return this.getAll().filter((a) => a.capabilities.includes(capability));
  }
}
