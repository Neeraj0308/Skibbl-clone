import { useRef, useEffect, useCallback, useState } from 'react';
import { useGame } from '../../context/GameContext';
import type { DrawStroke } from '../../types';
import './Canvas.css';

const COLORS = [
  '#ffffff', '#000000', '#ef233c', '#f9c74f', '#43e97b',
  '#6c63ff', '#06d6a0', '#ff6584', '#ff9f1c', '#2ec4b6',
  '#e9c46a', '#264653', '#e76f51', '#023e8a', '#7b2d8b',
  '#90e0ef', '#adb5bd', '#6b705c', '#8338ec', '#fb5607',
];

const BRUSH_SIZES = [2, 5, 10, 20, 35];

interface CanvasProps {
  isDrawer: boolean;
}

export default function DrawingCanvas({ isDrawer }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(5);
  const [isEraser, setIsEraser] = useState(false);
  const [tool, setTool] = useState<'brush' | 'eraser' | 'fill'>('brush');

  const { canvasStrokes, sendDrawStart, sendDrawMove, sendDrawEnd, sendClearCanvas, sendUndo } = useGame();

  // Get canvas coordinates relative to canvas element
  const getPos = useCallback((e: MouseEvent | TouchEvent): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX: number, clientY: number;
    if (e instanceof MouseEvent) {
      clientX = e.clientX; clientY = e.clientY;
    } else {
      if (!e.touches[0]) return null;
      clientX = e.touches[0].clientX; clientY = e.touches[0].clientY;
    }
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }, []);

  // Redraw all strokes from state
  const redrawCanvas = useCallback((strokes: DrawStroke[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let currentColor = '#000000';
    let currentSize = 5;
    let drawing = false;

    strokes.forEach((stroke) => {
      if (stroke.type === 'start') {
        ctx.beginPath();
        currentColor = stroke.color || '#000000';
        currentSize = stroke.size || 5;
        ctx.strokeStyle = currentColor;
        ctx.lineWidth = currentSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.moveTo(stroke.x!, stroke.y!);
        drawing = true;
      } else if (stroke.type === 'move' && drawing) {
        ctx.lineTo(stroke.x!, stroke.y!);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(stroke.x!, stroke.y!);
      } else if (stroke.type === 'end') {
        ctx.stroke();
        drawing = false;
      }
    });
  }, []);

  // Redraw whenever strokes change
  useEffect(() => {
    redrawCanvas(canvasStrokes);
  }, [canvasStrokes, redrawCanvas]);

  // Draw dot on start
  const drawDot = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, c: string, s: number) => {
    ctx.beginPath();
    ctx.arc(x, y, s / 2, 0, Math.PI * 2);
    ctx.fillStyle = c;
    ctx.fill();
  }, []);

  // Mouse down
  const handlePointerDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawer) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    e.preventDefault();

    const pos = getPos(e.nativeEvent as MouseEvent | TouchEvent);
    if (!pos) return;

    const activeColor = tool === 'eraser' ? '#ffffff' : color;
    const activeSize = tool === 'eraser' ? brushSize * 3 : brushSize;

    isDrawingRef.current = true;
    lastPosRef.current = pos;

    sendDrawStart(pos.x, pos.y, activeColor, activeSize);

    // Local immediate feedback
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.strokeStyle = activeColor;
      ctx.lineWidth = activeSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(pos.x, pos.y);
      drawDot(ctx, pos.x, pos.y, activeColor, activeSize);
    }
  }, [isDrawer, tool, color, brushSize, getPos, sendDrawStart, drawDot]);

  const handlePointerMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawer || !isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    e.preventDefault();

    const pos = getPos(e.nativeEvent as MouseEvent | TouchEvent);
    if (!pos) return;

    sendDrawMove(pos.x, pos.y);
    lastPosRef.current = pos;

    // Local immediate feedback
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }
  }, [isDrawer, getPos, sendDrawMove]);

  const handlePointerUp = useCallback(() => {
    if (!isDrawer || !isDrawingRef.current) return;
    isDrawingRef.current = false;
    lastPosRef.current = null;
    sendDrawEnd();
  }, [isDrawer, sendDrawEnd]);

  const handleToolChange = (newTool: 'brush' | 'eraser' | 'fill') => {
    setTool(newTool);
    setIsEraser(newTool === 'eraser');
  };

  return (
    <div className="canvas-wrapper" ref={containerRef}>
      <div className="canvas-area">
        <canvas
          ref={canvasRef}
          width={800}
          height={500}
          className={`drawing-canvas ${isDrawer ? (tool === 'eraser' ? 'cursor-eraser' : 'cursor-draw') : 'cursor-watch'}`}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
        />
        {!isDrawer && (
          <div className="canvas-overlay-label">👀 Watching...</div>
        )}
      </div>

      {isDrawer && (
        <div className="drawing-toolbar">
          {/* Tool buttons */}
          <div className="toolbar-section">
            <button
              className={`tool-btn ${tool === 'brush' ? 'active' : ''}`}
              onClick={() => handleToolChange('brush')}
              title="Brush"
            >✏️</button>
            <button
              className={`tool-btn ${tool === 'eraser' ? 'active' : ''}`}
              onClick={() => handleToolChange('eraser')}
              title="Eraser"
            >🧹</button>
          </div>

          {/* Brush sizes */}
          <div className="toolbar-section">
            {BRUSH_SIZES.map((size) => (
              <button
                key={size}
                className={`size-btn ${brushSize === size && tool !== 'eraser' ? 'active' : ''}`}
                onClick={() => { setBrushSize(size); setTool('brush'); }}
                title={`Size ${size}`}
              >
                <div className="size-dot" style={{ width: Math.min(size, 24), height: Math.min(size, 24), background: color }} />
              </button>
            ))}
          </div>

          {/* Colors */}
          <div className="toolbar-section colors-grid">
            {COLORS.map((c) => (
              <button
                key={c}
                className={`color-btn ${color === c && tool !== 'eraser' ? 'active' : ''}`}
                style={{ background: c }}
                onClick={() => { setColor(c); setTool('brush'); }}
                title={c}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="toolbar-section">
            <button className="tool-btn" onClick={sendUndo} title="Undo">↩️</button>
            <button className="tool-btn" onClick={sendClearCanvas} title="Clear canvas">🗑️</button>
          </div>
        </div>
      )}
    </div>
  );
}
