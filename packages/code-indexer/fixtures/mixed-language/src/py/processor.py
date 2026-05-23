"""
Python data processor — part of mixed-language fixture for M4 cross-language detection test.
"""

from typing import List, Dict, Any, Optional
import json


class DataProcessor:
    """Processes raw data records from the TS API layer."""

    def __init__(self, schema_version: str = "v1"):
        self.schema_version = schema_version
        self._processed: List[Dict[str, Any]] = []

    def process(self, record: Dict[str, Any]) -> Dict[str, Any]:
        """Process a single data record."""
        result = {
            "schema": self.schema_version,
            "data": record,
        }
        self._processed.append(result)
        return result

    def process_batch(self, records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Process a batch of records."""
        return [self.process(r) for r in records]

    def get_processed(self) -> List[Dict[str, Any]]:
        return list(self._processed)

    def reset(self) -> None:
        self._processed = []


def load_json(path: str) -> Any:
    """Load JSON from a file path."""
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def dump_json(data: Any, path: str) -> None:
    """Dump data to a JSON file."""
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
