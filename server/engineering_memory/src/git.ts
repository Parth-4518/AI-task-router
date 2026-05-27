import { execSync } from 'child_process';
import { GitStatus } from './types';

export function isGitRepo(cwd: string): boolean {
  try {
    execSync('git rev-parse --git-dir', { cwd, stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

export function getCurrentBranch(cwd: string): string {
  try {
    return execSync('git branch --show-current', { cwd, stdio: 'pipe', encoding: 'utf-8' }).trim();
  } catch {
    return 'unknown';
  }
}

export function getGitStatus(cwd: string): GitStatus {
  const isRepo = isGitRepo(cwd);
  if (!isRepo) {
    return { branch: 'unknown', ahead: 0, behind: 0, staged: [], modified: [], untracked: [], commitHash: '', isRepo: false, uncommittedFiles: [] };
  }
  try {
    const branch = getCurrentBranch(cwd);
    let ahead = 0, behind = 0;
    try {
      const aheadBehind = execSync('git rev-list --left-right --count HEAD...@{u}', { cwd, stdio: 'pipe', encoding: 'utf-8' }).trim().split('\t');
      ahead = parseInt(aheadBehind[0] || '0', 10);
      behind = parseInt(aheadBehind[1] || '0', 10);
    } catch {
      // no upstream
    }

    let commitHash = '';
    try {
      commitHash = execSync('git rev-parse HEAD', { cwd, stdio: 'pipe', encoding: 'utf-8' }).trim();
    } catch {
      // no commits yet
    }

    const statusOutput = execSync('git status --short', { cwd, stdio: 'pipe', encoding: 'utf-8' });
    const lines = statusOutput ? statusOutput.trim().split('\n') : [];
    const staged: string[] = [];
    const modified: string[] = [];
    const untracked: string[] = [];

    for (const line of lines) {
      if (!line) continue;
      const indexStatus = line[0];
      const workTreeStatus = line[1];
      const fileName = line.slice(3);

      if (indexStatus !== ' ' && indexStatus !== '?') {
        staged.push(fileName);
      }
      if (workTreeStatus !== ' ') {
        modified.push(fileName);
      }
      if (indexStatus === '?') {
        untracked.push(fileName);
      }
    }

    const uncommittedFiles = [...staged, ...modified, ...untracked];
    return { branch, ahead, behind, staged, modified, untracked, commitHash, isRepo: true, uncommittedFiles };
  } catch {
    return { branch: 'unknown', ahead: 0, behind: 0, staged: [], modified: [], untracked: [], commitHash: '', isRepo: false, uncommittedFiles: [] };
  }
}

export function getRecentCommits(cwd: string, count = 5): { hash: string; message: string; date: string }[] {
  try {
    const output = execSync(`git log --oneline -n ${count} --format="%H|%s|%ci"`, { cwd, stdio: 'pipe', encoding: 'utf-8' });
    return output.trim().split('\n').filter(Boolean).map(line => {
      const [hash, message, date] = line.split('|');
      return { hash, message, date };
    });
  } catch {
    return [];
  }
}

export function getFilesTouched(cwd: string): string[] {
  try {
    const output = execSync('git diff --name-only HEAD', { cwd, stdio: 'pipe', encoding: 'utf-8' });
    return output.trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

export function getCommitCountSince(cwd: string, since: string): number {
  try {
    const output = execSync(`git rev-list --count HEAD --since="${since}"`, { cwd, stdio: 'pipe', encoding: 'utf-8' });
    return parseInt(output.trim(), 10);
  } catch {
    return 0;
  }
}
