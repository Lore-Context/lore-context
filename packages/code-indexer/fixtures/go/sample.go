// Package indexer provides a simple code indexer for Go source files.
// This is a hand-labeled fixture for Lane M recall/precision testing.
package indexer

import (
	"crypto/md5"
	"encoding/json"
	"fmt"
	"strings"
)

// Symbol represents a code symbol extracted from a source file.
type Symbol struct {
	Name          string `json:"name"`
	QualifiedName string `json:"qualified_name"`
	Kind          string `json:"kind"`
	StartLine     int    `json:"start_line"`
	EndLine       int    `json:"end_line"`
	IsExported    bool   `json:"is_exported"`
}

// Relation represents a directional relation between two symbols.
type Relation struct {
	SrcQname string `json:"src_qname"`
	DstQname string `json:"dst_qname"`
	Kind     string `json:"kind"`
}

// Walker interface for language-specific AST walkers.
type Walker interface {
	Walk(source string) ([]Symbol, []Relation, error)
}

// IndexResult holds the output of a full index pass.
type IndexResult struct {
	Symbols   []Symbol   `json:"symbols"`
	Relations []Relation `json:"relations"`
	FileHash  string     `json:"file_hash"`
}

// ComputeHash returns the MD5 hex digest of the input string.
func ComputeHash(input string) string {
	sum := md5.Sum([]byte(input))
	return fmt.Sprintf("%x", sum)
}

// FormatQualifiedName builds a dot-separated qualified name.
func FormatQualifiedName(parts []string) string {
	return strings.Join(parts, ".")
}

// Indexer holds per-language walkers and runs index passes.
type Indexer struct {
	walkers map[string]Walker
}

// NewIndexer constructs a new Indexer with no registered walkers.
func NewIndexer() *Indexer {
	return &Indexer{
		walkers: make(map[string]Walker),
	}
}

// Register adds a walker for the given language tag.
func (idx *Indexer) Register(lang string, walker Walker) {
	idx.walkers[lang] = walker
}

// Index runs the walker for the given language and returns an IndexResult.
func (idx *Indexer) Index(lang string, source string) (*IndexResult, error) {
	walker, ok := idx.walkers[lang]
	if !ok {
		return nil, fmt.Errorf("no walker registered for language %q", lang)
	}
	symbols, relations, err := walker.Walk(source)
	if err != nil {
		return nil, err
	}
	return &IndexResult{
		Symbols:   symbols,
		Relations: relations,
		FileHash:  ComputeHash(source),
	}, nil
}

// Serialize serializes an IndexResult to JSON.
func (idx *Indexer) Serialize(result *IndexResult) ([]byte, error) {
	return json.Marshal(result)
}
