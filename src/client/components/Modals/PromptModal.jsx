import React, { useState, useEffect, useRef } from 'react';

export function PromptModal({
  isOpen,
  title,
  label,
  defaultValue = '',
  confirmLabel = 'Confirm',
  onConfirm,
  onClose,
}) {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setValue(defaultValue);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, defaultValue]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (value.trim()) {
      onConfirm(value.trim());
      onClose();
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card small-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <label style={{ fontSize: 13, color: 'var(--text-muted)' }}>{label}</label>
            <input
              ref={inputRef}
              type="text"
              style={{ width: '100%', padding: '8px 10px', fontSize: 14 }}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              required
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
