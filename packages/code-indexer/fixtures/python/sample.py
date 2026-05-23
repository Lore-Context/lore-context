"""
Sample Python fixture for Lane M recall/precision testing.
Hand-labeled: 14 expected symbols.
"""

from typing import Optional, List
import json
import hashlib


class MemoryRecord:
    """Represents a single memory record stored in the vault."""

    def __init__(self, memory_id: str, content: str, vault_id: str):
        self.memory_id = memory_id
        self.content = content
        self.vault_id = vault_id

    def to_dict(self) -> dict:
        return {
            "memory_id": self.memory_id,
            "content": self.content,
            "vault_id": self.vault_id,
        }

    def content_hash(self) -> str:
        return hashlib.sha256(self.content.encode()).hexdigest()

    def __repr__(self) -> str:
        return f"MemoryRecord(id={self.memory_id!r})"


class MemoryStore:
    """In-memory store for MemoryRecord objects."""

    def __init__(self):
        self._records: dict = {}

    def add(self, record: MemoryRecord) -> None:
        self._records[record.memory_id] = record

    def get(self, memory_id: str) -> Optional[MemoryRecord]:
        return self._records.get(memory_id)

    def list_all(self) -> List[MemoryRecord]:
        return list(self._records.values())

    def remove(self, memory_id: str) -> bool:
        if memory_id in self._records:
            del self._records[memory_id]
            return True
        return False


def create_memory(content: str, vault_id: str) -> MemoryRecord:
    """Create a new MemoryRecord with a generated ID."""
    memory_id = hashlib.md5(content.encode()).hexdigest()
    record = MemoryRecord(memory_id, content, vault_id)
    return record


def serialize_records(records: List[MemoryRecord]) -> str:
    """Serialize a list of MemoryRecord objects to JSON string."""
    data = [r.to_dict() for r in records]
    return json.dumps(data, indent=2)


def load_records(json_str: str) -> List[dict]:
    """Load records from a JSON string."""
    return json.loads(json_str)
