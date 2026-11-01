import { useState, useEffect, useRef } from 'react';
import { NetworkSocket } from '../services/socket';

export function useWebSocket({ onNoteSaved, onTreeChanged, onExternalChange, onSharingChanged }) {
  const [peerCount, setPeerCount] = useState(1);
  const [clientId, setClientId] = useState(null);
  const socketRef = useRef(null);

  // Store latest handlers in refs to avoid reconnecting socket on function changes
  const handlersRef = useRef({
    onNoteSaved,
    onTreeChanged,
    onExternalChange,
    onSharingChanged,
  });
  useEffect(() => {
    handlersRef.current = {
      onNoteSaved,
      onTreeChanged,
      onExternalChange,
      onSharingChanged,
    };
  });

  useEffect(() => {
    const socket = new NetworkSocket({
      onConnected: (id, count) => {
        setClientId(id);
        if (count) setPeerCount(count);
      },
      onPeerCount: (count) => {
        setPeerCount(count);
      },
      onSharingChanged: (sharingEnabled, count) => {
        handlersRef.current.onSharingChanged?.(sharingEnabled, count);
      },
      onNoteSaved: (data) => {
        handlersRef.current.onNoteSaved?.(data);
      },
      onTreeChanged: (data) => {
        handlersRef.current.onTreeChanged?.(data);
      },
      onExternalChange: (data) => {
        handlersRef.current.onExternalChange?.(data);
      },
    });

    socketRef.current = socket;

    return () => {
      socket.destroy();
    };
  }, []);

  return { peerCount, clientId, socket: socketRef.current };
}
