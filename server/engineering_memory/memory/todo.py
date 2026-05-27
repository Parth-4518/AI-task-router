"""TODO management within sessions."""

import uuid
from typing import Any, Dict, List, Optional

from .session import now
from .storage import get_active_session, save_session


def add(text: str, project_path: Optional[str] = None) -> Dict[str, Any]:
    """Add a TODO to the active session."""
    session = get_active_session(project_path)
    if not session:
        raise RuntimeError("No active session. Run 'memory start' first.")

    todo = {
        "id": str(uuid.uuid4())[:8],
        "text": text,
        "status": "active",
        "created_at": now(),
        "completed_at": None,
    }
    session["todos"].append(todo)
    save_session(session, session.get("project_path"))
    return todo


def list_todos(project_path: Optional[str] = None) -> List[Dict[str, Any]]:
    """List all TODOs in the active session."""
    session = get_active_session(project_path)
    if not session:
        return []
    return session.get("todos", [])


def done(todo_id: str, project_path: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Mark a TODO as done."""
    session = get_active_session(project_path)
    if not session:
        raise RuntimeError("No active session. Run 'memory start' first.")

    for todo in session["todos"]:
        if todo["id"] == todo_id:
            todo["status"] = "done"
            todo["completed_at"] = now()
            save_session(session, session.get("project_path"))
            return todo
    return None


def cancel(todo_id: str, project_path: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Cancel a TODO."""
    session = get_active_session(project_path)
    if not session:
        raise RuntimeError("No active session. Run 'memory start' first.")

    for todo in session["todos"]:
        if todo["id"] == todo_id:
            todo["status"] = "cancelled"
            save_session(session, session.get("project_path"))
            return todo
    return None
