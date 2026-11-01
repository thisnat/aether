import React, { useState } from 'react';
import { Wifi, WifiOff, Copy, Check, ShieldCheck, Users } from 'lucide-react';

export function NetworkModal({ isOpen, onClose, networkInfo, peerCount, onToggleSharing }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const isSharing = Boolean(networkInfo?.sharingEnabled);

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
            <div className={`modal-icon-badge ${isSharing ? 'active' : ''}`}>
              {isSharing ? <Wifi size={18} /> : <WifiOff size={18} />}
            </div>
            <div>
              <h3>Local Network Sharing</h3>
              <p className="modal-subtitle">
                {isSharing
                  ? 'Connect any phone, tablet, or PC on this Wi-Fi network'
                  : 'Currently restricted to localhost (offline / private)'}
              </p>
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="modal-body">
          {/* Master Toggle Banner */}
          <div className={`network-toggle-box ${isSharing ? 'is-active' : 'is-disabled'}`}>
            <div className="network-toggle-info">
              <div className="network-status-line">
                <span className={`network-status-dot ${isSharing ? 'active' : ''}`} />
                <span className="network-status-text">
                  {isSharing ? 'Network Sharing Active' : 'Network Sharing Off'}
                </span>
              </div>
              <p className="network-toggle-desc">
                {isSharing
                  ? 'Other devices on your Wi-Fi can open notes and sync live edits.'
                  : 'External connections are blocked. Enable to allow other devices to connect.'}
              </p>
            </div>
            <button
              type="button"
              className={`network-power-btn ${isSharing ? 'active' : ''}`}
              onClick={() => onToggleSharing?.(!isSharing)}
            >
              {isSharing ? 'Disable Sharing' : 'Enable Sharing'}
            </button>
          </div>

          {isSharing ? (
            <>
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
            </>
          ) : (
            <div className="network-disabled-card">
              <div className="network-disabled-icon">
                <ShieldCheck size={28} />
              </div>
              <h4>Private & Localhost Only</h4>
              <p>
                Aether is protected from incoming network traffic. When you're ready to read or edit
                notes on your phone, click <strong>"Enable Sharing"</strong> above to broadcast on
                your local Wi-Fi.
              </p>
            </div>
          )}

          <div className="network-stats-row">
            <div className="peer-info-left">
              <div className="peer-icon-badge">
                <Users size={15} />
              </div>
              <div className="peer-text-group">
                <div className="peer-main-label">
                  {isSharing
                    ? peerCount > 1
                      ? `${peerCount} Connected Devices`
                      : '1 Connected Device (Host)'
                    : '1 Active Device (Host Only)'}
                </div>
                <div className="peer-sub-label">
                  {isSharing
                    ? peerCount > 1
                      ? 'Real-time note synchronization active'
                      : 'Scan QR code or open address to connect'
                    : 'Network sync is paused until sharing is enabled'}
                </div>
              </div>
            </div>

            <div className="peer-info-right">
              {isSharing ? (
                peerCount > 1 ? (
                  <span className="peer-status-pill sync">
                    <span className="peer-pulse-dot" />
                    <span>Syncing</span>
                  </span>
                ) : (
                  <span className="peer-status-pill ready">
                    <span className="peer-pulse-dot" />
                    <span>Ready</span>
                  </span>
                )
              ) : (
                <span className="peer-status-pill idle">
                  <span className="peer-dot-idle" />
                  <span>Localhost</span>
                </span>
              )}
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
