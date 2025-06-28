// MarkButton component: displays heart/star buttons, opens MarkModal for folder selection and annotation
import React, { useState } from 'react';
import MarkModal from './MarkModal';

interface MarkButtonProps {
  item: any; // DebateMessage | OracleResult | Debate
}

const MarkButton: React.FC<MarkButtonProps> = ({ item }) => {
  const [modalType, setModalType] = useState<'like' | 'star' | null>(null);

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <button
        aria-label="Like"
        style={{ fontSize: 24, color: 'crimson', background: 'none', border: 'none', cursor: 'pointer' }}
        onClick={() => setModalType('like')}
      >
        ❤️
      </button>
      <button
        aria-label="Star/Inquiry"
        style={{ fontSize: 24, color: 'gold', background: 'none', border: 'none', cursor: 'pointer' }}
        onClick={() => setModalType('star')}
      >
        ⭐
      </button>
      {modalType && (
        <MarkModal
          open={!!modalType}
          type={modalType}
          item={item}
          onClose={() => setModalType(null)}
        />
      )}
    </div>
  );
};

export default MarkButton; 