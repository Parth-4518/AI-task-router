"""Session lifecycle management."""

import os
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from . import git_tracker
from .storage import get_active_session, save_session


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def start(project_path: Optional[str] = None) -> Dict[str, Any]:
    """Start a new work session."""
    existing = get_active_session(project_path)
    if existing:
        raise RuntimeError(
            f"Session {existing['id'][:8]} already active. "
            "Run 'memory stop' first."
        )

    resolved_path = project_path or os.getcwd()
    session = {
        "id": str(uuid.uuid4()),
        "started_at": now(),
        "ended_at": None,
        "project_path": resolved_path,
        "git_branch": git_tracker.current_branch(resolved_path),
        "git_commit": git_tracker.current_commit(resolved_path),
        "todos": [],
        "activities": [],
        "summary": None,
    }
    save_session(session, resolved_path)
    return session


def stop(project_path: Optional[str] = None) -> Dict[str, Any]:
    """Stop the active session and generate summary."""
    resolved_path = project_path or os.getcwd()
    session = get_active_session(resolved_path)
    if not session:
        raise RuntimeError("No active session. Run 'memory start' first.")

    session["ended_at"] = now()
    session["git_branch_end"] = git_tracker.current_branch(resolved_path)
    session["git_commit_end"] = git_tracker.current_commit(resolved_path)

    # Generate summary
    from . import summarizer
    session["summary"] = summarizer.summarize_session(session)

    save_session(session, resolved_path)
    return session


def status(project_path: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Get the active session status."""
    resolved_path = project_path or os.getcwd()
    return get_active_session(resolved_path)


def add_activity(
    session: Dict[str, Any],
    activity_type: str,
    description: str,
    metadata: Optional[Dict[str, Any]] = None,
) -> None:
    """Add an activity to the current session."""
    activity = {
        "type": activity_type,
        "timestamp": now(),
        "description": description,
        "metadata": metadata or {},
    }
    session["activities"].append(activity)
    save_session(session, session.get("project_path"))
