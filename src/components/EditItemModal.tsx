// EditItemModal: Modal for editing a marked item's annotation, category/reason, and folders
// UI UPDATE: Restyled to match Matrix theme with dark background and green accents
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  getAllFolders,
  updateItem,
  MarkedItem,
  MarkType,
  getLikeCategories,
  addLikeCategory,
  getStarReasons,
  addStarReason,
  Folder
} from '../lib/libraryStorage';

interface EditItemModalProps {
  open: boolean;
  item: MarkedItem;
  onClose: () => void;
}

const EditItemModal: React.FC<EditItemModalProps> = ({ open, item, onClose }) => {
  const [selectedFolders, setSelectedFolders] = useState<string[]>(item.folders);
  const [annotation, setAnnotation] = useState(item.annotation || '');
  const [likeCategory, setLikeCategory] = useState(item.likeCategory || '');
  const [newLikeCategory, setNewLikeCategory] = useState('');
  const [starReason, setStarReason] = useState(item.starReason || '');
  const [newStarReason, setNewStarReason] = useState('');

  if (!open) return null;

  const type = item.type[0] as MarkType;
  const folders = getAllFolders().filter(f => f.type === type);
  const likeCategories = getLikeCategories();
  const starReasons = getStarReasons();

  const handleFolderToggle = (id: string) => {
    setSelectedFolders(folders =>
      folders.includes(id) ? folders.filter(fid => fid !== id) : [...folders, id]
    );
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
    updateItem({
      ...item,
      folders: selectedFolders,
      annotation: annotation.trim() || undefined,
      likeCategory: type === 'like' ? likeCategory : undefined,
      starReason: type === 'star' ? starReason : undefined,
    });
    onClose();
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-matrix-black bg-opacity-90 backdrop-blur-sm flex items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -50, opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-matrix-dark border border-matrix-green-dark p-8 rounded-lg shadow-lg min-w-[400px] max-w-[600px] w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-matrix text-matrix-green mb-6 tracking-wider">
          EDIT {type === 'like' ? 'LIKED' : 'INQUIRY'} ITEM
        </h2>
        <div className="mb-6">
          <div className="text-matrix-green font-matrix mb-3 text-sm tracking-wider">FOLDERS:</div>
          <div className="space-y-2">
            {folders.map(folder => (
              <label key={folder.id} className="flex items-center gap-2 cursor-pointer hover:bg-matrix-green/5 p-2 rounded">
                <input
                  type="checkbox"
                  checked={selectedFolders.includes(folder.id)}
                  onChange={() => handleFolderToggle(folder.id)}
                  className="w-4 h-4 bg-matrix-black border-matrix-green-dark text-matrix-green focus:ring-matrix-green focus:ring-2 rounded"
                />
                <span className="text-matrix-text font-matrix-mono">{folder.name}</span>
              </label>
            ))}
          </div>
        </div>
        {type === 'like' && (
          <div className="mb-6">
            <div className="text-matrix-green font-matrix mb-3 text-sm tracking-wider">CATEGORY:</div>
            <select 
              value={likeCategory} 
              onChange={e => setLikeCategory(e.target.value)} 
              className="w-full bg-matrix-black border border-matrix-green-dark text-matrix-green placeholder-matrix-green-dim p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-matrix-green font-matrix-mono mb-3"
            >
              <option value="">Select category...</option>
              {likeCategories.map(cat => (
                <option key={cat} value={cat} className="bg-matrix-black text-matrix-green">{cat}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="New category"
                value={newLikeCategory}
                onChange={e => setNewLikeCategory(e.target.value)}
                className="flex-1 bg-matrix-black border border-matrix-green-dark text-matrix-green placeholder-matrix-green-dim p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-matrix-green font-matrix-mono"
              />
              <button 
                onClick={handleAddLikeCategory}
                className="bg-matrix-green text-matrix-black font-matrix px-4 py-2 rounded-md hover:bg-opacity-80 transition-colors tracking-wider"
              >
                + ADD
              </button>
            </div>
          </div>
        )}
        {type === 'star' && (
          <div className="mb-6">
            <div className="text-matrix-green font-matrix mb-3 text-sm tracking-wider">REASON:</div>
            <select 
              value={starReason} 
              onChange={e => setStarReason(e.target.value)} 
              className="w-full bg-matrix-black border border-matrix-green-dark text-matrix-green placeholder-matrix-green-dim p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-matrix-green font-matrix-mono mb-3"
            >
              <option value="">Select reason...</option>
              {starReasons.map(reason => (
                <option key={reason} value={reason} className="bg-matrix-black text-matrix-green">{reason}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="New reason"
                value={newStarReason}
                onChange={e => setNewStarReason(e.target.value)}
                className="flex-1 bg-matrix-black border border-matrix-green-dark text-matrix-green placeholder-matrix-green-dim p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-matrix-green font-matrix-mono"
              />
              <button 
                onClick={handleAddStarReason}
                className="bg-matrix-green text-matrix-black font-matrix px-4 py-2 rounded-md hover:bg-opacity-80 transition-colors tracking-wider"
              >
                + ADD
              </button>
            </div>
          </div>
        )}
        <div className="mb-6">
          <div className="text-matrix-green font-matrix mb-3 text-sm tracking-wider">ANNOTATION (OPTIONAL):</div>
          <textarea
            value={annotation}
            onChange={e => setAnnotation(e.target.value)}
            rows={3}
            className="w-full bg-matrix-black border border-matrix-green-dark text-matrix-green placeholder-matrix-green-dim p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-matrix-green font-matrix-mono resize-none"
            placeholder={type === 'star' ? 'Why is this interesting? What to investigate?' : 'Why do you like this?'}
          />
        </div>
        <div className="flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="bg-matrix-black border border-matrix-green-dark text-matrix-green font-matrix px-6 py-2 rounded-md hover:bg-matrix-green/10 transition-colors tracking-wider"
          >
            CANCEL
          </button>
          <button 
            onClick={handleSubmit} 
            disabled={selectedFolders.length === 0 || (type === 'like' ? !likeCategory : !starReason)}
            className="bg-matrix-green text-matrix-black font-matrix px-6 py-2 rounded-md hover:bg-opacity-80 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed tracking-wider"
          >
            SAVE
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default EditItemModal; 