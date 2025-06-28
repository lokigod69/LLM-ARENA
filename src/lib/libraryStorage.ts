// Library Storage Utility for Mark & Library System
// Now supports likeCategory (for heart) and starReason (for star), with starter sets and user-defined additions.
// Handles CRUD for MarkedItem and Folder, persists LibraryState in localStorage under 'llmArenaLibrary'.
// Provides export functions for JSON and CSV.

export type MarkType = 'like' | 'star';

export interface MarkedItem {
  id: string;
  type: MarkType[];
  content: any; // DebateMessage | OracleResult | Debate
  timestamp: string;
  folders: string[];
  annotation?: string;
  likeCategory?: string; // for heart
  starReason?: string;   // for star
}

export interface Folder {
  id: string;
  name: string;
  type: MarkType;
  createdAt: string;
}

export interface LibraryState {
  items: MarkedItem[];
  folders: Folder[];
}

const STORAGE_KEY = 'llmArenaLibrary';
const CATEGORY_KEY = 'llmArenaLikeCategories';
const REASON_KEY = 'llmArenaStarReasons';

const STARTER_CATEGORIES = [
  'Philosophical',
  'Technical',
  'Silly',
  'Insightful',
  'Debate Tactic',
  'Funny',
  'Best Argument',
];
const STARTER_REASONS = [
  'Further Research',
  'Interesting',
  'Needs Breakdown',
  'Podcast Material',
  'Controversial',
  'Unclear',
  'To Summarize',
];

function loadLibrary(): LibraryState {
  if (typeof window === 'undefined') {
    return { items: [], folders: [] };
  }
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { items: [], folders: [] };
  try {
    return JSON.parse(raw);
  } catch {
    return { items: [], folders: [] };
  }
}

function saveLibrary(state: LibraryState) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function getAllItems(): MarkedItem[] {
  return loadLibrary().items;
}

export function getAllFolders(): Folder[] {
  return loadLibrary().folders;
}

export function addItem(item: MarkedItem) {
  const state = loadLibrary();
  state.items.push(item);
  saveLibrary(state);
}

export function updateItem(updated: MarkedItem) {
  const state = loadLibrary();
  state.items = state.items.map(i => i.id === updated.id ? updated : i);
  saveLibrary(state);
}

export function removeItem(id: string) {
  const state = loadLibrary();
  state.items = state.items.filter(i => i.id !== id);
  saveLibrary(state);
}

export function addFolder(folder: Folder) {
  const state = loadLibrary();
  state.folders.push(folder);
  saveLibrary(state);
}

export function updateFolder(updated: Folder) {
  const state = loadLibrary();
  state.folders = state.folders.map(f => f.id === updated.id ? updated : f);
  saveLibrary(state);
}

export function removeFolder(id: string) {
  const state = loadLibrary();
  state.folders = state.folders.filter(f => f.id !== id);
  // Remove folder from all items
  state.items = state.items.map(i => ({ ...i, folders: i.folders.filter(fid => fid !== id) }));
  saveLibrary(state);
}

// Category/Reason utilities
export function getLikeCategories(): string[] {
  if (typeof window === 'undefined') {
    return [...STARTER_CATEGORIES];
  }
  const raw = localStorage.getItem(CATEGORY_KEY);
  if (!raw) return [...STARTER_CATEGORIES];
  try {
    return JSON.parse(raw);
  } catch {
    return [...STARTER_CATEGORIES];
  }
}
export function addLikeCategory(category: string) {
  if (typeof window === 'undefined') return;
  const cats = getLikeCategories();
  if (!cats.includes(category)) {
    cats.push(category);
    localStorage.setItem(CATEGORY_KEY, JSON.stringify(cats));
  }
}
export function getStarReasons(): string[] {
  if (typeof window === 'undefined') {
    return [...STARTER_REASONS];
  }
  const raw = localStorage.getItem(REASON_KEY);
  if (!raw) return [...STARTER_REASONS];
  try {
    return JSON.parse(raw);
  } catch {
    return [...STARTER_REASONS];
  }
}
export function addStarReason(reason: string) {
  if (typeof window === 'undefined') return;
  const reasons = getStarReasons();
  if (!reasons.includes(reason)) {
    reasons.push(reason);
    localStorage.setItem(REASON_KEY, JSON.stringify(reasons));
  }
}

export function exportLibraryAsJSON(): string {
  if (typeof window === 'undefined') return '{}';
  return JSON.stringify(loadLibrary(), null, 2);
}

export function exportLibraryAsCSV(): string {
  if (typeof window === 'undefined') return '';
  const { items } = loadLibrary();
  if (!items.length) return '';
  const headers = ['id', 'type', 'timestamp', 'folders', 'annotation', 'likeCategory', 'starReason', 'content'];
  const rows = items.map(i => [
    i.id,
    i.type.join(','),
    i.timestamp,
    i.folders.join(','),
    i.annotation || '',
    i.likeCategory || '',
    i.starReason || '',
    JSON.stringify(i.content)
  ]);
  return [headers.join(','), ...rows.map(r => r.map(x => '"' + x.replace(/"/g, '""') + '"').join(','))].join('\n');
} 