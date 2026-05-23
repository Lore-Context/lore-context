"""Git post-commit hook installer."""

from __future__ import annotations

import logging
import os
import stat
from pathlib import Path

logger = logging.getLogger(__name__)

_HOOK_SCRIPT = """\
#!/usr/bin/env sh
# Lore Context code indexer — installed by `lore-index install-git-hook`
# Runs an incremental index on every commit.
lore-index --incremental 2>&1 | tail -5 || true
"""


def install_hook(repo_root: Path) -> bool:
    """Install a post-commit hook at ``.git/hooks/post-commit``.

    Returns ``True`` if the hook was installed (or already present with the
    same content), ``False`` on failure.
    """
    hooks_dir = repo_root / ".git" / "hooks"
    if not hooks_dir.is_dir():
        logger.error("No .git/hooks directory found at %s — is this a git repo?", repo_root)
        return False

    hook_path = hooks_dir / "post-commit"

    if hook_path.exists():
        existing = hook_path.read_text(encoding="utf-8")
        if "lore-index" in existing:
            logger.info("post-commit hook already contains lore-index — no change")
            return True
        # Append to existing hook
        with hook_path.open("a", encoding="utf-8") as fh:
            fh.write("\n" + _HOOK_SCRIPT)
        logger.info("Appended lore-index to existing post-commit hook at %s", hook_path)
    else:
        hook_path.write_text(_HOOK_SCRIPT, encoding="utf-8")
        logger.info("Installed post-commit hook at %s", hook_path)

    # Ensure the hook is executable
    current_mode = hook_path.stat().st_mode
    hook_path.chmod(current_mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)
    return True
