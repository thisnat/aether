/**
 * Aether - Main Application Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  const app = new AetherApp();
  window.aether = app;
});

class AetherApp {
  constructor() {
    this.activeNote = null;
    this.vaultTree = [];
    this.networkInfo = null;
    this.viewMode = localStorage.getItem('aether_mode') || (window.innerWidth <= 768 ? 'edit' : 'split');
    this.theme = localStorage.getItem('aether_theme') || 'dark';

    // Subsystems
    this.markdown = new MarkdownRenderer();
    this.editor = new EditorController({
      textarea: document.getElementById('markdown-editor'),
      onContentChange: (val) => this.handleContentChange(val),
      onSaveRequest: (val) => this.saveActiveNote(val),
      debounceMs: 400,
    });

    this.socket = new NetworkSocket({
      onPeerCount: (count) => this.updatePeerCount(count),
      onNoteSaved: (data) => this.handleRemoteNoteSaved(data),
      onTreeChanged: () => this.loadTree(),
      onExternalChange: (data) => this.handleExternalVaultChange(data),
    });

    this.initDOM();
    this.initEvents();
    this.applyTheme(this.theme);
    this.applyMode(this.viewMode);

    // Initial data fetch
    this.fetchNetworkInfo();
    this.loadTree().then(() => {
      // Open last active note or default Welcome note
      const lastNote = localStorage.getItem('aether_last_note');
      if (lastNote && this.findInTree(this.vaultTree, lastNote)) {
        this.openNote(lastNote);
      } else {
        const welcome = this.findFirstNote(this.vaultTree);
        if (welcome) this.openNote(welcome.path);
      }
    });
  }

  /* ========================================================
     DOM Initialization & Event Bindings
     ======================================================== */

  initDOM() {
    this.sidebar = document.getElementById('sidebar');
    this.sidebarBackdrop = document.getElementById('sidebar-backdrop');
    this.toggleSidebarBtn = document.getElementById('toggle-sidebar-btn');
    this.fileTreeContainer = document.getElementById('file-tree-container');
    this.noteTitleInput = document.getElementById('note-title-input');
    this.previewContent = document.getElementById('preview-content');
    this.panesContainer = document.getElementById('panes-container');
    this.saveStatusEl = document.getElementById('save-status');
    this.saveStatusText = document.getElementById('save-status-text');
    this.activePathBreadcrumb = document.getElementById('active-path-breadcrumb');
    this.backlinksContainer = document.getElementById('backlinks-container');
    this.backlinksList = document.getElementById('backlinks-list');
    this.backlinksCount = document.getElementById('backlinks-count');
    this.peerCountText = document.getElementById('peer-count-text');
    this.modalPeerCount = document.getElementById('modal-peer-count');
    this.wordCountEl = document.getElementById('word-count');
    this.charCountEl = document.getElementById('char-count');
    this.fileSizeInfo = document.getElementById('file-size-info');
  }

  initEvents() {
    // Mode switcher buttons
    document.querySelectorAll('.mode-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.applyMode(btn.dataset.mode);
      });
    });

    // Theme toggle
    document.getElementById('theme-toggle-btn').addEventListener('click', () => {
      this.toggleTheme();
    });

    // Sidebar toggle (desktop collapse & mobile drawer)
    this.toggleSidebarBtn.addEventListener('click', () => {
      this.toggleSidebar();
    });

    const closeSidebarBtn = document.getElementById('close-sidebar-btn');
    if (closeSidebarBtn) {
      closeSidebarBtn.addEventListener('click', () => {
        this.closeSidebarMobile();
      });
    }

    this.sidebarBackdrop.addEventListener('click', () => {
      this.closeSidebarMobile();
    });

    // Mobile Mode FAB button
    const mobileFab = document.getElementById('mobile-mode-fab');
    if (mobileFab) {
      mobileFab.addEventListener('click', () => {
        const next = this.viewMode === 'edit' ? 'preview' : 'edit';
        this.applyMode(next);
      });
    }

    // Auto-adjust view mode when resizing to mobile
    window.addEventListener('resize', () => {
      if (window.innerWidth <= 768 && this.viewMode === 'split') {
        this.applyMode('edit');
      }
    });

    // Top action buttons
    document.getElementById('new-note-btn').addEventListener('click', () => {
      this.promptNewNote();
    });

    document.getElementById('new-folder-btn').addEventListener('click', () => {
      this.promptNewFolder();
    });

    document.getElementById('refresh-tree-btn').addEventListener('click', () => {
      this.loadTree();
      this.showToast('File tree refreshed');
    });

    // Network sharing modals
    const openNetworkModal = () => this.openNetworkModal();
    document.getElementById('share-btn').addEventListener('click', openNetworkModal);
    document.getElementById('network-badge-btn').addEventListener('click', openNetworkModal);
    document.getElementById('sidebar-share-shortcut').addEventListener('click', openNetworkModal);
    document.getElementById('sidebar-network-preview').addEventListener('click', openNetworkModal);

    // Copy network URL button
    document.getElementById('copy-network-url-btn').addEventListener('click', () => {
      const input = document.getElementById('network-url-input');
      input.select();
      navigator.clipboard.writeText(input.value);
      this.showToast('Network link copied to clipboard!');
    });

    // Search trigger
    document.getElementById('search-trigger-btn').addEventListener('click', () => {
      this.openSearchModal();
    });

    // Note title input rename
    this.noteTitleInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.handleTitleRename();
      }
    });

    this.noteTitleInput.addEventListener('blur', () => {
      this.handleTitleRename();
    });

    // Interactive Checkboxes & Wikilinks in Preview Pane
    this.previewContent.addEventListener('click', (e) => {
      // 1. Task checkbox toggle
      if (e.target && e.target.classList.contains('interactive-task')) {
        const taskIdx = parseInt(e.target.dataset.taskIdx, 10);
        this.handleCheckboxToggle(taskIdx);
        return;
      }

      // 2. Wikilink click
      const link = e.target.closest('.wikilink');
      if (link) {
        e.preventDefault();
        const targetNote = link.dataset.target;
        this.navigateToWikilink(targetNote);
      }
    });

    // Modal close buttons (data-close-modal)
    document.querySelectorAll('[data-close-modal]').forEach((el) => {
      el.addEventListener('click', () => {
        const modalId = el.getAttribute('data-close-modal');
        this.closeModal(modalId);
      });
    });

    // Global keyboard shortcuts
    window.addEventListener('keydown', (e) => {
      const isCmd = e.ctrlKey || e.metaKey;

      // Ctrl + K or Ctrl + P -> Search modal
      if (isCmd && (e.key.toLowerCase() === 'k' || e.key.toLowerCase() === 'p')) {
        e.preventDefault();
        this.openSearchModal();
        return;
      }

      // Ctrl + N -> New Note
      if (isCmd && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        this.promptNewNote();
        return;
      }

      // Ctrl + E -> Toggle Edit / Preview
      if (isCmd && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        const nextMode = this.viewMode === 'preview' ? 'edit' : 'preview';
        this.applyMode(nextMode);
        return;
      }

      // Ctrl + \ -> Toggle sidebar
      if (isCmd && e.key === '\\') {
        e.preventDefault();
        this.toggleSidebar();
        return;
      }

      // ESC -> Close modals
      if (e.key === 'Escape') {
        this.closeAllModals();
      }
    });

    // Resizable pane divider
    this.initPaneResizer();

    // Quick search modal inputs & navigation
    this.initSearchModal();
  }

  /* ========================================================
     Vault & Notes API Handling
     ======================================================== */

  async loadTree() {
    try {
      const res = await fetch('/api/vault/tree');
      const data = await res.json();
      this.vaultTree = data.tree || [];
      this.renderFileTree(this.vaultTree, this.fileTreeContainer);
    } catch (err) {
      console.error('Error loading vault tree:', err);
      this.fileTreeContainer.innerHTML = '<div class="tree-empty">Failed to load notes</div>';
    }
  }

  renderFileTree(nodes, container, level = 0) {
    container.innerHTML = '';

    if (!nodes || nodes.length === 0) {
      container.innerHTML = '<div class="tree-empty">Vault is empty.<br>Click "+ Note" to create one.</div>';
      return;
    }

    const fragment = document.createDocumentFragment();

    nodes.forEach((node) => {
      if (node.type === 'folder') {
        const folderEl = document.createElement('div');
        folderEl.className = 'tree-folder open';
        folderEl.dataset.path = node.path;

        const header = document.createElement('div');
        header.className = 'tree-folder-header';
        header.innerHTML = `
          <div class="tree-item-title">
            <span class="folder-arrow">
              <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </span>
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
            <span>${escapeHtml(node.name)}</span>
          </div>
          <div class="tree-actions">
            <button class="tree-action-icon" data-action="new-note" title="New Note here">
              <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
            <button class="tree-action-icon danger" data-action="delete-folder" title="Delete folder">
              <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        `;

        // Toggle folder open/closed on click
        header.addEventListener('click', (e) => {
          if (e.target.closest('.tree-actions')) return;
          folderEl.classList.toggle('open');
        });

        // Folder actions
        header.querySelector('[data-action="new-note"]').addEventListener('click', (e) => {
          e.stopPropagation();
          this.promptNewNote(node.path);
        });

        header.querySelector('[data-action="delete-folder"]').addEventListener('click', (e) => {
          e.stopPropagation();
          this.confirmDelete(node.path, true);
        });

        const childrenContainer = document.createElement('div');
        childrenContainer.className = 'tree-folder-children';
        this.renderFileTree(node.children, childrenContainer, level + 1);

        folderEl.appendChild(header);
        folderEl.appendChild(childrenContainer);
        fragment.appendChild(folderEl);
      } else {
        // Markdown File Item
        const fileEl = document.createElement('div');
        const isActive = this.activeNote && this.activeNote.path === node.path;
        fileEl.className = `tree-file ${isActive ? 'active' : ''}`;
        fileEl.dataset.path = node.path;

        fileEl.innerHTML = `
          <div class="tree-item-title">
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            <span>${escapeHtml(node.title || node.name.replace(/\.md$/, ''))}</span>
          </div>
          <div class="tree-actions">
            <button class="tree-action-icon" data-action="download" title="Download note file">
              <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            </button>
            <button class="tree-action-icon danger" data-action="delete-file" title="Delete note">
              <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        `;

        fileEl.addEventListener('click', (e) => {
          if (e.target.closest('.tree-actions')) return;
          this.openNote(node.path);
          this.closeSidebarMobile();
        });

        fileEl.querySelector('[data-action="download"]').addEventListener('click', (e) => {
          e.stopPropagation();
          window.open(`/api/vault/raw?path=${encodeURIComponent(node.path)}`, '_blank');
        });

        fileEl.querySelector('[data-action="delete-file"]').addEventListener('click', (e) => {
          e.stopPropagation();
          this.confirmDelete(node.path, false);
        });

        fragment.appendChild(fileEl);
      }
    });

    container.appendChild(fragment);
  }

  async openNote(filePath) {
    if (!filePath) return;

    // Force save current dirty note before switching
    if (this.editor.isDirty) {
      await this.saveActiveNote(this.editor.getValue());
    }

    try {
      this.setSavingState('loading');
      const res = await fetch(`/api/vault/file?path=${encodeURIComponent(filePath)}`);
      if (!res.ok) throw new Error('Note not found');

      const note = await res.json();
      this.activeNote = note;
      localStorage.setItem('aether_last_note', note.path);
      this.closeSidebarMobile();

      // Populate UI
      this.noteTitleInput.value = note.title;
      this.activePathBreadcrumb.innerHTML = `<span>${escapeHtml(note.path)}</span>`;
      this.editor.setValue(note.content, true);

      this.updateRenderedPreview();
      this.updateBacklinks(note.backlinks || []);
      this.updateActiveTreeItem(note.path);
      this.updateStats();
      this.setSavingState('saved');
    } catch (err) {
      console.error('Error opening note:', err);
      this.showToast(`Error opening note: ${err.message}`);
      this.setSavingState('error');
    }
  }

  async saveActiveNote(content) {
    if (!this.activeNote) return;

    try {
      this.setSavingState('saving');
      const res = await fetch('/api/vault/file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: this.activeNote.path,
          content,
          senderId: this.socket.clientId,
        }),
      });

      if (!res.ok) throw new Error('Save failed');
      const data = await res.json();
      this.activeNote.mtime = data.mtime;
      this.activeNote.size = data.size;

      this.setSavingState('saved');
      this.updateStats();
    } catch (err) {
      console.error('Error saving note:', err);
      this.setSavingState('error');
      this.showToast('Save failed!');
    }
  }

  async handleTitleRename() {
    if (!this.activeNote) return;
    const newTitle = this.noteTitleInput.value.trim();
    if (!newTitle || newTitle === this.activeNote.title) return;

    // Build new path within same directory
    const dir = this.activeNote.path.includes('/')
      ? this.activeNote.path.substring(0, this.activeNote.path.lastIndexOf('/'))
      : '';
    const newPath = dir ? `${dir}/${newTitle}.md` : `${newTitle}.md`;

    try {
      const res = await fetch('/api/vault/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldPath: this.activeNote.path,
          newPath,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Rename failed');
      }

      this.activeNote.path = newPath;
      this.activeNote.title = newTitle;
      this.activePathBreadcrumb.innerHTML = `<span>${escapeHtml(newPath)}</span>`;
      localStorage.setItem('aether_last_note', newPath);

      await this.loadTree();
      this.showToast(`Renamed to "${newTitle}"`);
    } catch (err) {
      console.error('Rename error:', err);
      this.showToast(`Rename error: ${err.message}`);
      this.noteTitleInput.value = this.activeNote.title;
    }
  }

  handleContentChange(newVal) {
    this.updateRenderedPreview();
    this.updateStats();
    this.setSavingState('dirty');
  }

  updateRenderedPreview() {
    const raw = this.editor.getValue();
    const html = this.markdown.render(raw, this.activeNote ? this.activeNote.path : '');
    this.previewContent.innerHTML = html;
    this.markdown.enhancePreview(this.previewContent);
  }

  updateBacklinks(backlinks) {
    if (!backlinks || backlinks.length === 0) {
      this.backlinksContainer.style.display = 'none';
      return;
    }

    this.backlinksContainer.style.display = 'block';
    this.backlinksCount.textContent = backlinks.length;
    this.backlinksList.innerHTML = backlinks.map(b => `
      <a class="backlink-item" data-path="${escapeHtml(b.path)}">
        <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path></svg>
        <span>${escapeHtml(b.title)}</span>
      </a>
    `).join('');

    this.backlinksList.querySelectorAll('.backlink-item').forEach((item) => {
      item.addEventListener('click', () => {
        this.openNote(item.dataset.path);
      });
    });
  }

  handleCheckboxToggle(taskIdx) {
    const raw = this.editor.getValue();
    const updated = this.markdown.toggleCheckboxInMarkdown(raw, taskIdx);
    this.editor.setValue(updated, false);
    this.saveActiveNote(updated);
  }

  navigateToWikilink(targetNoteName) {
    const cleanTarget = targetNoteName.replace(/\.md$/i, '').trim();
    // Search in current tree for matching note title or filename
    const found = this.findNoteByName(this.vaultTree, cleanTarget);

    if (found) {
      this.openNote(found.path);
    } else {
      // Note doesn't exist yet: offer to create it
      this.openPromptModal({
        title: 'Create Linked Note',
        label: `Create new note "<strong>${escapeHtml(cleanTarget)}</strong>"?`,
        defaultValue: cleanTarget,
        confirmLabel: 'Create & Open',
        onConfirm: async (name) => {
          await this.createNote('', name);
        },
      });
    }
  }

  async createNote(inFolder = '', defaultTitle = '') {
    const title = defaultTitle || 'Untitled';
    const filePath = inFolder ? `${inFolder}/${title}.md` : `${title}.md`;

    try {
      const res = await fetch('/api/vault/file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: filePath,
          content: `# ${title}\n\nStart typing your note here...`,
          senderId: this.socket.clientId,
        }),
      });

      if (!res.ok) throw new Error('Failed to create note');
      const data = await res.json();
      await this.loadTree();
      this.openNote(data.path);
      this.showToast(`Created note: ${title}`);
    } catch (err) {
      this.showToast(`Error creating note: ${err.message}`);
    }
  }

  async createFolder(inFolder = '', folderName = 'New Folder') {
    const folderPath = inFolder ? `${inFolder}/${folderName}` : folderName;

    try {
      const res = await fetch('/api/vault/directory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: folderPath }),
      });

      if (!res.ok) throw new Error('Failed to create folder');
      await this.loadTree();
      this.showToast(`Created folder: ${folderName}`);
    } catch (err) {
      this.showToast(`Error creating folder: ${err.message}`);
    }
  }

  promptNewNote(inFolder = '') {
    this.openPromptModal({
      title: inFolder ? `New Note in /${inFolder}` : 'New Note',
      label: 'Note title:',
      defaultValue: '',
      confirmLabel: 'Create',
      onConfirm: (val) => this.createNote(inFolder, val),
    });
  }

  promptNewFolder(inFolder = '') {
    this.openPromptModal({
      title: inFolder ? `New Folder in /${inFolder}` : 'New Folder',
      label: 'Folder name:',
      defaultValue: '',
      confirmLabel: 'Create',
      onConfirm: (val) => this.createFolder(inFolder, val),
    });
  }

  confirmDelete(itemPath, isDirectory = false) {
    const itemType = isDirectory ? 'folder and all its contents' : 'note';
    this.openConfirmModal({
      title: `Delete ${isDirectory ? 'Folder' : 'Note'}`,
      message: `Are you sure you want to delete this ${itemType}:<br><strong style="color:var(--danger);">${escapeHtml(itemPath)}</strong>?`,
      confirmLabel: 'Delete',
      onConfirm: async () => {
        try {
          const endpoint = isDirectory ? '/api/vault/directory' : '/api/vault/file';
          const res = await fetch(`${endpoint}?path=${encodeURIComponent(itemPath)}`, {
            method: 'DELETE',
          });

          if (!res.ok) throw new Error('Deletion failed');
          this.showToast(`Deleted ${itemPath}`);

          if (this.activeNote && (this.activeNote.path === itemPath || this.activeNote.path.startsWith(itemPath + '/'))) {
            this.activeNote = null;
            this.noteTitleInput.value = '';
            this.editor.setValue('', true);
            this.previewContent.innerHTML = '';
            this.activePathBreadcrumb.innerHTML = '<span class="muted">No note selected</span>';
          }

          await this.loadTree();
        } catch (err) {
          this.showToast(`Delete failed: ${err.message}`);
        }
      },
    });
  }

  /* ========================================================
     Network & Remote Sync
     ======================================================== */

  async fetchNetworkInfo() {
    try {
      const res = await fetch('/api/network');
      const data = await res.json();
      this.networkInfo = data;

      document.getElementById('sidebar-lan-label').textContent = data.primaryIp;
      document.getElementById('network-url-input').value = data.networkUrl;
      document.getElementById('local-url-display').textContent = data.localUrl;
      document.getElementById('qr-code-img').src = data.qrDataUrl;
      this.updatePeerCount(data.peerCount || 1);
    } catch (err) {
      console.error('Error fetching network info:', err);
    }
  }

  updatePeerCount(count) {
    const label = `${count} device${count === 1 ? '' : 's'}`;
    if (this.peerCountText) this.peerCountText.textContent = label;
    if (this.modalPeerCount) this.modalPeerCount.textContent = label;
  }

  openNetworkModal() {
    this.fetchNetworkInfo();
    this.openModal('network-modal');
  }

  handleRemoteNoteSaved(data) {
    // If the saved note is currently open and not locally edited
    if (this.activeNote && this.activeNote.path === data.path) {
      if (!this.editor.isDirty) {
        this.activeNote.content = data.content;
        this.activeNote.mtime = data.mtime;
        this.editor.setValue(data.content, true);
        this.setSavingState('saved');
        this.showToast(`Note updated by peer device`);
      } else {
        this.showToast(`⚠️ Conflict warning: Remote edit received for "${data.title}" while editing`);
      }
    }
    this.loadTree();
  }

  handleExternalVaultChange(data) {
    this.loadTree();
    if (this.activeNote && this.activeNote.path === data.path && !this.editor.isDirty) {
      this.openNote(data.path);
      this.showToast('Updated from disk change');
    }
  }

  /* ========================================================
     View Modes & Layout
     ======================================================== */

  applyMode(mode) {
    // If mobile, prevent split view and default to edit
    if (window.innerWidth <= 768 && mode === 'split') {
      mode = 'edit';
    }

    this.viewMode = mode;
    localStorage.setItem('aether_mode', mode);

    document.querySelectorAll('.mode-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    this.panesContainer.className = `panes-container mode-${mode}`;

    if (mode === 'preview' || mode === 'split') {
      this.updateRenderedPreview();
    }

    // Update Mobile FAB text & icon
    const fabText = document.getElementById('mobile-fab-text');
    const fabIcon = document.getElementById('mobile-fab-icon');
    if (fabText && fabIcon) {
      if (mode === 'edit') {
        fabText.textContent = 'Preview';
        fabIcon.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
      } else {
        fabText.textContent = 'Edit';
        fabIcon.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>';
      }
    }
  }

  toggleTheme() {
    this.theme = this.theme === 'dark' ? 'light' : 'dark';
    this.applyTheme(this.theme);
  }

  applyTheme(theme) {
    this.theme = theme;
    localStorage.setItem('aether_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);

    // Swap highlight theme stylesheet
    const themeLink = document.getElementById('highlight-theme');
    if (themeLink) {
      themeLink.href = theme === 'light' ? '/vendor/highlight-light.css' : '/vendor/highlight-dark.css';
    }
  }

  toggleSidebar() {
    if (window.innerWidth <= 768) {
      // Mobile drawer toggle
      const isOpen = this.sidebar.classList.contains('mobile-open');
      if (isOpen) {
        this.closeSidebarMobile();
      } else {
        this.sidebar.classList.add('mobile-open');
        this.sidebar.classList.remove('collapsed');
        this.sidebarBackdrop.classList.add('active');
      }
    } else {
      // Desktop collapse
      this.sidebar.classList.toggle('collapsed');
    }
  }

  closeSidebarMobile() {
    this.sidebar.classList.remove('mobile-open');
    this.sidebarBackdrop.classList.remove('active');
  }

  initPaneResizer() {
    const resizer = document.getElementById('pane-resizer');
    const editorPane = document.getElementById('editor-pane');
    if (!resizer || !editorPane) return;

    let isResizing = false;

    resizer.addEventListener('mousedown', (e) => {
      isResizing = true;
      resizer.classList.add('resizing');
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';
    });

    window.addEventListener('mousemove', (e) => {
      if (!isResizing) return;
      const containerRect = this.panesContainer.getBoundingClientRect();
      const newWidth = e.clientX - containerRect.left;
      if (newWidth > 150 && newWidth < containerRect.width - 150) {
        editorPane.style.flex = 'none';
        editorPane.style.width = `${newWidth}px`;
      }
    });

    window.addEventListener('mouseup', () => {
      if (isResizing) {
        isResizing = false;
        resizer.classList.remove('resizing');
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
      }
    });
  }

  /* ========================================================
     Search & Command Palette (Ctrl+K)
     ======================================================== */

  initSearchModal() {
    this.searchModal = document.getElementById('search-modal');
    this.searchInput = document.getElementById('quick-search-input');
    this.searchResultsList = document.getElementById('search-results-list');
    this.selectedSearchIndex = 0;
    this.currentResults = [];

    let searchDebounce = null;

    this.searchInput.addEventListener('input', () => {
      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(() => {
        this.executeSearch(this.searchInput.value.trim());
      }, 150);
    });

    this.searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.moveSearchSelection(1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.moveSearchSelection(-1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        this.selectCurrentSearchResult();
      }
    });
  }

  openSearchModal() {
    this.openModal('search-modal');
    this.searchInput.value = '';
    this.selectedSearchIndex = 0;
    this.executeSearch('');
    setTimeout(() => this.searchInput.focus(), 50);
  }

  async executeSearch(query) {
    if (!query) {
      // List all notes when search box is empty
      const flatNotes = this.flattenTreeFiles(this.vaultTree);
      this.currentResults = flatNotes.map(n => ({
        path: n.path,
        title: n.title,
        titleMatch: true,
        matches: [],
      }));
    } else {
      try {
        const res = await fetch(`/api/vault/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        this.currentResults = data.results || [];
      } catch (err) {
        console.error('Search error:', err);
        this.currentResults = [];
      }
    }

    this.selectedSearchIndex = 0;
    this.renderSearchResults(query);
  }

  renderSearchResults(query) {
    if (this.currentResults.length === 0) {
      this.searchResultsList.innerHTML = `<div class="search-empty">No matching notes found for "${escapeHtml(query)}"</div>`;
      return;
    }

    this.searchResultsList.innerHTML = this.currentResults.map((item, idx) => {
      const isSelected = idx === this.selectedSearchIndex;
      const snippet = item.matches && item.matches.length > 0
        ? `<div class="search-result-snippet">Line ${item.matches[0].lineNumber}: ${escapeHtml(item.matches[0].line)}</div>`
        : '';

      return `
        <div class="search-result-item ${isSelected ? 'selected' : ''}" data-idx="${idx}" data-path="${escapeHtml(item.path)}">
          <div class="search-result-title">
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path></svg>
            <span>${escapeHtml(item.title)}</span>
          </div>
          <div class="search-result-path">${escapeHtml(item.path)}</div>
          ${snippet}
        </div>
      `;
    }).join('');

    this.searchResultsList.querySelectorAll('.search-result-item').forEach((el) => {
      el.addEventListener('click', () => {
        const path = el.dataset.path;
        this.closeModal('search-modal');
        this.openNote(path);
      });
    });
  }

  moveSearchSelection(dir) {
    if (this.currentResults.length === 0) return;
    this.selectedSearchIndex = (this.selectedSearchIndex + dir + this.currentResults.length) % this.currentResults.length;
    
    const items = this.searchResultsList.querySelectorAll('.search-result-item');
    items.forEach((it, idx) => {
      it.classList.toggle('selected', idx === this.selectedSearchIndex);
      if (idx === this.selectedSearchIndex) {
        it.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  selectCurrentSearchResult() {
    if (this.currentResults.length > 0 && this.currentResults[this.selectedSearchIndex]) {
      const selected = this.currentResults[this.selectedSearchIndex];
      this.closeModal('search-modal');
      this.openNote(selected.path);
    }
  }

  /* ========================================================
     Modal Helpers
     ======================================================== */

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = 'flex';
    }
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = 'none';
    }
  }

  closeAllModals() {
    document.querySelectorAll('.modal-backdrop').forEach((m) => {
      m.style.display = 'none';
    });
  }

  openPromptModal({ title, label, defaultValue, confirmLabel, onConfirm }) {
    document.getElementById('prompt-modal-title').textContent = title;
    document.getElementById('prompt-modal-label').innerHTML = label;
    const input = document.getElementById('prompt-modal-input');
    input.value = defaultValue || '';
    document.getElementById('prompt-modal-confirm-btn').textContent = confirmLabel || 'Confirm';

    const form = document.getElementById('prompt-modal-form');
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);

    newForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = newForm.querySelector('#prompt-modal-input').value.trim();
      if (val) {
        this.closeModal('prompt-modal');
        onConfirm(val);
      }
    });

    this.openModal('prompt-modal');
    setTimeout(() => newForm.querySelector('#prompt-modal-input').focus(), 50);
  }

  openConfirmModal({ title, message, confirmLabel, onConfirm }) {
    document.getElementById('confirm-modal-title').textContent = title;
    document.getElementById('confirm-modal-message').innerHTML = message;
    const btn = document.getElementById('confirm-modal-action-btn');
    btn.textContent = confirmLabel || 'Confirm';

    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);

    newBtn.addEventListener('click', () => {
      this.closeModal('confirm-modal');
      onConfirm();
    });

    this.openModal('confirm-modal');
  }

  /* ========================================================
     Status & Utilities
     ======================================================== */

  setSavingState(state) {
    if (!this.saveStatusEl) return;
    this.saveStatusEl.className = `save-status ${state}`;
    switch (state) {
      case 'saving':
        this.saveStatusText.textContent = 'Saving...';
        break;
      case 'saved':
        this.saveStatusText.textContent = 'Saved';
        break;
      case 'dirty':
        this.saveStatusText.textContent = 'Unsaved edits';
        break;
      case 'loading':
        this.saveStatusText.textContent = 'Loading note...';
        break;
      case 'error':
        this.saveStatusText.textContent = 'Save error!';
        break;
    }
  }

  updateStats() {
    const stats = this.editor.getStats();
    if (this.wordCountEl) this.wordCountEl.textContent = `${stats.words} word${stats.words === 1 ? '' : 's'}`;
    if (this.charCountEl) this.charCountEl.textContent = `${stats.characters} char${stats.characters === 1 ? '' : 's'}`;
    if (this.fileSizeInfo) this.fileSizeInfo.textContent = stats.sizeKb;
  }

  updateActiveTreeItem(path) {
    document.querySelectorAll('.tree-file').forEach((el) => {
      el.classList.toggle('active', el.dataset.path === path);
    });
  }

  showToast(message, duration = 2400) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
      <span>${escapeHtml(message)}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      toast.style.transition = 'all 0.2s ease';
      setTimeout(() => toast.remove(), 200);
    }, duration);
  }

  // Tree traversal helpers
  findInTree(tree, targetPath) {
    for (const item of tree) {
      if (item.path === targetPath) return item;
      if (item.type === 'folder' && item.children) {
        const found = this.findInTree(item.children, targetPath);
        if (found) return found;
      }
    }
    return null;
  }

  findFirstNote(tree) {
    for (const item of tree) {
      if (item.type === 'file') return item;
      if (item.type === 'folder' && item.children) {
        const found = this.findFirstNote(item.children);
        if (found) return found;
      }
    }
    return null;
  }

  findNoteByName(tree, nameWithoutExt) {
    const target = nameWithoutExt.toLowerCase();
    for (const item of tree) {
      if (item.type === 'file') {
        const title = (item.title || item.name.replace(/\.md$/, '')).toLowerCase();
        if (title === target) return item;
      } else if (item.type === 'folder' && item.children) {
        const found = this.findNoteByName(item.children, nameWithoutExt);
        if (found) return found;
      }
    }
    return null;
  }

  flattenTreeFiles(tree) {
    const list = [];
    const traverse = (nodes) => {
      nodes.forEach((n) => {
        if (n.type === 'file') list.push(n);
        else if (n.type === 'folder' && n.children) traverse(n.children);
      });
    };
    traverse(tree);
    return list;
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
