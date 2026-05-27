"""Command-line interface for Engineering Memory System."""

import argparse
import os
import sys

from . import detector, session, storage, summarizer, todo


def cmd_start(args):
    try:
        s = session.start(args.project)
        print(f"Session started: {s['id'][:8]}")
        print(f"Project: {s['project_path']}")
        if s['git_branch']:
            print(f"Branch:  {s['git_branch']} @ {s['git_commit']}")
    except RuntimeError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


def cmd_stop(args):
    try:
        s = session.stop(args.project)
        print(f"Session ended: {s['id'][:8]}")
        print(f"Duration: {s['started_at']} → {s['ended_at']}")
        if s.get('summary'):
            print("\n--- Summary ---")
            print(s['summary'])
    except RuntimeError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


def cmd_status(args):
    s = session.status(args.project)
    if not s:
        print("No active session.")
        print("Run 'memory start' to begin one.")
        return
    print(f"Active session: {s['id'][:8]}")
    print(f"Started: {s['started_at']}")
    print(f"Project: {s['project_path']}")
    print(f"Branch:  {s.get('git_branch', 'unknown')}")
    todos = s.get('todos', [])
    open_todos = [t for t in todos if t['status'] == 'active']
    print(f"TODOs:   {len(open_todos)} open / {len(todos)} total")
    if open_todos:
        print("\nOpen TODOs:")
        for t in open_todos:
            print(f"  [{t['id']}] {t['text']}")


def cmd_resume(args):
    print(summarizer.resume_summary(args.project))


def cmd_todo_add(args):
    try:
        t = todo.add(' '.join(args.text), args.project)
        print(f"Added TODO [{t['id']}]: {t['text']}")
    except RuntimeError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


def cmd_todo_list(args):
    todos = todo.list_todos(args.project)
    if not todos:
        print("No TODOs in active session.")
        return
    print("TODOs:")
    for t in todos:
        status_icon = "☐" if t['status'] == 'active' else "☑" if t['status'] == 'done' else "✗"
        print(f"  {status_icon} [{t['id']}] {t['text']}")


def cmd_todo_done(args):
    t = todo.done(args.id, args.project)
    if t:
        print(f"Done: [{t['id']}] {t['text']}")
    else:
        print(f"TODO not found: {args.id}", file=sys.stderr)
        sys.exit(1)


def cmd_todo_cancel(args):
    t = todo.cancel(args.id, args.project)
    if t:
        print(f"Cancelled: [{t['id']}] {t['text']}")
    else:
        print(f"TODO not found: {args.id}", file=sys.stderr)
        sys.exit(1)


def cmd_detect(args):
    result = detector.detect_unfinished(args.project)
    if result['has_unfinished_work']:
        print("⚠ Unfinished work detected:\n")
    else:
        print("✓ No unfinished work.\n")

    if result['active_session']:
        s = result['active_session']
        print(f"Active session: {s['id']} (started {s['started_at']})")
        print(f"Branch: {s['branch']}\n")

    if result['open_todos']:
        print(f"Open TODOs ({len(result['open_todos'])}):")
        for t in result['open_todos']:
            print(f"  - [{t['id']}] {t['text']}")
        print()

    if result['uncommitted_changes']:
        print(f"Uncommitted changes ({len(result['uncommitted_changes'])} files):")
        for c in result['uncommitted_changes']:
            print(f"  {c}")
        print()

    if result['unpushed_commits']:
        print(f"Unpushed commits ({len(result['unpushed_commits'])}):")
        for c in result['unpushed_commits']:
            print(f"  {c}")
        print()

    print("Recommendations:")
    for r in result['recommendations']:
        print(f"  • {r}")


def cmd_log(args):
    sessions = storage.list_sessions(args.project)
    if not sessions:
        print("No sessions found.")
        return
    print(f"{'ID':<10} {'Status':<10} {'Branch':<20} {'Started':<20} {'TODOs'}")
    print("-" * 70)
    for s in sessions[:args.limit]:
        sid = s['id'][:8]
        status = "active" if not s.get('ended_at') else "done"
        branch = (s.get('git_branch') or "-")[:18]
        started = (s.get('started_at') or "-")[:19]
        todos = len(s.get('todos', []))
        print(f"{sid:<10} {status:<10} {branch:<20} {started:<20} {todos}")


def main():
    parser = argparse.ArgumentParser(
        prog="memory",
        description="Engineering Memory System — track and restore coding context",
    )
    parser.add_argument("--project", "-p", default=None, help="Project path (default: current directory)")
    subparsers = parser.add_subparsers(dest="command", help="Commands")

    # Session commands
    subparsers.add_parser("start", help="Start a new work session")
    subparsers.add_parser("stop", help="Stop the current session")
    subparsers.add_parser("status", help="Show active session status")
    subparsers.add_parser("resume", help="Show resume-from-here summary")

    # TODO commands
    todo_parser = subparsers.add_parser("todo", help="TODO management")
    todo_sub = todo_parser.add_subparsers(dest="todo_command")
    todo_add = todo_sub.add_parser("add", help="Add a TODO")
    todo_add.add_argument("text", nargs="+", help="TODO text")
    todo_sub.add_parser("list", help="List TODOs")
    todo_done = todo_sub.add_parser("done", help="Mark TODO as done")
    todo_done.add_argument("id", help="TODO ID")
    todo_cancel = todo_sub.add_parser("cancel", help="Cancel a TODO")
    todo_cancel.add_argument("id", help="TODO ID")

    # Other commands
    subparsers.add_parser("detect", help="Detect unfinished work")

    log_parser = subparsers.add_parser("log", help="Show session history")
    log_parser.add_argument("--limit", "-n", type=int, default=10, help="Number of sessions to show")

    args = parser.parse_args()

    if args.command == "start":
        cmd_start(args)
    elif args.command == "stop":
        cmd_stop(args)
    elif args.command == "status":
        cmd_status(args)
    elif args.command == "resume":
        cmd_resume(args)
    elif args.command == "todo":
        if args.todo_command == "add":
            cmd_todo_add(args)
        elif args.todo_command == "list":
            cmd_todo_list(args)
        elif args.todo_command == "done":
            cmd_todo_done(args)
        elif args.todo_command == "cancel":
            cmd_todo_cancel(args)
        else:
            todo_parser.print_help()
    elif args.command == "detect":
        cmd_detect(args)
    elif args.command == "log":
        cmd_log(args)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
