import { useState, useEffect, useRef, useCallback } from 'react';
import * as api from '../services/api';
import { toggleCheckboxInMarkdown } from '../utils/markdown';

export function useVault({ clientId, showToast }) {
  const [tree, setTree] = useState([]);
  const [activeNote, setActiveNote] = useState(null);
  const [saveStatus, setSaveStatus] = useState('saved');
  const [isDirty, setIsDirty] = useState(false);

  const saveTimerRef = useRef(null);
  const activeNoteRef = useRef(activeNote);
  const isDirtyRef = useRef(isDirty);

  useEffect(() => {
    activeNoteRef.current = activeNote;
    isDirtyRef.current = isDirty;
  }, [activeNote, isDirty]);

  // Load tree
  const loadTree = useCallback(async () => {
    try {
      const data = await api.fetchVaultTree();
      setTree(data.tree || []);
      return data.tree || [];
    } catch (err) {
      console.error('Error loading vault tree:', err);
      showToast?.(`Error loading file tree: ${err.message}`);
      return [];
    }
  }, [showToast]);

  // Direct save helper
  const performSave = useCallback(
    async (notePath, content) => {
      if (!notePath) return;
      try {
        setSaveStatus('saving');
        const saved = await api.saveNote(notePath, content, clientId);
        setActiveNote((prev) =>
          prev && prev.path === notePath ? { ...prev, mtime: saved.mtime, size: saved.size } : prev
        );
        setIsDirty(false);
        setSaveStatus('saved');
      } catch (err) {
        console.error('Error saving note:', err);
        setSaveStatus('error');
        showToast?.(`Save failed: ${err.message}`);
      }
    },
    [clientId, showToast]
  );

  // Save active note immediately
  const forceSave = useCallback(async () => {
    clearTimeout(saveTimerRef.current);
    if (activeNoteRef.current && isDirtyRef.current) {
      await performSave(activeNoteRef.current.path, activeNoteRef.current.content);
    }
  }, [performSave]);

  // Open note
  const openNote = useCallback(
    async (filePath) => {
      if (!filePath) return;

      // Flush dirty edits before opening new note
      if (isDirtyRef.current && activeNoteRef.current) {
        await performSave(activeNoteRef.current.path, activeNoteRef.current.content);
      }

      try {
        setSaveStatus('loading');
        const note = await api.fetchNote(filePath);
        setActiveNote(note);
        setIsDirty(false);
        setSaveStatus('saved');
        localStorage.setItem('aether_last_note', note.path);
      } catch (err) {
        console.error('Error opening note:', err);
        setSaveStatus('error');
        showToast?.(`Error opening note: ${err.message}`);
      }
    },
    [performSave, showToast]
  );

  // Content change handler (with debounced autosave)
  const handleContentChange = useCallback(
    (newContent) => {
      setActiveNote((prev) => (prev ? { ...prev, content: newContent } : prev));
      setIsDirty(true);
      setSaveStatus('dirty');

      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        if (activeNoteRef.current) {
          performSave(activeNoteRef.current.path, newContent);
        }
      }, 500);
    },
    [performSave]
  );

  // Rename current note title
  const renameActiveNote = useCallback(
    async (newTitle) => {
      if (!activeNoteRef.current) return;
      const cleanTitle = newTitle.trim();
      if (!cleanTitle || cleanTitle === activeNoteRef.current.title) return;

      const dir = activeNoteRef.current.path.includes('/')
        ? activeNoteRef.current.path.substring(0, activeNoteRef.current.path.lastIndexOf('/'))
        : '';
      const newPath = dir ? `${dir}/${cleanTitle}.md` : `${cleanTitle}.md`;

      try {
        await api.renameItem(activeNoteRef.current.path, newPath);
        setActiveNote((prev) => ({
          ...prev,
          path: newPath,
          title: cleanTitle,
        }));
        localStorage.setItem('aether_last_note', newPath);
        await loadTree();
        showToast?.(`Renamed to "${cleanTitle}"`);
      } catch (err) {
        console.error('Rename error:', err);
        showToast?.(`Rename error: ${err.message}`);
      }
    },
    [loadTree, showToast]
  );

  // Create note
  const createNote = useCallback(
    async (inFolder = '', defaultTitle = 'Untitled') => {
      const title = defaultTitle || 'Untitled';
      const filePath = inFolder ? `${inFolder}/${title}.md` : `${title}.md`;

      try {
        const saved = await api.saveNote(
          filePath,
          `# ${title}\n\nStart typing your note here...`,
          clientId
        );
        await loadTree();
        await openNote(saved.path);
        showToast?.(`Created note: ${title}`);
      } catch (err) {
        showToast?.(`Error creating note: ${err.message}`);
      }
    },
    [clientId, loadTree, openNote, showToast]
  );

  // Create folder
  const createFolder = useCallback(
    async (inFolder = '', folderName = 'New Folder') => {
      const folderPath = inFolder ? `${inFolder}/${folderName}` : folderName;
      try {
        await api.createDirectory(folderPath);
        await loadTree();
        showToast?.(`Created folder: ${folderName}`);
      } catch (err) {
        showToast?.(`Error creating folder: ${err.message}`);
      }
    },
    [loadTree, showToast]
  );

  // Delete note or directory
  const deleteItem = useCallback(
    async (itemPath, isDirectory = false) => {
      try {
        if (isDirectory) {
          await api.deleteDirectory(itemPath);
        } else {
          await api.deleteNote(itemPath);
        }

        if (
          activeNoteRef.current &&
          (activeNoteRef.current.path === itemPath ||
            activeNoteRef.current.path.startsWith(itemPath + '/'))
        ) {
          setActiveNote(null);
          setIsDirty(false);
        }

        await loadTree();
        showToast?.(`Deleted ${itemPath}`);
      } catch (err) {
        showToast?.(`Delete failed: ${err.message}`);
      }
    },
    [loadTree, showToast]
  );

  // Checkbox toggle inside markdown preview
  const toggleCheckbox = useCallback(
    (taskIdx) => {
      if (!activeNoteRef.current) return;
      const updated = toggleCheckboxInMarkdown(activeNoteRef.current.content, taskIdx);
      setActiveNote((prev) => ({ ...prev, content: updated }));
      performSave(activeNoteRef.current.path, updated);
    },
    [performSave]
  );

  // Initial load
  useEffect(() => {
    loadTree().then((initialTree) => {
      const lastNote = localStorage.getItem('aether_last_note');
      const findFirst = (nodes) => {
        for (const n of nodes) {
          if (n.type === 'file') return n;
          if (n.type === 'folder' && n.children) {
            const f = findFirst(n.children);
            if (f) return f;
          }
        }
        return null;
      };

      if (lastNote) {
        openNote(lastNote);
      } else {
        const first = findFirst(initialTree);
        if (first) openNote(first.path);
      }
    });
  }, [loadTree, openNote]);

  return {
    tree,
    activeNote,
    saveStatus,
    isDirty,
    loadTree,
    openNote,
    forceSave,
    handleContentChange,
    renameActiveNote,
    createNote,
    createFolder,
    deleteItem,
    toggleCheckbox,
    setActiveNote,
  };
}
