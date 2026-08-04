/**
 * LEEWAY_HEADER - DO NOT REMOVE
 *
 * REGION: UTIL
 * TAG: UTIL.MODULE.PLACEHOLDER
 * DESCRIPTION: Leeway IDE utility module
 * AUTHORITY: LeeWay-Standards
 * DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
 *
 * 5WH:
 * WHAT = Utility Module
 * WHY = Provide utility functions
 * WHO = Leeway Innovations / Agent Lee Enablement
 * WHERE = FILEPATH
 * WHEN = 2026-06-06
 * HOW = TypeScript module
 *
 * CHAIN: Standards ? Integrated ? Runtime ? Projections
 * LICENSE: PROPRIETARY
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from "react";

export interface KeyboardShortcutHandlers {
  onNewNode?: () => void;
  onSearch?: () => void;
  onSave?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onSelectAll?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomReset?: () => void;
  onTogglePalette?: () => void;
  onExport?: () => void;
}

/**
 * Custom hook for handling keyboard shortcuts
 */
export function useKeyboardShortcuts(handlers: KeyboardShortcutHandlers) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for modifier keys
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      // Ctrl/Cmd + N: New Node
      if (modifier && e.key === 'n') {
        e.preventDefault();
        handlers.onNewNode?.();
      }

      // Ctrl/Cmd + P: Search/Command Palette
      if (modifier && e.key === 'p') {
        e.preventDefault();
        handlers.onSearch?.();
      }

      // Ctrl/Cmd + S: Save Layout
      if (modifier && e.key === 's') {
        e.preventDefault();
        handlers.onSave?.();
      }

      // Delete/Backspace: Delete Selected Node
      if ((e.key === 'Delete' || e.key === 'Backspace') && !isInputFocused()) {
        e.preventDefault();
        handlers.onDelete?.();
      }

      // Ctrl/Cmd + D: Duplicate Selected Node
      if (modifier && e.key === 'd') {
        e.preventDefault();
        handlers.onDuplicate?.();
      }

      // Ctrl/Cmd + A: Select All Nodes
      if (modifier && e.key === 'a') {
        e.preventDefault();
        handlers.onSelectAll?.();
      }

      // Ctrl/Cmd + Z: Undo
      if (modifier && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handlers.onUndo?.();
      }

      // Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y: Redo
      if ((modifier && e.shiftKey && e.key === 'z') || (modifier && e.key === 'y')) {
        e.preventDefault();
        handlers.onRedo?.();
      }

      // Ctrl/Cmd + =: Zoom In
      if (modifier && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        handlers.onZoomIn?.();
      }

      // Ctrl/Cmd + -: Zoom Out
      if (modifier && e.key === '-') {
        e.preventDefault();
        handlers.onZoomOut?.();
      }

      // Ctrl/Cmd + 0: Reset Zoom
      if (modifier && e.key === '0') {
        e.preventDefault();
        handlers.onZoomReset?.();
      }

      // Ctrl/Cmd + B: Toggle Palette
      if (modifier && e.key === 'b') {
        e.preventDefault();
        handlers.onTogglePalette?.();
      }

      // Ctrl/Cmd + E: Export Layout
      if (modifier && e.key === 'e') {
        e.preventDefault();
        handlers.onExport?.();
      }

      // Escape: Close Palette/Deselect
      if (e.key === 'Escape') {
        handlers.onTogglePalette?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
}

/**
 * Check if an input element is currently focused
 */
function isInputFocused(): boolean {
  const activeElement = document.activeElement;
  return (
    activeElement instanceof HTMLInputElement ||
    activeElement instanceof HTMLTextAreaElement ||
    activeElement instanceof HTMLSelectElement ||
    (activeElement as HTMLElement)?.isContentEditable
  );
}

/**
 * Get keyboard shortcut display string based on platform
 */
export function getShortcutDisplay(key: string): string {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modifier = isMac ? '⌘' : 'Ctrl';
  
  const shortcuts: Record<string, string> = {
    'new': `${modifier}+N`,
    'search': `${modifier}+P`,
    'save': `${modifier}+S`,
    'delete': 'Del',
    'duplicate': `${modifier}+D`,
    'selectAll': `${modifier}+A`,
    'undo': `${modifier}+Z`,
    'redo': isMac ? `${modifier}+Shift+Z` : `${modifier}+Y`,
    'zoomIn': `${modifier}++`,
    'zoomOut': `${modifier}+-`,
    'zoomReset': `${modifier}+0`,
    'togglePalette': `${modifier}+B`,
    'export': `${modifier}+E`,
    'escape': 'Esc'
  };

  return shortcuts[key] || key;
}

// Leeway Standards: governed module
