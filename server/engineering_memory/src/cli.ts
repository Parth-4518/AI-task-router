#!/usr/bin/env node
import { EngineeringMemory } from './engine';
import * as path from 'path';

const args = process.argv.slice(2);
const command = args[0];
const subArgs = args.slice(1);

function getProjectPath(): string {
  return process.cwd();
}

function printHelp() {
  console.log(`
Engineering Memory System (emm)

Usage:
  emm init              Initialize memory database in current project
  emm start             Start a new work session
  emm stop              End the current session
  emm todo <content>    Add a todo to the current session
  emm done <id>         Mark a todo as complete
  emm cancel <id>       Cancel a todo
  emm todos             List all todos across sessions
  emm status            Show current session status
  emm summary           Show summary of current/last session
  emm resume            Show "resume from here" context
  emm detect            Detect unfinished work in the project
  emm help              Show this help message
`);
}

async function main() {
  if (!command || command === 'help') {
    printHelp();
    process.exit(0);
  }

  const projectPath = getProjectPath();
  const emm = new EngineeringMemory(projectPath);

  try {
    switch (command) {
      case 'init': {
        const result = emm.init();
        console.log(`Initialized engineering memory at ${result.path}`);
        break;
      }

      case 'start': {
        const session = emm.startSession();
        console.log(`Session started: ${session.id}`);
        console.log(`Branch: ${session.gitBranch || 'n/a'}`);
        break;
      }

      case 'stop': {
        const session = emm.endSession();
        if (session) {
          console.log(`Session ended: ${session.id}`);
        } else {
          console.log('No active session to end.');
        }
        break;
      }

      case 'todo': {
        const content = subArgs.join(' ');
        if (!content) {
          console.error('Usage: emm todo <content>');
          process.exit(1);
        }
        const todo = emm.addTodo(content);
        console.log(`Todo added: ${todo.id.slice(0, 8)} - ${todo.content}`);
        break;
      }

      case 'done': {
        const todoId = subArgs[0];
        if (!todoId) {
          console.error('Usage: emm done <todo-id>');
          process.exit(1);
        }
        emm.completeTodo(todoId);
        console.log(`Todo marked as done: ${todoId}`);
        break;
      }

      case 'cancel': {
        const cancelId = subArgs[0];
        if (!cancelId) {
          console.error('Usage: emm cancel <todo-id>');
          process.exit(1);
        }
        emm.cancelTodo(cancelId);
        console.log(`Todo cancelled: ${cancelId}`);
        break;
      }

      case 'todos': {
        const todos = emm.listAllTodos();
        if (todos.length === 0) {
          console.log('No todos found.');
        } else {
          console.log(`Todos (${todos.length}):`);
          todos.forEach(t => {
            const status = t.status === 'active' ? '[ ]' : t.status === 'done' ? '[x]' : '[-]';
            console.log(`  ${status} ${t.id.slice(0, 8)} - ${t.content}`);
          });
        }
        break;
      }

      case 'status': {
        const status = emm.getStatus();
        if (status.session) {
          console.log(`Active session: ${status.session.id.slice(0, 8)}`);
          console.log(`Started: ${status.session.startedAt}`);
          console.log(`Branch: ${status.gitBranch || 'n/a'}`);
          console.log(`Active todos: ${status.todos.length}`);
          status.todos.forEach(t => console.log(`  [ ] ${t.content}`));
          if (status.uncommitted.length > 0) {
            console.log(`Uncommitted files: ${status.uncommitted.length}`);
          }
        } else {
          console.log('No active session.');
        }
        break;
      }

      case 'summary': {
        const summary = emm.getSessionSummary();
        console.log(summary);
        break;
      }

      case 'resume': {
        const resume = emm.getResumeSummary();
        console.log(resume);
        break;
      }

      case 'detect': {
        const result = emm.detectUnfinishedWork();
        console.log(result.hasUnfinishedWork ? 'Unfinished work detected!' : 'No unfinished work found.');
        console.log('');
        result.suggestions.forEach(s => console.log(`  • ${s}`));
        if (result.openSessions.length > 0) {
          console.log('\nOpen sessions:');
          result.openSessions.forEach(s => console.log(`  - ${s.id.slice(0, 8)} started ${s.startedAt}`));
        }
        if (result.activeTodos.length > 0) {
          console.log('\nActive todos:');
          result.activeTodos.forEach(t => console.log(`  - ${t.content}`));
        }
        if (result.uncommittedFiles.length > 0) {
          console.log('\nUncommitted files:');
          result.uncommittedFiles.forEach(f => console.log(`  - ${f}`));
        }
        break;
      }

      default:
        console.error(`Unknown command: ${command}`);
        printHelp();
        process.exit(1);
    }
  } catch (err: any) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  } finally {
    emm.close();
  }
}

main();
