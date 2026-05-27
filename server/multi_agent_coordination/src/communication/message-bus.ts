import type { Message } from '../types.js';

export class MessageBus {
  private messages: Message[] = [];
  private listeners = new Map<string, ((msg: Message) => void)[]>();

  send(message: Message): void {
    this.messages.push(message);

    // Notify direct recipient
    if (message.toAgentId) {
      const handlers = this.listeners.get(message.toAgentId) ?? [];
      for (const handler of handlers) {
        try {
          handler(message);
        } catch {
          // Listener errors should not break the bus
        }
      }
    }

    // Notify broadcast listeners
    const broadcastHandlers = this.listeners.get('*') ?? [];
    for (const handler of broadcastHandlers) {
      try {
        handler(message);
      } catch {
        // Listener errors should not break the bus
      }
    }
  }

  broadcast(message: Omit<Message, 'toAgentId'>): void {
    this.send({ ...message, toAgentId: null });
  }

  subscribe(agentId: string, handler: (msg: Message) => void): () => void {
    const handlers = this.listeners.get(agentId) ?? [];
    handlers.push(handler);
    this.listeners.set(agentId, handlers);

    return () => {
      const updated = this.listeners.get(agentId) ?? [];
      const idx = updated.indexOf(handler);
      if (idx >= 0) {
        updated.splice(idx, 1);
        this.listeners.set(agentId, updated);
      }
    };
  }

  getMessagesFor(agentId: string): Message[] {
    return this.messages.filter(
      (m) => m.toAgentId === agentId || m.toAgentId === null || m.fromAgentId === agentId
    );
  }

  getMessageCount(): number {
    return this.messages.length;
  }

  getAll(): Message[] {
    return [...this.messages];
  }
}
