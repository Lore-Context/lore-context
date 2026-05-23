"""
Watchdog-based file watcher with 500 ms debounce.

Watches a directory for source file changes and calls a callback with the
list of changed paths after a 500 ms quiet period (debounce). Multiple rapid
changes to the same file are coalesced into a single callback invocation.
"""

from __future__ import annotations

import logging
import threading
from collections.abc import Callable
from pathlib import Path

logger = logging.getLogger(__name__)

_DEBOUNCE_SECONDS = 0.5


class _DebounceHandler:
    """Watchdog event handler that coalesces events with a debounce timer."""

    def __init__(self, callback: Callable[[list[Path]], None]) -> None:
        self._callback = callback
        self._pending: set[Path] = set()
        self._lock = threading.Lock()
        self._timer: threading.Timer | None = None

    def _schedule(self) -> None:
        if self._timer is not None:
            self._timer.cancel()
        self._timer = threading.Timer(_DEBOUNCE_SECONDS, self._fire)
        self._timer.daemon = True
        self._timer.start()

    def _fire(self) -> None:
        with self._lock:
            paths = list(self._pending)
            self._pending.clear()
            self._timer = None
        if paths:
            self._callback(paths)

    def on_event(self, path: Path) -> None:
        with self._lock:
            self._pending.add(path)
            self._schedule()


class FileWatcher:
    """Watch *root* for file changes and invoke *callback* after debounce.

    Usage::

        def on_change(paths: list[Path]) -> None:
            ...

        watcher = FileWatcher(Path("/my/repo"), on_change)
        watcher.start()
        # ... later ...
        watcher.stop()
    """

    def __init__(self, root: Path, callback: Callable[[list[Path]], None]) -> None:
        self._root = root
        self._callback = callback
        self._handler = _DebounceHandler(callback)
        self._observer: object | None = None

    def start(self) -> None:
        try:
            from watchdog.events import FileSystemEventHandler  # type: ignore[import]
            from watchdog.observers import Observer  # type: ignore[import]

            handler_self = self._handler

            class _WatchdogBridge(FileSystemEventHandler):
                def on_any_event(self, event: object) -> None:  # type: ignore[override]
                    if getattr(event, "is_directory", False):
                        return
                    src = getattr(event, "src_path", None)
                    if src:
                        handler_self.on_event(Path(src))

            observer = Observer()
            observer.schedule(_WatchdogBridge(), str(self._root), recursive=True)
            observer.start()
            self._observer = observer
            logger.info("FileWatcher started on %s", self._root)
        except ImportError:
            logger.warning("watchdog not installed — FileWatcher disabled")

    def stop(self) -> None:
        if self._observer is not None:
            try:
                self._observer.stop()  # type: ignore[union-attr]
                self._observer.join()  # type: ignore[union-attr]
            except Exception as exc:  # noqa: BLE001
                logger.debug("Error stopping watcher: %s", exc)
            self._observer = None
