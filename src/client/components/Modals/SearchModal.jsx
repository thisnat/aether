import React, { useState, useEffect, useRef } from 'react';
import { Search, FileText } from 'lucide-react';
import * as api from '../../services/api';

export function SearchModal({ isOpen, onClose, tree, onSelectNote }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  // Flatten tree for empty query
  const flatNotes = useRef([]);
  useEffect(() => {
    const list = [];
    const traverse = (nodes) => {
      nodes.forEach((n) => {
        if (n.type === 'file') list.push(n);
        else if (n.type === 'folder' && n.children) traverse(n.children);
      });
    };
    traverse(tree || []);
    flatNotes.current = list;
  }, [tree]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setResults(
        flatNotes.current.map((n) => ({
          path: n.path,
          title: n.title || n.name.replace(/\.md$/, ''),
          matches: [],
        }))
      );
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    if (!query.trim()) {
      setResults(
        flatNotes.current.map((n) => ({
          path: n.path,
          title: n.title || n.name.replace(/\.md$/, ''),
          matches: [],
        }))
      );
      setSelectedIndex(0);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const data = await api.searchNotes(query.trim());
        setResults(data.results || []);
        setSelectedIndex(0);
      } catch (err) {
        console.error('Search error:', err);
        setResults([]);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  if (!isOpen) return null;

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (results.length > 0 ? (prev + 1) % results.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        results.length > 0 ? (prev - 1 + results.length) % results.length : 0
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        onSelectNote(results[selectedIndex].path);
        onClose();
      }
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="search-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="search-input-header">
          <Search size={18} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search notes or type note title..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
          />
          <span className="esc-badge">ESC</span>
        </div>

        <div className="search-results-list">
          {results.length === 0 ? (
            <div className="search-empty">
              {query ? `No matching notes found for "${query}"` : 'No notes in vault'}
            </div>
          ) : (
            results.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const snippet = item.matches && item.matches.length > 0 ? item.matches[0] : null;

              return (
                <div
                  key={item.path}
                  className={`search-result-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => {
                    onSelectNote(item.path);
                    onClose();
                  }}
                >
                  <div className="search-result-title">
                    <FileText size={14} />
                    <span>{item.title}</span>
                  </div>
                  <div className="search-result-path">{item.path}</div>
                  {snippet && (
                    <div className="search-result-snippet">
                      Line {snippet.lineNumber}: {snippet.line}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="search-modal-footer">
          <span>
            <kbd>↑</kbd> <kbd>↓</kbd> to navigate
          </span>
          <span>
            <kbd>↵</kbd> to open
          </span>
          <span>
            <kbd>ESC</kbd> to close
          </span>
        </div>
      </div>
    </div>
  );
}
