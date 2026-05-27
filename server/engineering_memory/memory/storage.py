"""File-based storage for engineering memory."""

import json
import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional


def get_memory_dir() -> Path:
    """Get the global memory storage directory."""
    mem_dir = Path.home() / ".engineering_memory"
    mem_dir.mkdir(parents=True, exist_ok=True)
    return mem_dir


def get_project_memory_dir(project_path: Optional[str] = None) -> Path:
    """Get project-local memory directory, or global if not in a project."""
    if project_path:
        p = Path(project_path) / ".memory"
    else:
        p = get_memory_dir()
    p.mkdir(parents=True, exist_ok=True)
    return p


def load_json(path: Path) -> Optional[Dict[str, Any]]:
    """Load JSON file if it exists."""
    if not path.exists():
        return None
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_json(path: Path, data: Dict[str, Any]) -> None:
    """Save data to JSON file atomically."""
    tmp = path.with_suffix(".tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, default=str)
    tmp.rename(path)


def list_sessions(project_path: Optional[str] = None) -> List[Dict[str, Any]]:
    """List all stored sessions, sorted by start time descending."""
    mem_dir = get_project_memory_dir(project_path)
    sessions = []
    for f in mem_dir.glob("session_*.json"):
        data = load_json(f)
        if data:
            sessions.append(data)
    sessions.sort(key=lambda s: s.get("started_at", ""), reverse=True)
    return sessions


def get_active_session(project_path: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Get the currently active (unfinished) session if any."""
    # First check project-local storage
    if project_path:
        sessions = list_sessions(project_path)
        for s in sessions:
            if s.get("ended_at") is None:
                return s
    # Then check global storage as fallback
    sessions = list_sessions(None)
    for s in sessions:
        if s.get("ended_at") is None:
            return s
    return None


def save_session(session: Dict[str, Any], project_path: Optional[str] = None) -> Path:
    """Save a session to disk."""
    mem_dir = get_project_memory_dir(project_path)
    path = mem_dir / f"session_{session['id']}.json"
    save_json(path, session)
    return path
