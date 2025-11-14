// LibraryPage: Displays saved debates and Oracle analyses
// Features: Collapsible debate cards, bulk actions (multi-select, delete, export)
// Removed: Folder system, edit functionality (debates are read-only)
// Delete is localStorage-only (no Supabase deletion)
// UI FIX: Debate titles now truncate to 80 chars when collapsed, show full on hover and when expanded

'use client';
import React, { useState, useRef, useEffect } from 'react';
import {
  getAllItems,
  exportLibraryAsJSON,
  exportLibraryAsCSV,
  getLikeCategories,
  getStarReasons,
  removeItem,
  MarkedItem,
  MarkType
} from '../../lib/libraryStorage';
import Link from 'next/link';
import MatrixRain from '../../components/MatrixRain';
import type { OracleResult } from '@/types/oracle';
import OracleResultsPanel from '@/components/OracleResultsPanel';
import { motion, AnimatePresence } from 'framer-motion';
import { PERSONAS } from '@/lib/personas';
import { getModelDisplayName } from '@/lib/modelConfigs';

const LibraryPage: React.FC = () => {
  // State for library data
  const [items, setItems] = useState<MarkedItem[]>([]);
  const [likeCategories, setLikeCategories] = useState<string[]>([]);
  const [starReasons, setStarReasons] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false); // <-- To prevent hydration mismatch
  const [activeView, setActiveView] = useState<'debates' | 'chats' | 'oracle'>('debates');
  const [chatSessions, setChatSessions] = useState<any[]>([]);
  const [oracleResults, setOracleResults] = useState<OracleResult[]>([]);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set()); // Track expanded debate cards

  // State for UI controls
  const [typeFilter, setTypeFilter] = useState<MarkType | 'all'>('all');
  const [search, setSearch] = useState('');
  const [likeCategoryFilter, setLikeCategoryFilter] = useState('all');
  const [starReasonFilter, setStarReasonFilter] = useState('all');
  const [deleteItem, setDeleteItem] = useState<MarkedItem | null>(null);
  // Bulk actions state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const selectAllRef = useRef<HTMLInputElement>(null);

  // Load data from localStorage on client-side only
  useEffect(() => {
    setItems(getAllItems());
    setLikeCategories(getLikeCategories());
    setStarReasons(getStarReasons());
    
    // Load Oracle results from localStorage
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('llm-arena-oracle-results');
        if (stored) {
          const parsed = JSON.parse(stored);
          const results = parsed.map((r: any) => ({
            ...r,
            timestamp: new Date(r.timestamp)
          }));
          setOracleResults(results);
        }
      } catch (error) {
        console.error('Failed to load Oracle results:', error);
      }
    }
    
    // Load chat sessions from API
    const loadChatSessions = async () => {
      try {
        const response = await fetch('/api/chat/sessions/list', {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setChatSessions(data.sessions || []);
          }
        }
      } catch (error) {
        console.error('Failed to load chat sessions:', error);
      }
    };
    
    loadChatSessions();
    setIsLoaded(true); // Mark as loaded
  }, []);

  // Recalculate items when dependencies change
  const refreshItems = () => {
    setItems(getAllItems());
  };

  // Toggle expanded state for debate cards
  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const filteredItems = items.filter(item => {
    const matchesType = typeFilter === 'all' || item.type.includes(typeFilter);
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
    return matchesType && matchesSearch && matchesLikeCategory && matchesStarReason;
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
      const headers = ['id', 'type', 'timestamp', 'annotation', 'likeCategory', 'starReason', 'content'];
      const rows = selectedItems.map(i => [
        i.id,
        i.type.join(','),
        i.timestamp,
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
        <header className="sticky top-0 z-50 border-b border-matrix-green-dark bg-gradient-to-r from-matrix-black via-matrix-dark to-matrix-black backdrop-blur-sm">
          <div className="flex justify-between items-center p-6">
            <div className="flex items-center gap-3">
              <img src="/assets/logo.png" alt="Matrix Arena Logo" className="h-10 w-10 rounded-full shadow-lg border-2 border-matrix-green bg-matrix-black" style={{ objectFit: 'cover' }} />
              <h1 className="text-3xl font-matrix font-black matrix-title text-matrix-green drop-shadow-lg">MATRIX ARENA LIBRARY</h1>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/" className="inline-flex items-center justify-center rounded-full bg-matrix-green/10 hover:bg-matrix-green/30 transition-colors p-2 ml-2" title="Back to Arena" style={{ fontSize: 28 }}>
                <span role="img" aria-label="Arena">🏟️</span>
              </Link>
              <Link href="/chat" className="inline-flex items-center justify-center rounded-full bg-matrix-green/10 hover:bg-matrix-green/30 transition-colors p-2 ml-2" title="Character Chat" style={{ fontSize: 28 }}>
                <span role="img" aria-label="Chat">💬</span>
              </Link>
              <Link href="/library" className="inline-flex items-center justify-center rounded-full bg-matrix-green/10 hover:bg-matrix-green/30 transition-colors p-2 ml-2" title="Open Library" style={{ fontSize: 28 }}>
                <span role="img" aria-label="Library">📚</span>
              </Link>
            </div>
          </div>
        </header>
        <main className="flex-1 max-w-5xl mx-auto w-full p-8">
          <div className="matrix-panel p-8 rounded-xl bg-gradient-to-b from-matrix-black to-matrix-dark border border-matrix-green-dark shadow-lg">
            {/* View Toggle: Debates vs Chat Sessions vs Oracle Analyses */}
            <div className="flex gap-2 mb-6 border-b border-matrix-green-dark pb-4">
              <motion.button
                onClick={() => setActiveView('debates')}
                className={`px-6 py-3 font-matrix tracking-wider transition-all duration-200 ${
                  activeView === 'debates'
                    ? 'bg-matrix-green/20 text-matrix-green border-b-2 border-matrix-green'
                    : 'text-matrix-green-dim hover:text-matrix-green hover:bg-matrix-green/10'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                📚 DEBATES
              </motion.button>
              <motion.button
                onClick={() => setActiveView('chats')}
                className={`px-6 py-3 font-matrix tracking-wider transition-all duration-200 ${
                  activeView === 'chats'
                    ? 'bg-matrix-green/20 text-matrix-green border-b-2 border-matrix-green'
                    : 'text-matrix-green-dim hover:text-matrix-green hover:bg-matrix-green/10'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                💬 CHAT SESSIONS
                {chatSessions.length > 0 && (
                  <span className="ml-2 bg-blue-500 text-white text-xs rounded-full px-2 py-1">
                    {chatSessions.length}
                  </span>
                )}
              </motion.button>
              <motion.button
                onClick={() => setActiveView('oracle')}
                className={`px-6 py-3 font-matrix tracking-wider transition-all duration-200 ${
                  activeView === 'oracle'
                    ? 'bg-matrix-green/20 text-matrix-green border-b-2 border-matrix-green'
                    : 'text-matrix-green-dim hover:text-matrix-green hover:bg-matrix-green/10'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                🔮 ORACLE ANALYSES
                {oracleResults.length > 0 && (
                  <span className="ml-2 bg-purple-500 text-white text-xs rounded-full px-2 py-1">
                    {oracleResults.length}
                  </span>
                )}
              </motion.button>
            </div>
            
            {activeView === 'debates' ? (
              <>
                <div className="flex flex-wrap gap-4 mb-8 items-center">
              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as any)} className="matrix-select bg-matrix-dark text-matrix-green border border-matrix-green-dark rounded px-3 py-2 font-matrix">
                <option value="all">All Types</option>
                <option value="like">❤️ Liked</option>
                <option value="star">⭐ Inquiry</option>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredItems.map(item => {
                    const isExpanded = expandedItems.has(item.id);
                    const topicTitle = item.content.topic || item.annotation || 'Untitled Debate';
                    // Truncate title when collapsed - show full when expanded
                    const displayTitle = !isExpanded && topicTitle.length > 80 
                      ? topicTitle.substring(0, 80) + '...' 
                      : topicTitle;
                    
                    return (
                      <motion.div 
                        key={item.id} 
                        className="matrix-panel bg-gradient-to-br from-matrix-dark to-matrix-black border border-matrix-green-dark rounded-lg p-4 position-relative max-w-full"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        {/* Bulk select checkbox */}
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item.id)}
                          onChange={() => toggleSelectOne(item.id)}
                          className="absolute top-2 left-2 w-4 h-4"
                          onClick={(e) => e.stopPropagation()}
                        />
                        
                        {/* Collapsible Header - Topic + Metadata */}
                        <motion.button
                          onClick={() => toggleExpanded(item.id)}
                          className="w-full text-left flex items-center justify-between gap-2 pb-3 border-b border-matrix-green-dark/30"
                          whileHover={{ scale: 1.01 }}
                        >
                          <div className="flex-1 flex items-center gap-2 min-w-0">
                            <span 
                              className="text-matrix-green text-lg font-matrix tracking-wider truncate block"
                              title={topicTitle}
                            >
                              {item.type.includes('like') && <span title="Liked">❤️</span>}
                              {item.type.includes('star') && <span title="Inquiry">⭐</span>}
                              {' '}
                              {displayTitle}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <span className="text-xs text-matrix-green-dim">
                              {new Date(item.timestamp).toLocaleDateString()}
                            </span>
                            <motion.span 
                              className="text-matrix-green-dim"
                              animate={{ rotate: isExpanded ? 180 : 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              ▼
                            </motion.span>
                          </div>
                        </motion.button>

                        {/* Expanded Content */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.3 }}
                              className="mt-4 space-y-4"
                            >
                              {item.type.includes('like') && item.likeCategory && (
                                <div className="text-matrix-green-dim text-sm">
                                  <b className="text-matrix-green">Category:</b> {item.likeCategory}
                                </div>
                              )}
                              {item.type.includes('star') && item.starReason && (
                                <div className="text-matrix-green-dim text-sm">
                                  <b className="text-matrix-green">Reason:</b> {item.starReason}
                                </div>
                              )}
                              {item.annotation && (
                                <div className="italic text-matrix-green-dim text-sm border-l-2 border-matrix-green/30 pl-3">
                                  {item.annotation}
                                </div>
                              )}
                              
                              {/* Debate Details */}
                              <div className="bg-matrix-black border border-matrix-green-dark/30 rounded p-3 space-y-2 text-sm font-mono">
                                {item.content.topic && (
                                  <div>
                                    <span className="text-matrix-green font-bold">Topic:</span> {item.content.topic}
                                  </div>
                                )}
                                {item.content.modelA && (
                                  <div>
                                    <span className="text-matrix-green font-bold">Model A:</span> {item.content.modelA.displayName || item.content.modelA.name}
                                    {item.content.modelA.config && (
                                      <span className="text-matrix-green-dim ml-2">
                                        ({item.content.modelA.config.position}, Agreeability: {item.content.modelA.config.agreeabilityLevel}/10)
                                      </span>
                                    )}
                                  </div>
                                )}
                                {item.content.modelB && (
                                  <div>
                                    <span className="text-matrix-green font-bold">Model B:</span> {item.content.modelB.displayName || item.content.modelB.name}
                                    {item.content.modelB.config && (
                                      <span className="text-matrix-green-dim ml-2">
                                        ({item.content.modelB.config.position}, Agreeability: {item.content.modelB.config.agreeabilityLevel}/10)
                                      </span>
                                    )}
                                  </div>
                                )}
                                {item.content.totalTurns !== undefined && (
                                  <div>
                                    <span className="text-matrix-green font-bold">Turns:</span> {item.content.totalTurns} / {item.content.maxTurns}
                                  </div>
                                )}
                                {item.content.messages && (
                                  <div>
                                    <span className="text-matrix-green font-bold">Messages:</span> {item.content.messages.length} total
                                  </div>
                                )}
                                {!item.content.topic && !item.content.modelA && (
                                  <pre className="text-xs whitespace-pre-wrap">
                                    {JSON.stringify(item.content, null, 2)}
                                  </pre>
                                )}
                              </div>
                              
                              {/* Delete button - only shown when expanded */}
                              <div className="flex justify-end pt-2">
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteItem(item);
                                  }}
                                  className="bg-red-500/20 hover:bg-red-500/40 text-red-400 font-matrix px-4 py-2 rounded shadow transition-colors text-sm"
                                >
                                  🗑️ Delete
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
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
              </>
            ) : (
              /* Oracle Analyses View */
              <div className="space-y-4">
                {oracleResults.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-4xl text-matrix-green-dim mb-4">🔮</div>
                    <h3 className="text-lg font-matrix text-matrix-green-dim mb-2">NO ORACLE ANALYSES</h3>
                    <p className="text-sm text-matrix-green-dim max-w-xs mx-auto">
                      Run Oracle analyses in the Arena to see them here
                    </p>
                    <Link href="/" className="mt-4 inline-block text-matrix-green hover:text-matrix-green-dim font-matrix tracking-wider">
                      → GO TO ARENA
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {oracleResults.slice().reverse().map((result) => (
                      <OracleResultsPanel key={result.id} result={result} />
                    ))}
                  </div>
                )}
              </div>
            )}
            {activeView === 'chats' && (
              <div>
                <h2 className="text-2xl font-matrix font-bold text-matrix-green mb-6 tracking-wider">
                  CHAT SESSIONS
                </h2>
                {chatSessions.length === 0 ? (
                  <p className="text-matrix-green-dim text-center py-8">
                    No chat sessions saved yet. Start a conversation in Character Chat to save sessions here.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {chatSessions.map((session) => (
                      <motion.div
                        key={session.id}
                        whileHover={{ scale: 1.02 }}
                        className="p-4 rounded-lg border-2 border-matrix-green/30 bg-matrix-dark hover:border-matrix-green cursor-pointer"
                        onClick={() => window.location.href = `/chat/${session.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-matrix font-bold text-matrix-green">
                              {PERSONAS[session.configuration.personaId]?.name || 'Unknown Persona'}
                            </h3>
                            <p className="text-sm text-matrix-green-dim">
                              {getModelDisplayName(session.configuration.modelName)} • {session.messageCount} messages
                            </p>
                            <p className="text-xs text-matrix-green-dim mt-1">
                              {new Date(session.createdAt).toLocaleString()}
                            </p>
                          </div>
                          <span className="text-matrix-green">→</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default LibraryPage; 