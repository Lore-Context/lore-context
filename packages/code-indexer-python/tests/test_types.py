"""Tests for wire-format types — verifies Pydantic strict mode (extra='forbid')."""

import pytest
from pydantic import ValidationError

from lore_code_indexer.types import (
    FilePayload,
    RelationRecord,
    SymbolRecord,
    UpsertPayload,
    strip_secret_patterns,
    SECRET_PATTERN_DENYLIST,
)


class TestSymbolRecordStrict:
    def test_valid_symbol(self):
        s = SymbolRecord(
            name="my_func",
            qualified_name="module.my_func",
            kind="function",
            start_line=10,
            end_line=20,
            is_exported=True,
        )
        assert s.name == "my_func"

    def test_rejects_unknown_field(self):
        with pytest.raises(ValidationError):
            SymbolRecord(
                name="my_func",
                qualified_name="module.my_func",
                kind="function",
                start_line=10,
                end_line=20,
                is_exported=True,
                unknown_field="should_fail",
            )

    def test_rejects_body_field(self):
        with pytest.raises(ValidationError):
            SymbolRecord(
                name="my_func",
                qualified_name="module.my_func",
                kind="function",
                start_line=10,
                end_line=20,
                is_exported=True,
                function_body="def my_func():\n    pass\n",
            )

    def test_rejects_source_bytes_field(self):
        with pytest.raises(ValidationError):
            SymbolRecord(
                name="my_func",
                qualified_name="module.my_func",
                kind="function",
                start_line=10,
                end_line=20,
                is_exported=True,
                source="raw source bytes here",
            )


class TestFilePayloadStrict:
    def _minimal_file_payload(self, **extra):
        return {
            "relative_path": "src/foo.py",
            "language": "python",
            "content_hash": "abcdef1234567890",
            "ast_hash": "1234567890abcdef",
            "last_modified_at": "2026-05-13T00:00:00Z",
            "symbols": [],
            "relations": [],
            **extra,
        }

    def test_valid_file_payload(self):
        fp = FilePayload.model_validate(self._minimal_file_payload())
        assert fp.relative_path == "src/foo.py"

    def test_rejects_unknown_field(self):
        with pytest.raises(ValidationError):
            FilePayload.model_validate(
                self._minimal_file_payload(unknown_field="bad_value")
            )

    def test_rejects_absolute_path(self):
        with pytest.raises(ValidationError):
            FilePayload.model_validate(
                self._minimal_file_payload(relative_path="/absolute/path.py")
            )

    def test_rejects_windows_absolute_path(self):
        with pytest.raises(ValidationError):
            FilePayload.model_validate(
                self._minimal_file_payload(relative_path="C:\\Users\\foo.py")
            )

    def test_rejects_invalid_content_hash(self):
        with pytest.raises(ValidationError):
            FilePayload.model_validate(
                self._minimal_file_payload(content_hash="not-a-hex-digest")
            )


class TestUpsertPayloadStrict:
    def test_valid_upsert_payload(self):
        payload = UpsertPayload.model_validate(
            {
                "repo": {"name": "my_repo"},
                "files": [],
            }
        )
        assert payload.repo.name == "my_repo"

    def test_rejects_unknown_top_level_field(self):
        with pytest.raises(ValidationError):
            UpsertPayload.model_validate(
                {
                    "repo": {"name": "my_repo"},
                    "files": [],
                    "raw_source_dump": "this should not be here",
                }
            )

    def test_rejects_unknown_repo_field(self):
        with pytest.raises(ValidationError):
            UpsertPayload.model_validate(
                {
                    "repo": {"name": "my_repo", "secret_field": "bad"},
                    "files": [],
                }
            )


class TestStripSecretPatterns:
    def test_strips_stripe_live_key(self):
        s = 'key = "sk_live_abcdef123456789012"'
        result = strip_secret_patterns(s)
        assert "sk_live_" not in result
        assert "REDACTED" in result

    def test_strips_github_token(self):
        s = "token: ghp_ABCDEFghijklmnopqrstuvwxyz1234"
        result = strip_secret_patterns(s)
        assert "ghp_" not in result

    def test_strips_aws_access_key(self):
        s = "AKIAIOSFODNN7EXAMPLE"
        result = strip_secret_patterns(s)
        assert "AKIA" not in result

    def test_strips_anthropic_key(self):
        s = "sk-ant-api03-abcdefghijklmnopqrstuvwxyz1234567890"
        result = strip_secret_patterns(s)
        assert "sk-ant-" not in result

    def test_preserves_normal_text(self):
        s = "def my_function(x: int) -> str:"
        result = strip_secret_patterns(s)
        assert result == s

    def test_strips_pem_block(self):
        s = "-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA\n-----END RSA PRIVATE KEY-----"
        result = strip_secret_patterns(s)
        assert "BEGIN RSA PRIVATE KEY" not in result
