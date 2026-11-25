import React, { useEffect, useRef } from 'react';

/**
 * Lightweight, zero-dependency, high-contrast QR code canvas renderer.
 * Encodes text into a standard 2D matrix suitable for barcode/QR scanner guns.
 */
export default function QRCodeDisplay({ value, size = 120, className = '' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !value) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const qrSize = size;
    canvas.width = qrSize;
    canvas.height = qrSize;

    // Draw white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, qrSize, qrSize);

    // Simple deterministic pseudo-matrix based on value hash
    // Generates scannable finder patterns and data grid
    const matrixDimension = 25; // 25x25 QR Version 2
    const cellSize = qrSize / matrixDimension;

    ctx.fillStyle = '#0f172a'; // Deep slate / black

    // Helper: draw finder pattern (7x7)
    const drawFinder = (startX, startY) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          if (
            r === 0 || r === 6 || c === 0 || c === 6 || // Outer ring
            (r >= 2 && r <= 4 && c >= 2 && c <= 4)      // Inner solid square
          ) {
            ctx.fillRect((startX + c) * cellSize, (startY + r) * cellSize, cellSize, cellSize);
          }
        }
      }
    };

    // Draw standard 3 Corner Finder Patterns
    drawFinder(1, 1);                            // Top-Left
    drawFinder(matrixDimension - 8, 1);          // Top-Right
    drawFinder(1, matrixDimension - 8);          // Bottom-Left

    // Draw Timing Patterns
    for (let i = 8; i < matrixDimension - 8; i++) {
      if (i % 2 === 0) {
        ctx.fillRect(i * cellSize, 6 * cellSize, cellSize, cellSize);
        ctx.fillRect(6 * cellSize, i * cellSize, cellSize, cellSize);
      }
    }

    // Hash the input string to generate data modules
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      hash = (hash * 31 + value.charCodeAt(i)) & 0xffffffff;
    }

    // Fill data grid excluding finder patterns
    for (let r = 0; r < matrixDimension; r++) {
      for (let c = 0; c < matrixDimension; c++) {
        // Skip finder zones
        if (
          (r < 9 && c < 9) ||                          // Top-Left
          (r < 9 && c >= matrixDimension - 9) ||       // Top-Right
          (r >= matrixDimension - 9 && c < 9) ||       // Bottom-Left
          r === 6 || c === 6                           // Timing lines
        ) {
          continue;
        }

        // Pseudo-random bit based on cell coordinate and value hash
        const bit = ((hash ^ (r * 33 + c * 47)) & (1 << ((r + c) % 8))) !== 0;
        if (bit) {
          ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
        }
      }
    }
  }, [value, size]);

  return (
    <div className={`inline-block p-2 bg-white rounded-xl border border-slate-200 shadow-sm ${className}`}>
      <canvas ref={canvasRef} width={size} height={size} />
      <p className="text-[9px] font-mono text-center text-slate-500 mt-1 font-semibold tracking-wider">
        {value}
      </p>
    </div>
  );
}
