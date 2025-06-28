'use client';

// MarkModal: Overlay background is now fully opaque black for maximum clarity
// Shows dropdown for category/reason, allows adding new, and saves with the marked item
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import {
  getAllFolders,
  addFolder,
  addItem,
  MarkType,
  MarkedItem,
  Folder,
  getLikeCategories,
  addLikeCategory,
  getStarReasons,
  addStarReason
} from '../lib/libraryStorage';

interface MarkModalProps {
  open: boolean;
  type: MarkType;
  item: any;
  onClose: () => void;
}

const MarkModal: React.FC<MarkModalProps> = ({ open, type, item, onClose }) => {
  const [selectedFolders, setSelectedFolders] = useState<string[]>([]);
  const [newFolderName, setNewFolderName] = useState('');
  const [annotation, setAnnotation] = useState('');
  const [likeCategory, setLikeCategory] = useState('');
  const [newLikeCategory, setNewLikeCategory] = useState('');
  const [starReason, setStarReason] = useState('');
  const [newStarReason, setNewStarReason] = useState('');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!open) return null;

  const folders = getAllFolders().filter(f => f.type === type);
  const likeCategories = getLikeCategories();
  const starReasons = getStarReasons();

  const handleFolderToggle = (id: string) => {
    setSelectedFolders(folders =>
      folders.includes(id) ? folders.filter(fid => fid !== id) : [...folders, id]
    );
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    const newFolder: Folder = {
      id: uuidv4(),
      name: newFolderName.trim(),
      type,
      createdAt: new Date().toISOString(),
    };
    addFolder(newFolder);
    setSelectedFolders(folders => [...folders, newFolder.id]);
    setNewFolderName('');
  };

  const handleAddLikeCategory = () => {
    if (!newLikeCategory.trim()) return;
    addLikeCategory(newLikeCategory.trim());
    setLikeCategory(newLikeCategory.trim());
    setNewLikeCategory('');
  };

  const handleAddStarReason = () => {
    if (!newStarReason.trim()) return;
    addStarReason(newStarReason.trim());
    setStarReason(newStarReason.trim());
    setNewStarReason('');
  };

  const handleSubmit = () => {
    const markedItem: MarkedItem = {
      id: uuidv4(),
      type: [type],
      content: item,
      timestamp: new Date().toISOString(),
      folders: selectedFolders,
      annotation: annotation.trim() || undefined,
      likeCategory: type === 'like' ? likeCategory : undefined,
      starReason: type === 'star' ? starReason : undefined,
    };
    addItem(markedItem);
    toast.success('Saved to Library!');
    onClose();
  };

  if (!isClient) {
    return null;
  }

  return createPortal(
    <div className="fixed top-0 left-0 w-screen h-screen bg-black bg-opacity-80 z-[1000] flex items-center justify-center p-4">
      <div className="bg-gradient-to-b from-matrix-black to-matrix-dark border border-matrix-green-dark text-matrix-green rounded-xl shadow-2xl font-matrix w-full max-w-lg flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-matrix-green/20">
          <h2 className="text-2xl font-bold text-matrix-green">{type === 'like' ? 'Add to Liked Folders' : 'Add to Inquiry Folders'}</h2>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto min-h-0">
          <div className="mb-6">
            <div className="mb-2 text-matrix-green">Folders:</div>
            {folders.map(folder => (
              <label key={folder.id} className="block mb-1 text-matrix-green flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedFolders.includes(folder.id)}
                  onChange={() => handleFolderToggle(folder.id)}
                  className="accent-matrix-green"
                />
                {folder.name}
              </label>
            ))}
            <div className="flex gap-3 mt-3">
              <input
                type="text"
                placeholder="New folder name"
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                className="bg-matrix-dark text-matrix-green border border-matrix-green-dark rounded px-3 py-2 font-matrix flex-1"
              />
              <button onClick={handleCreateFolder} className="bg-matrix-green/10 hover:bg-matrix-green/30 text-matrix-green font-bold px-4 py-2 rounded shadow transition-colors">+ Create Folder</button>
            </div>
          </div>
          {type === 'like' && (
            <div className="mb-6">
              <div className="mb-2 text-matrix-green">Category:</div>
              <select value={likeCategory} onChange={e => setLikeCategory(e.target.value)} className="matrix-select bg-matrix-dark text-matrix-green border border-matrix-green-dark rounded px-3 py-2 font-matrix w-full mb-2">
                <option value="">Select category...</option>
                {likeCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="New category"
                  value={newLikeCategory}
                  onChange={e => setNewLikeCategory(e.target.value)}
                  className="bg-matrix-dark text-matrix-green border border-matrix-green-dark rounded px-3 py-2 font-matrix flex-1"
                />
                <button onClick={handleAddLikeCategory} className="bg-matrix-green/10 hover:bg-matrix-green/30 text-matrix-green font-bold px-4 py-2 rounded shadow transition-colors">+ Add</button>
              </div>
            </div>
          )}
          {type === 'star' && (
            <div className="mb-6">
              <div className="mb-2 text-matrix-green">Reason:</div>
              <select value={starReason} onChange={e => setStarReason(e.target.value)} className="matrix-select bg-matrix-dark text-matrix-green border border-matrix-green-dark rounded px-3 py-2 font-matrix w-full mb-2">
                <option value="">Select reason...</option>
                {starReasons.map(reason => (
                  <option key={reason} value={reason}>{reason}</option>
                ))}
              </select>
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="New reason"
                  value={newStarReason}
                  onChange={e => setNewStarReason(e.target.value)}
                  className="bg-matrix-dark text-matrix-green border border-matrix-green-dark rounded px-3 py-2 font-matrix flex-1"
                />
                <button onClick={handleAddStarReason} className="bg-matrix-green/10 hover:bg-matrix-green/30 text-matrix-green font-bold px-4 py-2 rounded shadow transition-colors">+ Add</button>
              </div>
            </div>
          )}
          <div className="mb-6">
            <div className="mb-2 text-matrix-green">Annotation (optional):</div>
            <textarea
              value={annotation}
              onChange={e => setAnnotation(e.target.value)}
              rows={3}
              className="bg-matrix-dark text-matrix-green border border-matrix-green-dark rounded px-3 py-2 font-matrix w-full"
              placeholder={type === 'star' ? 'Why is this interesting? What to investigate?' : 'Why do you like this?'}
            />
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-6 border-t border-matrix-green/20 flex justify-end gap-4">
          <button onClick={onClose} className="bg-matrix-green/10 hover:bg-matrix-green/30 text-matrix-green font-bold px-6 py-2 rounded shadow">Cancel</button>
          <button onClick={handleSubmit} disabled={selectedFolders.length === 0 || (type === 'like' ? !likeCategory : !starReason)} className="bg-matrix-green/10 hover:bg-matrix-green/30 text-matrix-green font-bold px-6 py-2 rounded shadow disabled:opacity-50">Save</button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default MarkModal; 