import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EngineeringMemory } from '../src/engine';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('EngineeringMemory', () => {
  let tmpDir: string;
  let emm: EngineeringMemory;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'emm-test-'));
    // Initialize a git repo in tmpDir so git commands work
    try {
      require('child_process').execSync('git init', { cwd: tmpDir, stdio: 'ignore' });
      require('child_process').execSync('git config user.email "test@test.com"', { cwd: tmpDir, stdio: 'ignore' });
      require('child_process').execSync('git config user.name "Test"', { cwd: tmpDir, stdio: 'ignore' });
    } catch { /* ignore */ }
    emm = new EngineeringMemory(tmpDir);
  });

  afterEach(() => {
    emm.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('initializes memory database', () => {
    const result = emm.init();
    expect(result.initialized).toBe(true);
    expect(result.path).toContain('.emm');
  });

  it('starts and ends a session', () => {
    const session = emm.startSession();
    expect(session.id).toBeDefined();
    expect(session.startedAt).toBeDefined();

    const ended = emm.endSession();
    expect(ended).not.toBeNull();
    expect(ended!.endedAt).not.toBeNull();
  });

  it('prevents duplicate active sessions', () => {
    emm.startSession();
    expect(() => emm.startSession()).toThrow(/already active/);
  });

  it('adds and completes todos', () => {
    emm.startSession();
    const todo = emm.addTodo('Test todo');
    expect(todo.content).toBe('Test todo');
    expect(todo.status).toBe('active');

    emm.completeTodo(todo.id);
    const status = emm.getStatus();
    expect(status.todos.filter(t => t.status === 'active')).toHaveLength(0);
  });

  it('detects unfinished work', () => {
    emm.startSession();
    emm.addTodo('Unfinished task');
    const result = emm.detectUnfinishedWork();
    expect(result.hasUnfinishedWork).toBe(true);
    expect(result.activeTodos).toHaveLength(1);
    expect(result.suggestions.length).toBeGreaterThan(0);
  });

  it('generates resume summary', () => {
    emm.startSession();
    const summary = emm.getResumeSummary();
    expect(summary).toContain('Resume from here');
  });
});
