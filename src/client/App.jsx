import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Eye, Edit3 } from 'lucide-react';
import { Topbar } from './components/Header/Topbar';
import { Sidebar } from './components/Sidebar/Sidebar';
import { EditorPane } from './components/Editor/EditorPane';
import { PreviewPane } from './components/Preview/PreviewPane';
import { PaneResizer } from './components/Common/PaneResizer';
import { StatusBar } from './components/Common/StatusBar';
import { Toast } from './components/Common/Toast';
import { NetworkModal } from './components/Modals/NetworkModal';
import { SearchModal } from './components/Modals/SearchModal';
import { PromptModal } from './components/Modals/PromptModal';
import { ConfirmModal } from './components/Modals/ConfirmModal';
import { GraphModal } from './components/Graph/GraphModal';

import { useTheme } from './hooks/useTheme';
import { useWebSocket } from './hooks/useWebSocket';
import { useVault } from './hooks/useVault';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import * as api from './services/api';

export function App() {
  const { theme, setTheme, colorMode, toggleColorMode, isDark, availableThemes } = useTheme();

  // Layout states
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('aether_mode') || (window.innerWidth <= 768 ? 'edit' : 'split');
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const [editorWidth, setEditorWidth] = useState(null);

  // Network & Sharing info
  const [networkInfo, setNetworkInfo] = useState(null);

  // Graph Data
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });

  // Modals state
  const [isNetworkModalOpen, setIsNetworkModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isGraphModalOpen, setIsGraphModalOpen] = useState(false);
  const [promptConfig, setPromptConfig] = useState(null);
  const [confirmConfig, setConfirmConfig] = useState(null);

  // Toasts
  const [toasts, setToasts] = useState([]);
  const showToast = useCallback((message, duration = 2400) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  // Fetch graph data
  const loadGraphData = useCallback(async () => {
    try {
      const data = await api.fetchGraphData();
      setGraphData(data);
    } catch (err) {
      console.error('Failed to load graph data:', err);
    }
  }, []);

  // WebSocket callbacks
  const handleRemoteNoteSaved = useCallback(
    (data) => {
      if (activeNoteRef.current && activeNoteRef.current.path === data.path) {
        if (!isDirtyRef.current) {
          vault.setActiveNote((prev) => ({
            ...prev,
            content: data.content,
            mtime: data.mtime,
          }));
          showToast('Note updated by peer device');
        } else {
          showToast(`⚠️ Conflict warning: Remote edit received for "${data.title}" while editing`);
        }
      }
      vault.loadTree();
      loadGraphData();
    },
    [loadGraphData, showToast]
  );

  const handleExternalVaultChange = useCallback(
    (data) => {
      vault.loadTree();
      loadGraphData();
      if (
        activeNoteRef.current &&
        activeNoteRef.current.path === data.path &&
        !isDirtyRef.current
      ) {
        vault.openNote(data.path);
        showToast('Updated from disk change');
      }
    },
    [loadGraphData, showToast]
  );

  const { peerCount, clientId } = useWebSocket({
    onNoteSaved: handleRemoteNoteSaved,
    onTreeChanged: () => {
      vault.loadTree();
      loadGraphData();
    },
    onExternalChange: handleExternalVaultChange,
  });

  // Vault state
  const vault = useVault({ clientId, showToast });

  const activeNoteRef = useRef(vault.activeNote);
  const isDirtyRef = useRef(vault.isDirty);
  useEffect(() => {
    activeNoteRef.current = vault.activeNote;
    isDirtyRef.current = vault.isDirty;
  }, [vault.activeNote, vault.isDirty]);

  // Fetch initial network info & graph data
  const loadNetworkInfo = useCallback(async () => {
    try {
      const data = await api.fetchNetworkInfo();
      setNetworkInfo(data);
    } catch (err) {
      console.error('Failed to load network info:', err);
    }
  }, []);

  useEffect(() => {
    loadNetworkInfo();
    loadGraphData();
  }, [loadNetworkInfo, loadGraphData]);

  // Reload graph when vault tree changes
  useEffect(() => {
    loadGraphData();
  }, [vault.tree, loadGraphData]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768 && viewMode === 'split') {
        setViewMode('edit');
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [viewMode]);

  const handleSelectMode = (mode) => {
    if (window.innerWidth <= 768 && mode === 'split') {
      mode = 'edit';
    }
    setViewMode(mode);
    localStorage.setItem('aether_mode', mode);
  };

  // Keyboard Shortcuts
  const closeAllModals = useCallback(() => {
    setIsNetworkModalOpen(false);
    setIsSearchModalOpen(false);
    setIsGraphModalOpen(false);
    setPromptConfig(null);
    setConfirmConfig(null);
  }, []);

  useKeyboardShortcuts({
    onSave: async () => {
      await vault.forceSave();
      loadGraphData();
    },
    onSearch: () => setIsSearchModalOpen(true),
    onNewNote: () => {
      setPromptConfig({
        title: 'New Note',
        label: 'Note title:',
        defaultValue: '',
        confirmLabel: 'Create',
        onConfirm: async (val) => {
          await vault.createNote('', val);
          loadGraphData();
        },
      });
    },
    onToggleMode: () => {
      handleSelectMode(viewMode === 'preview' ? 'edit' : 'preview');
    },
    onToggleSidebar: () => {
      if (window.innerWidth <= 768) {
        setSidebarMobileOpen((prev) => !prev);
      } else {
        setSidebarCollapsed((prev) => !prev);
      }
    },
    onCloseModals: closeAllModals,
  });

  // Split resizer
  const handlePaneResize = (clientX) => {
    const container = document.getElementById('panes-container');
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const newWidth = clientX - rect.left;
    if (newWidth > 150 && newWidth < rect.width - 150) {
      setEditorWidth(newWidth);
    }
  };

  // Wikilink navigation
  const handleWikilinkClick = (targetName) => {
    const cleanTarget = targetName.replace(/\.md$/i, '').trim().toLowerCase();

    // Find note in tree
    const findNote = (nodes) => {
      for (const node of nodes) {
        if (node.type === 'file') {
          const t = (node.title || node.name.replace(/\.md$/, '')).toLowerCase();
          if (t === cleanTarget) return node;
        } else if (node.type === 'folder' && node.children) {
          const found = findNote(node.children);
          if (found) return found;
        }
      }
      return null;
    };

    const found = findNote(vault.tree);
    if (found) {
      vault.openNote(found.path);
    } else {
      // Offer to create it
      setPromptConfig({
        title: 'Create Linked Note',
        label: `Create new note "${targetName}"?`,
        defaultValue: targetName,
        confirmLabel: 'Create & Open',
        onConfirm: async (name) => {
          await vault.createNote('', name);
          loadGraphData();
        },
      });
    }
  };

  return (
    <div className="app-container">
      <Topbar
        activeNotePath={vault.activeNote?.path}
        mode={viewMode}
        onSelectMode={handleSelectMode}
        peerCount={peerCount}
        theme={theme}
        colorMode={colorMode}
        availableThemes={availableThemes}
        onSelectTheme={setTheme}
        onToggleColorMode={toggleColorMode}
        onToggleSidebar={() => {
          if (window.innerWidth <= 768) {
            setSidebarMobileOpen((prev) => !prev);
          } else {
            setSidebarCollapsed((prev) => !prev);
          }
        }}
        onOpenNetworkModal={() => {
          loadNetworkInfo();
          setIsNetworkModalOpen(true);
        }}
        onOpenGraphModal={() => {
          loadGraphData();
          setIsGraphModalOpen(true);
        }}
      />

      <div className="workspace-container">
        <Sidebar
          tree={vault.tree}
          activePath={vault.activeNote?.path}
          collapsed={sidebarCollapsed}
          mobileOpen={sidebarMobileOpen}
          primaryIp={networkInfo?.primaryIp}
          onCloseMobile={() => setSidebarMobileOpen(false)}
          onSelectNote={(path) => {
            vault.openNote(path);
            setSidebarMobileOpen(false);
          }}
          onNewNote={(inFolder) => {
            setPromptConfig({
              title: inFolder ? `New Note in /${inFolder}` : 'New Note',
              label: 'Note title:',
              defaultValue: '',
              confirmLabel: 'Create',
              onConfirm: async (val) => {
                await vault.createNote(inFolder, val);
                loadGraphData();
              },
            });
          }}
          onNewFolder={(inFolder) => {
            setPromptConfig({
              title: inFolder ? `New Folder in /${inFolder}` : 'New Folder',
              label: 'Folder name:',
              defaultValue: '',
              confirmLabel: 'Create',
              onConfirm: (val) => vault.createFolder(inFolder, val),
            });
          }}
          onRefreshTree={async () => {
            await vault.loadTree();
            await loadGraphData();
            showToast('File tree refreshed');
          }}
          onOpenSearch={() => setIsSearchModalOpen(true)}
          onOpenNetworkModal={() => {
            loadNetworkInfo();
            setIsNetworkModalOpen(true);
          }}
          onDeleteItem={(itemPath, isDirectory) => {
            const itemType = isDirectory ? 'folder and all its contents' : 'note';
            setConfirmConfig({
              title: `Delete ${isDirectory ? 'Folder' : 'Note'}`,
              message: `Are you sure you want to delete this ${itemType}: "${itemPath}"?`,
              onConfirm: async () => {
                await vault.deleteItem(itemPath, isDirectory);
                loadGraphData();
              },
            });
          }}
        />

        <main className="editor-main">
          <div id="panes-container" className={`panes-container mode-${viewMode}`}>
            <div
              style={{
                display: viewMode === 'preview' ? 'none' : 'flex',
                flex: editorWidth && viewMode === 'split' ? 'none' : 1,
                width: editorWidth && viewMode === 'split' ? `${editorWidth}px` : undefined,
                minWidth: 0,
                height: '100%',
              }}
            >
              <EditorPane
                activeNote={vault.activeNote}
                onContentChange={vault.handleContentChange}
                onTitleRename={async (val) => {
                  await vault.renameActiveNote(val);
                  loadGraphData();
                }}
                onForceSave={async () => {
                  await vault.forceSave();
                  loadGraphData();
                }}
              />
            </div>

            {viewMode === 'split' && <PaneResizer onResize={handlePaneResize} />}

            <div
              style={{
                display: viewMode === 'edit' ? 'none' : 'flex',
                flex: 1,
                minWidth: 0,
                height: '100%',
                flexDirection: 'column',
              }}
            >
              <PreviewPane
                activeNote={vault.activeNote}
                graphData={graphData}
                isDark={isDark}
                theme={theme}
                onToggleCheckbox={vault.toggleCheckbox}
                onWikilinkClick={handleWikilinkClick}
                onSelectNote={vault.openNote}
                onOpenGlobalGraph={() => {
                  loadGraphData();
                  setIsGraphModalOpen(true);
                }}
              />
            </div>
          </div>

          {/* Floating Mobile Mode Switch Button */}
          <button
            type="button"
            className="mobile-mode-fab"
            onClick={() => handleSelectMode(viewMode === 'edit' ? 'preview' : 'edit')}
            title="Toggle Edit / Preview"
          >
            {viewMode === 'edit' ? <Eye size={16} /> : <Edit3 size={16} />}
            <span>{viewMode === 'edit' ? 'Preview' : 'Edit'}</span>
          </button>

          <StatusBar saveStatus={vault.saveStatus} content={vault.activeNote?.content || ''} />
        </main>
      </div>

      {/* Modals */}
      <NetworkModal
        isOpen={isNetworkModalOpen}
        onClose={() => setIsNetworkModalOpen(false)}
        networkInfo={networkInfo}
        peerCount={peerCount}
      />

      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        tree={vault.tree}
        onSelectNote={vault.openNote}
      />

      <GraphModal
        isOpen={isGraphModalOpen}
        onClose={() => setIsGraphModalOpen(false)}
        graphData={graphData}
        activePath={vault.activeNote?.path}
        onSelectNote={vault.openNote}
        isDark={isDark}
        theme={theme}
      />

      {promptConfig && (
        <PromptModal
          isOpen={true}
          title={promptConfig.title}
          label={promptConfig.label}
          defaultValue={promptConfig.defaultValue}
          confirmLabel={promptConfig.confirmLabel}
          onConfirm={promptConfig.onConfirm}
          onClose={() => setPromptConfig(null)}
        />
      )}

      {confirmConfig && (
        <ConfirmModal
          isOpen={true}
          title={confirmConfig.title}
          message={confirmConfig.message}
          onConfirm={confirmConfig.onConfirm}
          onClose={() => setConfirmConfig(null)}
        />
      )}

      <Toast toasts={toasts} />
    </div>
  );
}
