// EditItemModal: Modal for editing a marked item's annotation, category/reason, and folders
import React, { useState } from 'react';
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
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#222', color: '#fff', padding: 24, borderRadius: 8, minWidth: 320 }}>
        <h2>Edit {type === 'like' ? 'Liked' : 'Inquiry'} Item</h2>
        <div style={{ margin: '16px 0' }}>
          <div>Folders:</div>
          {folders.map(folder => (
            <label key={folder.id} style={{ display: 'block', margin: '4px 0' }}>
              <input
                type="checkbox"
                checked={selectedFolders.includes(folder.id)}
                onChange={() => handleFolderToggle(folder.id)}
              />
              {folder.name}
            </label>
          ))}
        </div>
        {type === 'like' && (
          <div style={{ margin: '16px 0' }}>
            <div>Category:</div>
            <select value={likeCategory} onChange={e => setLikeCategory(e.target.value)} style={{ width: '100%', marginBottom: 8 }}>
              <option value="">Select category...</option>
              {likeCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                placeholder="New category"
                value={newLikeCategory}
                onChange={e => setNewLikeCategory(e.target.value)}
                style={{ flex: 1 }}
              />
              <button onClick={handleAddLikeCategory}>+ Add</button>
            </div>
          </div>
        )}
        {type === 'star' && (
          <div style={{ margin: '16px 0' }}>
            <div>Reason:</div>
            <select value={starReason} onChange={e => setStarReason(e.target.value)} style={{ width: '100%', marginBottom: 8 }}>
              <option value="">Select reason...</option>
              {starReasons.map(reason => (
                <option key={reason} value={reason}>{reason}</option>
              ))}
            </select>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                placeholder="New reason"
                value={newStarReason}
                onChange={e => setNewStarReason(e.target.value)}
                style={{ flex: 1 }}
              />
              <button onClick={handleAddStarReason}>+ Add</button>
            </div>
          </div>
        )}
        <div style={{ margin: '16px 0' }}>
          <div>Annotation (optional):</div>
          <textarea
            value={annotation}
            onChange={e => setAnnotation(e.target.value)}
            rows={3}
            style={{ width: '100%' }}
            placeholder={type === 'star' ? 'Why is this interesting? What to investigate?' : 'Why do you like this?'}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose}>Cancel</button>
          <button onClick={handleSubmit} disabled={selectedFolders.length === 0 || (type === 'like' ? !likeCategory : !starReason)}>Save</button>
        </div>
      </div>
    </div>
  );
};

export default EditItemModal; 