"""
lore_code_indexer — Lore Context code knowledge graph indexer.

Public API
----------
CodeIndexer   High-level indexer class (filter → build payload → upload).
index_full    Convenience function to run a full index from CWD.
install_git_hook  Install a post-commit hook in the current repository.
"""

from .indexer import CodeIndexer
from .git_hook import install_hook as install_git_hook
from pathlib import Path


def index_full(
    repo_root: str | Path = ".",
    repo_name: str | None = None,
    api_base_url: str = "https://api.lore.dev",
    api_key: str = "",
) -> "object":
    """Run a full index of *repo_root* and return the resulting ``IndexStats``."""
    root = Path(repo_root).resolve()
    name = repo_name or root.name
    with CodeIndexer(
        repo_root=root,
        repo_name=name,
        api_base_url=api_base_url,
        api_key=api_key,
    ) as indexer:
        return indexer.index_full()


__all__ = ["CodeIndexer", "index_full", "install_git_hook"]
