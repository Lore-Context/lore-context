"""
lore-index CLI entry point.

Usage
-----
lore-index --full                   Full reindex of current directory
lore-index --incremental            Index files changed since last commit
lore-index --since <git-sha>        Index files changed since a given commit
lore-index install-git-hook         Install post-commit hook in current repo
"""

from __future__ import annotations

import argparse
import logging
import os
import subprocess
import sys
from pathlib import Path

logger = logging.getLogger(__name__)


def _get_changed_files(since: str | None = None) -> list[Path]:
    """Return files changed since *since* (or since HEAD~1 for --incremental)."""
    try:
        if since:
            cmd = ["git", "diff", "--name-only", since, "HEAD"]
        else:
            cmd = ["git", "diff", "--name-only", "HEAD~1", "HEAD"]
        result = subprocess.run(cmd, capture_output=True, text=True, check=False)
        lines = [l.strip() for l in result.stdout.splitlines() if l.strip()]
        cwd = Path.cwd()
        return [cwd / p for p in lines]
    except Exception as exc:  # noqa: BLE001
        logger.warning("Could not determine changed files via git: %s", exc)
        return []


def _build_indexer(repo_root: Path) -> "object":
    """Build a CodeIndexer from environment variables."""
    from .indexer import CodeIndexer

    api_base = os.environ.get("LORE_API_URL", "https://api.lore.dev")
    api_key = os.environ.get("LORE_API_KEY", "")
    repo_name = os.environ.get("LORE_REPO_NAME") or repo_root.name

    if not api_key:
        print(
            "Warning: LORE_API_KEY not set — uploads will be skipped.",
            file=sys.stderr,
        )

    return CodeIndexer(
        repo_root=repo_root,
        repo_name=repo_name,
        api_base_url=api_base,
        api_key=api_key,
    )


def main(argv: list[str] | None = None) -> int:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")

    parser = argparse.ArgumentParser(
        prog="lore-index",
        description="Lore Context code knowledge graph indexer",
    )
    mode_group = parser.add_mutually_exclusive_group()
    mode_group.add_argument(
        "--full",
        action="store_true",
        help="Full reindex of the repository",
    )
    mode_group.add_argument(
        "--incremental",
        action="store_true",
        help="Index only files changed since last commit (HEAD~1)",
    )
    mode_group.add_argument(
        "--since",
        metavar="GIT_SHA",
        help="Index files changed since the given git commit",
    )
    parser.add_argument(
        "command",
        nargs="?",
        choices=["install-git-hook"],
        help="Sub-command",
    )
    parser.add_argument(
        "--repo-root",
        default=".",
        help="Repository root directory (default: current directory)",
    )
    parser.add_argument(
        "--verbose",
        "-v",
        action="store_true",
        help="Enable debug logging",
    )

    args = parser.parse_args(argv)

    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    repo_root = Path(args.repo_root).resolve()

    if args.command == "install-git-hook":
        from .git_hook import install_hook
        ok = install_hook(repo_root)
        if ok:
            print(f"Git post-commit hook installed at {repo_root}/.git/hooks/post-commit")
            return 0
        else:
            print("Failed to install git hook", file=sys.stderr)
            return 1

    indexer = _build_indexer(repo_root)

    try:
        if args.full or (not args.incremental and not args.since):
            print(f"Starting full index of {repo_root} …")
            stats = indexer.index_full()
        elif args.since:
            paths = _get_changed_files(since=args.since)
            print(f"Indexing {len(paths)} files changed since {args.since} …")
            stats = indexer.index_paths(paths)
        else:  # --incremental
            paths = _get_changed_files()
            print(f"Indexing {len(paths)} files changed since HEAD~1 …")
            stats = indexer.index_paths(paths)

        print(
            f"Done: scanned={stats.files_scanned} uploaded={stats.files_uploaded} "
            f"skipped={stats.files_skipped} symbols={stats.symbols_total} "
            f"relations={stats.relations_total} errors={len(stats.errors)}"
        )
        if stats.errors:
            for err in stats.errors[:5]:
                print(f"  ERROR: {err}", file=sys.stderr)
        return 0

    finally:
        indexer.close()


if __name__ == "__main__":
    sys.exit(main())
