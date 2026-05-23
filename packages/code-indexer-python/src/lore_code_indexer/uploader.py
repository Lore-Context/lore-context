"""
HTTP uploader — POST to /v1/code-graph/upsert with exponential backoff.

Respects 429 Retry-After headers and implements jittered exponential backoff
for 5xx responses.
"""

from __future__ import annotations

import logging
import random
import time
from typing import Any

import httpx

from .types import UpsertPayload

logger = logging.getLogger(__name__)

_DEFAULT_RETRIES = 5
_BASE_BACKOFF_S = 1.0
_MAX_BACKOFF_S = 60.0


class UploaderError(Exception):
    """Raised when an upload fails after all retries."""


class Uploader:
    """Upload ``UpsertPayload`` objects to the Lore Cloud API.

    Parameters
    ----------
    base_url:
        API base URL, e.g. ``https://api.lore.dev``.
    api_key:
        Bearer token for Authorization header.
    timeout:
        Per-request timeout in seconds (default 30).
    max_retries:
        Maximum number of retry attempts on transient errors.
    """

    def __init__(
        self,
        base_url: str,
        api_key: str,
        timeout: float = 30.0,
        max_retries: int = _DEFAULT_RETRIES,
    ) -> None:
        self._base_url = base_url.rstrip("/")
        self._api_key = api_key
        self._timeout = timeout
        self._max_retries = max_retries
        self._client = httpx.Client(
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "User-Agent": "lore-context-code-indexer/0.1.0",
            },
            timeout=timeout,
        )

    def upload(self, payload: UpsertPayload) -> dict[str, Any]:
        """Upload *payload* to ``/v1/code-graph/upsert``.

        Returns the parsed JSON response body.
        Raises ``UploaderError`` after exhausting retries.
        """
        url = f"{self._base_url}/v1/code-graph/upsert"
        body = payload.model_dump_json(exclude_none=True)

        attempt = 0
        backoff = _BASE_BACKOFF_S
        last_exc: Exception | None = None

        while attempt <= self._max_retries:
            try:
                resp = self._client.post(url, content=body)

                if resp.status_code == 200:
                    return resp.json()

                if resp.status_code == 429:
                    retry_after = float(resp.headers.get("Retry-After", backoff))
                    logger.warning("Rate-limited (429); sleeping %.1fs", retry_after)
                    time.sleep(retry_after)
                    attempt += 1
                    continue

                if resp.status_code in (400, 401, 403, 422):
                    # Non-retryable client errors
                    raise UploaderError(
                        f"Non-retryable error {resp.status_code}: {resp.text[:512]}"
                    )

                # 5xx or unexpected → retry
                logger.warning(
                    "Upload attempt %d/%d failed: HTTP %d",
                    attempt + 1,
                    self._max_retries + 1,
                    resp.status_code,
                )
                last_exc = UploaderError(f"HTTP {resp.status_code}: {resp.text[:256]}")

            except httpx.TransportError as exc:
                logger.warning("Upload attempt %d/%d transport error: %s", attempt + 1, self._max_retries + 1, exc)
                last_exc = exc

            if attempt < self._max_retries:
                jitter = random.uniform(0, backoff * 0.25)
                sleep_s = min(backoff + jitter, _MAX_BACKOFF_S)
                logger.debug("Retrying in %.2fs", sleep_s)
                time.sleep(sleep_s)
                backoff = min(backoff * 2, _MAX_BACKOFF_S)

            attempt += 1

        raise UploaderError(
            f"Upload failed after {self._max_retries + 1} attempts"
        ) from last_exc

    def close(self) -> None:
        self._client.close()

    def __enter__(self) -> "Uploader":
        return self

    def __exit__(self, *_: object) -> None:
        self.close()
