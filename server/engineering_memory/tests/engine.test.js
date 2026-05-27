"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const engine_1 = require("../src/engine");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
(0, vitest_1.describe)('EngineeringMemory', () => {
    let tmpDir;
    let emm;
    (0, vitest_1.beforeEach)(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'emm-test-'));
        // Initialize a git repo in tmpDir so git commands work
        try {
            require('child_process').execSync('git init', { cwd: tmpDir, stdio: 'ignore' });
            require('child_process').execSync('git config user.email "test@test.com"', { cwd: tmpDir, stdio: 'ignore' });
            require('child_process').execSync('git config user.name "Test"', { cwd: tmpDir, stdio: 'ignore' });
        }
        catch { /* ignore */ }
        emm = new engine_1.EngineeringMemory(tmpDir);
    });
    (0, vitest_1.afterEach)(() => {
        emm.close();
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });
    (0, vitest_1.it)('initializes memory database', () => {
        const result = emm.init();
        (0, vitest_1.expect)(result.initialized).toBe(true);
        (0, vitest_1.expect)(result.path).toContain('.emm');
    });
    (0, vitest_1.it)('starts and ends a session', () => {
        const session = emm.startSession();
        (0, vitest_1.expect)(session.id).toBeDefined();
        (0, vitest_1.expect)(session.startedAt).toBeDefined();
        const ended = emm.endSession();
        (0, vitest_1.expect)(ended).not.toBeNull();
        (0, vitest_1.expect)(ended.endedAt).not.toBeNull();
    });
    (0, vitest_1.it)('prevents duplicate active sessions', () => {
        emm.startSession();
        (0, vitest_1.expect)(() => emm.startSession()).toThrow(/already active/);
    });
    (0, vitest_1.it)('adds and completes todos', () => {
        emm.startSession();
        const todo = emm.addTodo('Test todo');
        (0, vitest_1.expect)(todo.content).toBe('Test todo');
        (0, vitest_1.expect)(todo.status).toBe('active');
        emm.completeTodo(todo.id);
        const status = emm.getStatus();
        (0, vitest_1.expect)(status.todos.filter(t => t.status === 'active')).toHaveLength(0);
    });
    (0, vitest_1.it)('detects unfinished work', () => {
        emm.startSession();
        emm.addTodo('Unfinished task');
        const result = emm.detectUnfinishedWork();
        (0, vitest_1.expect)(result.hasUnfinishedWork).toBe(true);
        (0, vitest_1.expect)(result.activeTodos).toHaveLength(1);
        (0, vitest_1.expect)(result.suggestions.length).toBeGreaterThan(0);
    });
    (0, vitest_1.it)('generates resume summary', () => {
        emm.startSession();
        const summary = emm.getResumeSummary();
        (0, vitest_1.expect)(summary).toContain('Resume from here');
    });
});
