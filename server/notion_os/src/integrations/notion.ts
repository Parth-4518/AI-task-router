/**
 * Notion API integration layer.
 * Abstracts CRUD operations against Notion databases/pages.
 *
 * Requires:
 *   NOTION_API_KEY   – integration token
 *   NOTION_VERSION   – defaults to 2022-06-28
 */

export interface NotionConfig {
  apiKey: string;
  version?: string;
}

export class NotionClient {
  private apiKey: string;
  private version: string;
  private baseUrl = 'https://api.notion.com/v1';

  constructor(config: NotionConfig) {
    this.apiKey = config.apiKey;
    this.version = config.version ?? '2022-06-28';
  }

  private async request(path: string, init?: RequestInit): Promise<unknown> {
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Notion-Version': this.version,
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Notion API ${res.status}: ${body}`);
    }
    return res.json();
  }

  /** Query a database and return pages. */
  async queryDatabase(databaseId: string, filter?: Record<string, unknown>, sorts?: unknown[]): Promise<unknown[]> {
    const body: Record<string, unknown> = {};
    if (filter) body.filter = filter;
    if (sorts) body.sorts = sorts;
    const data = (await this.request(`/databases/${databaseId}/query`, {
      method: 'POST',
      body: JSON.stringify(body),
    })) as { results?: unknown[] };
    return data.results ?? [];
  }

  /** Create a new page in a database. */
  async createPage(parentDatabaseId: string, properties: Record<string, unknown>, children?: unknown[]): Promise<unknown> {
    const body: Record<string, unknown> = {
      parent: { database_id: parentDatabaseId },
      properties,
    };
    if (children) body.children = children;
    return this.request('/pages', { method: 'POST', body: JSON.stringify(body) });
  }

  /** Update page properties. */
  async updatePage(pageId: string, properties: Record<string, unknown>): Promise<unknown> {
    return this.request(`/pages/${pageId}`, { method: 'PATCH', body: JSON.stringify({ properties }) });
  }

  /** Retrieve a single page. */
  async getPage(pageId: string): Promise<unknown> {
    return this.request(`/pages/${pageId}`);
  }

  /** Append block children to a page. */
  async appendBlocks(pageId: string, children: unknown[]): Promise<unknown> {
    return this.request(`/blocks/${pageId}/children`, { method: 'PATCH', body: JSON.stringify({ children }) });
  }
}
