// FolderManager: Manage folders (edit, delete, add) for the Library system
// Lists all folders, allows editing names, deleting (with warning), and adding new folders (like/star)
import React, { useState } from 'react';
import {
  getAllFolders,
  addFolder,
  updateFolder,
  removeFolder,
  getAllItems,
  Folder,
  MarkType
} from '../lib/libraryStorage';
import { v4 as uuidv4 } from 'uuid';

interface FolderManagerProps {
  open: boolean;
  onClose: () => void;
}

const FolderManager: React.FC<FolderManagerProps> = ({ open, onClose }) => {
  const [folders, setFolders] = useState<Folder[]>(getAllFolders());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderType, setNewFolderType] = useState<MarkType>('like');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const items = getAllItems();

  const refresh = () => setFolders(getAllFolders());

  const handleEdit = (folder: Folder) => {
    setEditingId(folder.id);
    setEditName(folder.name);
  };
  const handleEditSave = (folder: Folder) => {
    if (!editName.trim()) return;
    updateFolder({ ...folder, name: editName.trim() });
    setEditingId(null);
    setEditName('');
    refresh();
  };
  const handleAddFolder = () => {
    if (!newFolderName.trim()) return;
    addFolder({
      id: uuidv4(),
      name: newFolderName.trim(),
      type: newFolderType,
      createdAt: new Date().toISOString(),
    });
    setNewFolderName('');
    refresh();
  };
  const handleDelete = (id: string) => {
    setDeleteId(id);
  };
  const confirmDelete = (id: string) => {
    removeFolder(id);
    setDeleteId(null);
    refresh();
  };

  if (!open) return null;

  return (
    <div className="fixed top-0 left-0 w-screen h-screen bg-matrix-black/80 z-[3000] flex items-center justify-center">
      <div className="bg-gradient-to-b from-matrix-black to-matrix-dark border border-matrix-green-dark text-matrix-green p-8 rounded-xl min-w-[360px] max-h-[80vh] overflow-y-auto shadow-2xl font-matrix">
        <h2 className="text-2xl font-bold mb-4 text-matrix-green">Manage Folders</h2>
        <div className="mb-6">
          <b className="text-matrix-green">Add New Folder:</b>
          <div className="flex gap-4 mt-3">
            <input
              type="text"
              placeholder="Folder name"
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              className="bg-matrix-dark text-matrix-green border border-matrix-green-dark rounded px-3 py-2 font-matrix flex-1"
            />
            <select value={newFolderType} onChange={e => setNewFolderType(e.target.value as MarkType)} className="bg-matrix-dark text-matrix-green border border-matrix-green-dark rounded px-3 py-2 font-matrix">
              <option value="like">❤️ Like</option>
              <option value="star">⭐ Inquiry</option>
            </select>
            <button onClick={handleAddFolder} className="bg-matrix-green/10 hover:bg-matrix-green/30 text-matrix-green font-bold px-4 py-2 rounded shadow transition-colors">Add</button>
          </div>
        </div>
        <div>
          <b className="text-matrix-green">All Folders:</b>
          {folders.length === 0 && <div className="text-matrix-green-dim mt-2">No folders yet.</div>}
          {folders.map(folder => {
            const itemCount = items.filter(i => i.folders.includes(folder.id)).length;
            return (
              <div key={folder.id} className="flex items-center gap-4 my-2">
                {editingId === folder.id ? (
                  <>
                    <input
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="bg-matrix-dark text-matrix-green border border-matrix-green-dark rounded px-3 py-2 font-matrix flex-1"
                    />
                    <button onClick={() => handleEditSave(folder)} className="bg-matrix-green/10 hover:bg-matrix-green/30 text-matrix-green font-bold px-3 py-1 rounded shadow">Save</button>
                    <button onClick={() => setEditingId(null)} className="bg-matrix-green/10 hover:bg-matrix-green/30 text-matrix-green font-bold px-3 py-1 rounded shadow">Cancel</button>
                  </>
                ) : (
                  <>
                    <span className="flex-1">{folder.name} <span className="text-matrix-green-dim text-xs">({folder.type === 'like' ? '❤️' : '⭐'} {itemCount} item{itemCount !== 1 ? 's' : ''})</span></span>
                    <button onClick={() => handleEdit(folder)} className="bg-matrix-green/10 hover:bg-matrix-green/30 text-matrix-green font-bold px-3 py-1 rounded shadow">Edit</button>
                    <button style={{ color: '#ff4d4d' }} onClick={() => handleDelete(folder.id)} className="bg-matrix-green/10 hover:bg-matrix-green/30 text-matrix-green font-bold px-3 py-1 rounded shadow">Delete</button>
                  </>
                )}
                {/* Delete confirmation */}
                {deleteId === folder.id && (
                  <div className="fixed top-0 left-0 w-screen h-screen bg-matrix-black/80 z-[4000] flex items-center justify-center">
                    <div className="bg-gradient-to-b from-matrix-black to-matrix-dark border border-matrix-green-dark text-matrix-green p-8 rounded-xl min-w-[320px] shadow-2xl font-matrix">
                      <h3 className="text-xl font-bold mb-2 text-matrix-green">Delete Folder</h3>
                      <p className="mb-4">This folder contains {itemCount} item{itemCount !== 1 ? 's' : ''}. Deleting will remove the folder from all items, but not delete the items themselves. Continue?</p>
                      <div className="flex justify-end gap-4">
                        <button onClick={() => setDeleteId(null)} className="bg-matrix-green/10 hover:bg-matrix-green/30 text-matrix-green font-bold px-4 py-2 rounded shadow">Cancel</button>
                        <button style={{ color: '#ff4d4d' }} onClick={() => confirmDelete(folder.id)} className="bg-matrix-green/10 hover:bg-matrix-green/30 text-matrix-green font-bold px-4 py-2 rounded shadow">Delete</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex justify-end mt-8">
          <button onClick={onClose} className="bg-matrix-green/10 hover:bg-matrix-green/30 text-matrix-green font-bold px-6 py-2 rounded shadow">Close</button>
        </div>
      </div>
    </div>
  );
};

export default FolderManager; 