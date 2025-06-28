// LibraryPage: Now displays likeCategory and starReason, and allows filtering by these attributes
// Also includes a navigation link to the Library page
// Now supports editing and deleting items with modals/dialogs
// Now supports bulk actions (multi-select, bulk delete/export)
// All logic is encapsulated within this page

'use client';
import React, { useState, useRef, useEffect } from 'react';
import {
  getAllItems,
  getAllFolders,
  exportLibraryAsJSON,
  exportLibraryAsCSV,
  getLikeCategories,
  getStarReasons,
  removeItem,
  MarkedItem,
  Folder,
  MarkType
} from '../../lib/libraryStorage';
import Link from 'next/link';
import EditItemModal from '../../components/EditItemModal';
import FolderManager from '../../components/FolderManager';
import MatrixRain from '../../components/MatrixRain';

const LibraryPage: React.FC = () => {
  // State for library data
  const [items, setItems] = useState<MarkedItem[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [likeCategories, setLikeCategories] = useState<string[]>([]);
  const [starReasons, setStarReasons] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false); // <-- To prevent hydration mismatch

  // State for UI controls
  const [typeFilter, setTypeFilter] = useState<MarkType | 'all'>('all');
  const [folderFilter, setFolderFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [likeCategoryFilter, setLikeCategoryFilter] = useState('all');
  const [starReasonFilter, setStarReasonFilter] = useState('all');
  const [editItem, setEditItem] = useState<MarkedItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<MarkedItem | null>(null);
  // Bulk actions state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const selectAllRef = useRef<HTMLInputElement>(null);
  const [showFolderManager, setShowFolderManager] = useState(false);

  // Load data from localStorage on client-side only
  useEffect(() => {
    setItems(getAllItems());
    setFolders(getAllFolders());
    setLikeCategories(getLikeCategories());
    setStarReasons(getStarReasons());
    setIsLoaded(true); // Mark as loaded
  }, []);

  // Recalculate items when dependencies change
  const refreshItems = () => {
    setItems(getAllItems());
    setFolders(getAllFolders());
  };

  const filteredItems = items.filter(item => {
    const matchesType = typeFilter === 'all' || item.type.includes(typeFilter);
    const matchesFolder = folderFilter === 'all' || item.folders.includes(folderFilter);
    const matchesSearch =
      !search ||
      (item.annotation && item.annotation.toLowerCase().includes(search.toLowerCase())) ||
      JSON.stringify(item.content).toLowerCase().includes(search.toLowerCase());
    const matchesLikeCategory =
      typeFilter !== 'like' && likeCategoryFilter === 'all' ? true :
      typeFilter === 'like' && likeCategoryFilter === 'all' ? true :
      item.likeCategory === likeCategoryFilter || likeCategoryFilter === 'all';
    const matchesStarReason =
      typeFilter !== 'star' && starReasonFilter === 'all' ? true :
      typeFilter === 'star' && starReasonFilter === 'all' ? true :
      item.starReason === starReasonFilter || starReasonFilter === 'all';
    return matchesType && matchesFolder && matchesSearch && matchesLikeCategory && matchesStarReason;
  });

  // Bulk actions logic
  const allFilteredIds = filteredItems.map(i => i.id);
  const allSelected = selectedIds.length === allFilteredIds.length && selectedIds.length > 0;
  const someSelected = selectedIds.length > 0 && !allSelected;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected;
    }
  }, [someSelected, filteredItems.length]);

  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? [] : allFilteredIds);
  };
  const toggleSelectOne = (id: string) => {
    setSelectedIds(ids => ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id]);
  };
  const handleBulkDelete = () => {
    setShowBulkDelete(true);
  };
  const confirmBulkDelete = () => {
    selectedIds.forEach(id => removeItem(id));
    setSelectedIds([]);
    setShowBulkDelete(false);
    refreshItems(); // <-- Refresh data
  };
  const handleBulkExport = (format: 'json' | 'csv') => {
    const selectedItems = items.filter(i => selectedIds.includes(i.id));
    let data = '';
    if (format === 'json') {
      data = JSON.stringify(selectedItems, null, 2);
    } else {
      const headers = ['id', 'type', 'timestamp', 'folders', 'annotation', 'likeCategory', 'starReason', 'content'];
      const rows = selectedItems.map(i => [
        i.id,
        i.type.join(','),
        i.timestamp,
        i.folders.join(','),
        i.annotation || '',
        i.likeCategory || '',
        i.starReason || '',
        JSON.stringify(i.content)
      ]);
      data = [headers.join(','), ...rows.map(r => r.map(x => '"' + x.replace(/"/g, '""') + '"').join(','))].join('\n');
    }
    const blob = new Blob([data], { type: format === 'json' ? 'application/json' : 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `llm-arena-library-bulk.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = (format: 'json' | 'csv') => {
    const data = format === 'json' ? exportLibraryAsJSON() : exportLibraryAsCSV();
    const blob = new Blob([data], { type: format === 'json' ? 'application/json' : 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `llm-arena-library.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = (item: MarkedItem) => {
    removeItem(item.id);
    setDeleteItem(null);
    refreshItems(); // <-- Refresh data
  };

  if (!isLoaded) {
    // Render a loading state or null on the server and initial client render
    return (
      <div className="min-h-screen bg-matrix-black text-matrix-text font-matrix-mono flex items-center justify-center">
        <div className="text-matrix-green text-2xl animate-pulse">Loading Library...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-matrix-black text-matrix-text font-matrix-mono relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <MatrixRain />
      </div>
      <div className="relative z-10 flex flex-col min-h-screen">
        <header className="border-b border-matrix-green-dark bg-gradient-to-r from-matrix-black via-matrix-dark to-matrix-black backdrop-blur-sm">
          <div className="flex justify-between items-center p-6">
            <div className="flex items-center gap-3">
              <img src="/assets/logo.png" alt="LLM Arena Logo" className="h-10 w-10 rounded-full shadow-lg border-2 border-matrix-green bg-matrix-black" style={{ objectFit: 'cover' }} />
              <h1 className="text-3xl font-matrix font-black matrix-title text-matrix-green drop-shadow-lg">LLM ARENA LIBRARY</h1>
            </div>
            <Link href="/" className="inline-flex items-center justify-center rounded-full bg-matrix-green/10 hover:bg-matrix-green/30 transition-colors p-2 ml-2" title="Back to Arena" style={{ fontSize: 28 }}>
              <span role="img" aria-label="Arena">🏟️</span>
            </Link>
          </div>
        </header>
        <main className="flex-1 max-w-5xl mx-auto w-full p-8">
          <div className="matrix-panel p-8 rounded-xl bg-gradient-to-b from-matrix-black to-matrix-dark border border-matrix-green-dark shadow-lg">
            <div className="flex flex-wrap gap-4 mb-8 items-center">
              <button onClick={() => setShowFolderManager(true)} className="bg-matrix-green/10 hover:bg-matrix-green/30 text-matrix-green font-matrix px-4 py-2 rounded shadow transition-colors font-bold">Manage Folders</button>
              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as any)} className="matrix-select bg-matrix-dark text-matrix-green border border-matrix-green-dark rounded px-3 py-2 font-matrix">
                <option value="all">All Types</option>
                <option value="like">❤️ Liked</option>
                <option value="star">⭐ Inquiry</option>
              </select>
              <select value={folderFilter} onChange={e => setFolderFilter(e.target.value)} className="matrix-select bg-matrix-dark text-matrix-green border border-matrix-green-dark rounded px-3 py-2 font-matrix">
                <option value="all">All Folders</option>
                {folders.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
              {typeFilter === 'like' && (
                <select value={likeCategoryFilter} onChange={e => setLikeCategoryFilter(e.target.value)} className="matrix-select bg-matrix-dark text-matrix-green border border-matrix-green-dark rounded px-3 py-2 font-matrix">
                  <option value="all">All Categories</option>
                  {likeCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              )}
              {typeFilter === 'star' && (
                <select value={starReasonFilter} onChange={e => setStarReasonFilter(e.target.value)} className="matrix-select bg-matrix-dark text-matrix-green border border-matrix-green-dark rounded px-3 py-2 font-matrix">
                  <option value="all">All Reasons</option>
                  {starReasons.map(reason => (
                    <option key={reason} value={reason}>{reason}</option>
                  ))}
                </select>
              )}
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="bg-matrix-dark text-matrix-green border border-matrix-green-dark rounded px-3 py-2 font-matrix flex-1 min-w-[120px]"
              />
              <button onClick={() => handleExport('json')} className="bg-matrix-green/10 hover:bg-matrix-green/30 text-matrix-green font-matrix px-4 py-2 rounded shadow transition-colors font-bold">Export JSON</button>
              <button onClick={() => handleExport('csv')} className="bg-matrix-green/10 hover:bg-matrix-green/30 text-matrix-green font-matrix px-4 py-2 rounded shadow transition-colors font-bold">Export CSV</button>
            </div>
            {/* Bulk actions bar */}
            {filteredItems.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
                <input
                  type="checkbox"
                  ref={selectAllRef}
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  style={{ width: 18, height: 18 }}
                />
                <span style={{ color: '#aaa' }}>Select All</span>
                {selectedIds.length > 0 && (
                  <>
                    <span style={{ color: '#ffd700' }}>{selectedIds.length} selected</span>
                    <button onClick={handleBulkDelete} style={{ color: '#ff4d4d' }}>Bulk Delete</button>
                    <button onClick={() => handleBulkExport('json')}>Bulk Export JSON</button>
                    <button onClick={() => handleBulkExport('csv')}>Bulk Export CSV</button>
                  </>
                )}
              </div>
            )}
            <div style={{ marginTop: 24 }}>
              {filteredItems.length === 0 ? (
                <div style={{ color: '#aaa' }}>No items found.</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {filteredItems.map(item => (
                    <div key={item.id} style={{ background: '#232323', borderRadius: 8, padding: 16, minHeight: 120, position: 'relative' }}>
                      {/* Bulk select checkbox */}
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(item.id)}
                        onChange={() => toggleSelectOne(item.id)}
                        style={{ position: 'absolute', top: 8, left: 8, width: 18, height: 18 }}
                      />
                      <div style={{ fontSize: 18, marginBottom: 8, marginLeft: 32 }}>
                        {item.type.includes('like') && <span title="Liked">❤️</span>}
                        {item.type.includes('star') && <span title="Inquiry">⭐</span>}
                        <span style={{ marginLeft: 8, color: '#aaa', fontSize: 12 }}>{new Date(item.timestamp).toLocaleString()}</span>
                      </div>
                      <div style={{ fontSize: 14, marginBottom: 8, marginLeft: 32 }}>
                        <b>Folders:</b> {item.folders.map(fid => folders.find(f => f.id === fid)?.name).filter(Boolean).join(', ') || 'None'}
                      </div>
                      {item.type.includes('like') && item.likeCategory && (
                        <div style={{ color: '#00e6e6', marginBottom: 8, marginLeft: 32 }}>
                          <b>Category:</b> {item.likeCategory}
                        </div>
                      )}
                      {item.type.includes('star') && item.starReason && (
                        <div style={{ color: '#ffd700', marginBottom: 8, marginLeft: 32 }}>
                          <b>Reason:</b> {item.starReason}
                        </div>
                      )}
                      {item.annotation && (
                        <div style={{ fontStyle: 'italic', color: '#ffd700', marginBottom: 8, marginLeft: 32 }}>
                          {item.annotation}
                        </div>
                      )}
                      <pre style={{ background: '#111', color: '#fff', padding: 8, borderRadius: 4, fontSize: 12, maxHeight: 120, overflow: 'auto', marginLeft: 32 }}>
                        {JSON.stringify(item.content, null, 2)}
                      </pre>
                      {/* Edit/Delete buttons */}
                      <div className="absolute top-2 right-2 flex gap-2">
                        <button onClick={() => setEditItem(item)} title="Edit Item" className="text-blue-400 hover:text-blue-300">
                          ✏️
                        </button>
                        <button onClick={() => setDeleteItem(item)} title="Delete Item" className="text-red-400 hover:text-red-300">
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* Edit modal */}
            {editItem && (
              <EditItemModal
                open={!!editItem}
                item={editItem}
                onClose={() => {
                  setEditItem(null);
                  // Force re-render, not ideal but works for now
                  window.location.reload();
                }}
              />
            )}
            {/* Delete confirmation dialog */}
            {deleteItem && (
              <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
                <div className="bg-matrix-dark border border-matrix-green-dark rounded-lg shadow-2xl p-8 max-w-sm w-full font-matrix">
                  <h3 className="text-xl font-bold text-matrix-green mb-4">Delete Item</h3>
                  <p className="text-matrix-text mb-6">Are you sure you want to delete this item? This action cannot be undone.</p>
                  <div className="flex justify-end gap-4">
                    <button onClick={() => setDeleteItem(null)} className="bg-matrix-green/10 hover:bg-matrix-green/30 text-matrix-green font-bold px-6 py-2 rounded shadow">Cancel</button>
                    <button onClick={() => handleDelete(deleteItem)} className="bg-red-500/20 hover:bg-red-500/40 text-red-400 font-bold px-6 py-2 rounded shadow">Delete</button>
                  </div>
                </div>
              </div>
            )}
            {/* Bulk delete confirmation dialog */}
            {showBulkDelete && (
              <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
                <div className="bg-matrix-dark border border-matrix-green-dark rounded-lg shadow-2xl p-8 max-w-sm w-full font-matrix">
                  <h3>Bulk Delete</h3>
                  <p>Are you sure you want to delete {selectedIds.length} items? This cannot be undone.</p>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button onClick={() => setShowBulkDelete(false)}>Cancel</button>
                    <button style={{ color: '#ff4d4d' }} onClick={confirmBulkDelete}>Delete All</button>
                  </div>
                </div>
              </div>
            )}
            {/* FolderManager modal */}
            {showFolderManager && <FolderManager open={showFolderManager} onClose={() => setShowFolderManager(false)} />}
          </div>
        </main>
      </div>
    </div>
  );
};

export default LibraryPage; 