import React from 'react';
import { Link2, FileText } from 'lucide-react';

export function Backlinks({ backlinks = [], onSelectNote }) {
  if (!backlinks || backlinks.length === 0) return null;

  return (
    <div className="backlinks-container">
      <div className="backlinks-header">
        <Link2 size={14} />
        <span>Linked References ({backlinks.length})</span>
      </div>

      <div className="backlinks-list">
        {backlinks.map((link) => (
          <a
            key={link.path}
            className="backlink-item"
            onClick={() => onSelectNote(link.path)}
          >
            <FileText size={12} />
            <span>{link.title}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
