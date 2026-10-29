import React, { useState } from 'react';
import { Wifi, Copy, Check } from 'lucide-react';

export function NetworkModal({ isOpen, onClose, networkInfo, peerCount }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (!networkInfo?.networkUrl) return;
    navigator.clipboard.writeText(networkInfo.networkUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon-badge">
              <Wifi size={18} />
            </div>
            <div>
              <h3>Local Network Sharing</h3>
              <p className="modal-subtitle">
                Connect any phone, tablet, or PC on this Wi-Fi network
              </p>
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="modal-body">
          <div className="qr-container">
            <div className="qr-image-wrapper">
              {networkInfo?.qrDataUrl ? (
                <img src={networkInfo.qrDataUrl} alt="Network QR code" />
              ) : (
                <div
                  style={{
                    width: 140,
                    height: 140,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  Loading...
                </div>
              )}
            </div>

            <div className="qr-instructions">
              <div className="instruction-step">
                <span className="step-num">1</span>
                <span>
                  Connect your phone to the <strong>same Wi-Fi</strong>
                </span>
              </div>
              <div className="instruction-step">
                <span className="step-num">2</span>
                <span>Scan this QR code with your camera</span>
              </div>
              <div className="instruction-step">
                <span className="step-num">3</span>
                <span>Open in browser — live notes sync directly!</span>
              </div>
            </div>
          </div>

          <div className="url-copy-box">
            <div className="url-label">Network Address:</div>
            <div className="url-input-row">
              <input type="text" readOnly value={networkInfo?.networkUrl || ''} />
              <button type="button" className="copy-url-btn" onClick={handleCopy}>
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          <div className="network-stats-row">
            <div>
              <span className="stat-label">Local URL</span>
              <code>{networkInfo?.localUrl || 'http://localhost:3000'}</code>
            </div>
            <div>
              <span className="stat-label">Connected Peers</span>
              <span>
                {peerCount} device{peerCount === 1 ? '' : 's'}
              </span>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
