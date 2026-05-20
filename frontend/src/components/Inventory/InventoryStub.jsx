import React from 'react'

export default function InventoryStub({ onBack }) {
  return (
    <div style={{ padding: 24 }}>
      <h2>Inventory</h2>
      <p>This is a placeholder. Inventory UI + QR flow will be implemented next.</p>
      <button onClick={onBack}>Back</button>
    </div>
  )
}

