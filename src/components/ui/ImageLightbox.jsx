import { useState, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, Download, ExternalLink } from 'lucide-react';

/**
 * In-page image lightbox / zoom viewer.
 * Renders an overlay with zoom, rotate, and pan controls.
 * Stays on the same page — never navigates away.
 */
export default function ImageLightbox({ src, alt = 'Receipt preview', onClose }) {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Close on Escape key
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === '+' || e.key === '=') setScale((s) => Math.min(s + 0.25, 5));
      if (e.key === '-') setScale((s) => Math.max(s - 0.25, 0.25));
      if (e.key === 'r') setRotation((r) => r + 90);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  // Prevent body scroll when lightbox is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleZoomIn = () => setScale((s) => Math.min(s + 0.25, 5));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.25, 0.25));
  const handleRotate = () => setRotation((r) => r + 90);
  const handleReset = () => { setScale(1); setRotation(0); setPosition({ x: 0, y: 0 }); };

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    setDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };
  const handleMouseMove = (e) => {
    if (!dragging) return;
    setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };
  const handleMouseUp = () => setDragging(false);

  const handleWheel = (e) => {
    e.preventDefault();
    setScale((s) => {
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      return Math.min(Math.max(s + delta, 0.25), 5);
    });
  };

  const isPdf = src?.toLowerCase().endsWith('.pdf');

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/80 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Toolbar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200 px-2 py-1.5">
        <button
          onClick={handleZoomIn}
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-700 transition-colors"
          title="Zoom in (+)"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-700 transition-colors"
          title="Zoom out (-)"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleRotate}
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-700 transition-colors"
          title="Rotate (R)"
        >
          <RotateCw className="w-4 h-4" />
        </button>
        <div className="w-px h-6 bg-slate-200 mx-1" />
        <span className="text-xs font-semibold text-slate-500 px-2 min-w-[3rem] text-center">
          {Math.round(scale * 100)}%
        </span>
        <div className="w-px h-6 bg-slate-200 mx-1" />
        <button
          onClick={handleReset}
          className="px-3 py-1.5 rounded-lg hover:bg-slate-100 text-xs font-semibold text-slate-600 transition-colors"
          title="Reset view"
        >
          Reset
        </button>
        <a
          href={src}
          download
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-700 transition-colors"
          title="Download"
        >
          <Download className="w-4 h-4" />
        </a>
        <a
          href={src}
          target="_blank"
          rel="noreferrer"
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-700 transition-colors"
          title="Open in new tab"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
        <div className="w-px h-6 bg-slate-200 mx-1" />
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-rose-50 text-rose-500 transition-colors"
          title="Close (Esc)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Image container */}
      <div
        className="relative z-[1] flex items-center justify-center w-full h-full select-none"
        onWheel={handleWheel}
        style={{ cursor: dragging ? 'grabbing' : 'grab' }}
      >
        {isPdf ? (
          <div className="bg-white rounded-xl shadow-lg p-6 text-center space-y-3 max-w-sm">
            <p className="text-slate-700 font-semibold text-sm">This is a PDF document.</p>
            <div className="flex gap-2 justify-center">
              <a
                href={src}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-civic-emerald text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors"
              >
                <ExternalLink className="w-4 h-4" /> Open PDF
              </a>
              <a
                href={src}
                download
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-200 transition-colors"
              >
                <Download className="w-4 h-4" /> Download
              </a>
            </div>
          </div>
        ) : (
          <img
            src={src}
            alt={alt}
            draggable={false}
            onMouseDown={handleMouseDown}
            className="max-w-[90vw] max-h-[85vh] rounded-lg shadow-2xl transition-transform duration-150"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
            }}
          />
        )}
      </div>

      {/* Hint */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 text-xs text-white/60 font-medium">
        Scroll to zoom · Drag to pan · Press Esc to close
      </div>
    </div>
  );
}
