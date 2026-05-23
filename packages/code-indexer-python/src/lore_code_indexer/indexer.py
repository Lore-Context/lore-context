"""
CodeIndexer — orchestrates privacy filter, walker, and uploader.

This is the main entrypoint for programmatic use. CLI delegates to this class.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from .privacy_filter import filter_directory, filter_file, _load_gitignore_patterns
from .types import UpsertPayload
from .uploader import Uploader

logger = logging.getLogger(__name__)


@dataclass
class IndexStats:
    files_scanned: int = 0
    files_uploaded: int = 0
    symbols_total: int = 0
    relations_total: int = 0
    files_skipped: int = 0
    errors: list[str] = field(default_factory=list)


class CodeIndexer:
    """High-level indexer that ties filter → build payload → upload together.

    Parameters
    ----------
    repo_root:
        Absolute path to the repository root.
    repo_name:
        Logical name for this repo in Lore Cloud (must be unique per vault).
    api_base_url:
        Lore Cloud API base URL.
    api_key:
        Vault API key (Bearer token).
    primary_lang:
        Optional primary language tag (auto-detected from file counts if None).
    batch_size:
        Number of ``FilePayload`` objects per upsert request.
    """

    def __init__(
        self,
        repo_root: Path | str,
        repo_name: str,
        api_base_url: str,
        api_key: str,
        primary_lang: str | None = None,
        batch_size: int = 50,
    ) -> None:
        self._repo_root = Path(repo_root).resolve()
        self._repo_name = repo_name
        self._primary_lang = primary_lang
        self._batch_size = batch_size
        self._uploader = Uploader(api_base_url, api_key)
        self._stats = IndexStats()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def index_full(self) -> IndexStats:
        """Scan the entire repository and upload all discovered files."""
        self._stats = IndexStats()
        gitignore_patterns = _load_gitignore_patterns(self._repo_root)
        all_paths = [p for p in self._repo_root.rglob("*") if p.is_file()]
        self._stats.files_scanned = len(all_paths)
        self._index_paths(all_paths, gitignore_patterns)
        return self._stats

    def index_paths(self, paths: list[Path]) -> IndexStats:
        """Index a specific list of files (incremental update)."""
        self._stats = IndexStats()
        self._stats.files_scanned = len(paths)
        gitignore_patterns = _load_gitignore_patterns(self._repo_root)
        self._index_paths(paths, gitignore_patterns)
        return self._stats

    def get_stats(self) -> IndexStats:
        """Return the stats from the most recent index run."""
        return self._stats

    def install_git_hook(self) -> bool:
        """Install a post-commit hook in the repo's .git/hooks directory."""
        from .git_hook import install_hook
        return install_hook(self._repo_root)

    def close(self) -> None:
        self._uploader.close()

    def __enter__(self) -> "CodeIndexer":
        return self

    def __exit__(self, *_: object) -> None:
        self.close()

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    def _index_paths(
        self,
        paths: list[Path],
        gitignore_patterns: list[Any],
    ) -> None:
        payloads = []
        for path in paths:
            try:
                fp = filter_file(path, self._repo_root, gitignore_patterns)
                if fp is None:
                    self._stats.files_skipped += 1
                else:
                    payloads.append(fp)
                    self._stats.symbols_total += len(fp.symbols)
                    self._stats.relations_total += len(fp.relations)
            except Exception as exc:  # noqa: BLE001
                logger.warning("Error processing %s: %s", path, exc)
                self._stats.errors.append(str(exc))
                self._stats.files_skipped += 1

        # Upload in batches
        for i in range(0, max(1, len(payloads)), self._batch_size):
            batch = payloads[i : i + self._batch_size]
            if not batch:
                continue
            try:
                wire_payload = UpsertPayload.model_validate(
                    {
                        "repo": {
                            "name": self._repo_name,
                            "primary_lang": self._primary_lang,
                        },
                        "files": [f.model_dump() for f in batch],
                    }
                )
                self._uploader.upload(wire_payload)
                self._stats.files_uploaded += len(batch)
            except Exception as exc:  # noqa: BLE001
                logger.error("Upload batch failed: %s", exc)
                self._stats.errors.append(f"Upload error: {exc}")
