"""Git integration for tracking branches and commits."""

import subprocess
from pathlib import Path
from typing import List, Optional


def _run_git(args: List[str], cwd: str) -> Optional[str]:
    """Run a git command and return stdout, or None on failure."""
    try:
        result = subprocess.run(
            ["git"] + args,
            cwd=cwd,
            capture_output=True,
            text=True,
            check=True,
        )
        return result.stdout.strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        return None


def is_git_repo(path: str) -> bool:
    """Check if the path is inside a git repository."""
    return _run_git(["rev-parse", "--git-dir"], path) is not None


def current_branch(path: str) -> Optional[str]:
    """Get the current git branch."""
    return _run_git(["branch", "--show-current"], path)


def current_commit(path: str) -> Optional[str]:
    """Get the current git commit hash (short)."""
    return _run_git(["rev-parse", "--short", "HEAD"], path)


def uncommitted_changes(path: str) -> List[str]:
    """Get list of files with uncommitted changes."""
    out = _run_git(["status", "--porcelain"], path)
    if not out:
        return []
    return [line.strip() for line in out.split("\n") if line.strip()]


def unpushed_commits(path: str, branch: Optional[str] = None) -> List[str]:
    """Get list of commits not yet pushed to origin."""
    b = branch or current_branch(path)
    if not b:
        return []
    out = _run_git(["log", f"origin/{b}..{b}", "--oneline"], path)
    if not out:
        return []
    return [line.strip() for line in out.split("\n") if line.strip()]


def recent_branches(path: str, limit: int = 5) -> List[dict]:
    """Get recently used branches with last commit info."""
    out = _run_git(
        ["for-each-ref", "--sort=-committerdate", "refs/heads/", "--format=%(refname:short)|%(committerdate:iso)|%(objectname:short)"],
        path,
    )
    if not out:
        return []
    branches = []
    for line in out.split("\n")[:limit]:
        parts = line.split("|")
        if len(parts) >= 3:
            branches.append({
                "name": parts[0],
                "last_commit_date": parts[1],
                "last_commit": parts[2],
            })
    return branches
