// App.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PixelData } from './types';
import PixelGrid from './components/PixelGrid';

const TOTAL_PIXELS = 1_000_000;
const GRID_WIDTH = 1000;
const PIXEL_PRICE = 1; // $1 per pixel

const CELL_SIZE = 1; // pixels per cell (adjust if PixelGrid renders larger cells)

interface Receipt {
  pixelId: number;
  color: string;
  link: string;
  price: number;
  purchaseDate: string;
  transactionId: string;
}

interface SearchResult {
  id: number;
  data: PixelData | null;
}

// Receipt Modal Component
const ReceiptModal: React.FC<{ receipt: Receipt | null; onClose: () => void; onDownload: () => void }> = ({ receipt, onClose, onDownload }) => {
  if (!receipt) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose} aria-hidden>
      <div role="dialog" aria-modal="true" aria-label="Purchase receipt" className="bg-white text-gray-900 rounded-lg shadow-xl p-8 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="text-center mb-6">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-3xl font-bold mb-2">Purchase Successful!</h2>
          <p className="text-gray-600">Your pixel is now immortalized on the grid</p>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-6 mb-6 border-2 border-dashed border-gray-300">
          <h3 className="font-bold text-lg mb-4 text-center">Receipt</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Pixel ID:</span>
              <span className="font-mono font-bold">#{receipt.pixelId}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Color:</span>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded border-2 border-gray-300" style={{ backgroundColor: receipt.color }}></div>
                <span className="font-mono">{receipt.color}</span>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Link:</span>
              <span className="font-mono text-xs truncate max-w-[200px]">{receipt.link}</span>
            </div>
            <div className="border-t border-gray-300 pt-3 mt-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Price:</span>
                <span className="font-bold text-green-600">${receipt.price.toFixed(2)}</span>
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-gray-600">Date:</span>
                <span className="text-xs">{receipt.purchaseDate}</span>
              </div>
              <div className="flex justify-between mt-2">
                <span classNam
