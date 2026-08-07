import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RotateCcw,
  Eye,
  X,
  Sparkles,
  Move
} from 'lucide-react';

/**
 * ResponsivePdfViewer
 * Wraps fixed-width A4 document templates (e.g., 210mm / ~794px) and automatically scales
 * them to fit mobile screen widths while providing interactive zoom controls.
 */
export const ResponsivePdfViewer = ({
  children,
  documentTitle = 'Document Preview',
  showControls = true,
  className = ''
}) => {
  const containerRef = useRef(null);
  const contentRef = useRef(null);

  const [containerWidth, setContainerWidth] = useState(0);
  const [contentHeight, setContentHeight] = useState(1123); // Default A4 height ~1123px
  const [scale, setScale] = useState(1);
  const [mode, setMode] = useState('fit'); // 'fit' | '100' | 'custom'
  const [isFullscreen, setIsFullscreen] = useState(false);

  const A4_WIDTH_PX = 794; // 210mm at 96 DPI

  // Measure container width and content height
  const updateDimensions = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const padding = window.innerWidth < 640 ? 16 : 32;
      const width = Math.max(280, rect.width - padding);
      setContainerWidth(width);
    }
    if (contentRef.current) {
      const h = contentRef.current.offsetHeight;
      if (h > 100) {
        setContentHeight(h);
      }
    }
  }, []);

  useEffect(() => {
    updateDimensions();

    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    if (contentRef.current) {
      resizeObserver.observe(contentRef.current);
    }

    window.addEventListener('resize', updateDimensions);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateDimensions);
    };
  }, [updateDimensions]);

  // Recalculate effective scale when mode or containerWidth changes
  useEffect(() => {
    if (mode === 'fit') {
      if (containerWidth > 0) {
        const fitScale = Math.min(1.15, containerWidth / A4_WIDTH_PX);
        setScale(fitScale);
      }
    } else if (mode === '100') {
      setScale(1.0);
    }
  }, [containerWidth, mode]);

  const handleZoomIn = () => {
    setMode('custom');
    setScale((prev) => Math.min(2.0, parseFloat((prev + 0.1).toFixed(2))));
  };

  const handleZoomOut = () => {
    setMode('custom');
    setScale((prev) => Math.max(0.35, parseFloat((prev - 0.1).toFixed(2))));
  };

  const handleToggleFit = () => {
    if (mode === 'fit') {
      setMode('100');
    } else {
      setMode('fit');
    }
  };

  const handleResetZoom = () => {
    setMode('fit');
  };

  const currentPercentage = Math.round(scale * 100);
  const isMobile = containerWidth < 640;
  const wrapperHeight = Math.ceil(contentHeight * scale);

  return (
    <div className={`w-full flex flex-col items-center ${className}`}>
      {/* Interactive Controls Bar */}
      {showControls && (
        <div className="no-print w-full max-w-5xl mb-3 px-3 py-2 rounded-xl bg-slate-900/90 dark:bg-slate-900/95 backdrop-blur-md border border-slate-800 text-white shadow-lg flex items-center justify-between gap-2 text-xs select-none transition-all">
          <div className="flex items-center gap-2">
            <span className="font-bold flex items-center gap-1.5 text-slate-300">
              <Eye className="w-4 h-4 text-brand-400" />
              <span className="hidden sm:inline">{documentTitle}</span>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-brand-300 font-mono font-semibold text-[11px] border border-slate-700/60">
              {currentPercentage}%
            </span>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5">
            <button
              type="button"
              onClick={handleToggleFit}
              className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1 font-medium transition-all ${
                mode === 'fit'
                  ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/40'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
              title={mode === 'fit' ? 'Switch to Actual Size (100%)' : 'Fit to Screen Width'}
            >
              {mode === 'fit' ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Fit Width</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Fit Screen</span>
                </>
              )}
            </button>

            <div className="h-4 w-px bg-slate-800 mx-0.5" />

            <button
              type="button"
              onClick={handleZoomOut}
              disabled={scale <= 0.35}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 transition-colors"
              title="Zoom Out (-10%)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleResetZoom}
              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[11px] font-semibold transition-colors"
              title="Reset Zoom"
            >
              <RotateCcw className="w-3 h-3 inline mr-1" />
              Reset
            </button>

            <button
              type="button"
              onClick={handleZoomIn}
              disabled={scale >= 2.0}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 transition-colors"
              title="Zoom In (+10%)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setIsFullscreen(true)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors ml-1"
              title="Fullscreen Preview"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Document Display Container */}
      <div
        ref={containerRef}
        className="w-full flex flex-col items-center overflow-x-auto overflow-y-visible relative scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 py-1"
      >
        {/* Helper Touch Hint for Mobile when Zoomed in 100% */}
        {mode === '100' && isMobile && (
          <div className="no-print mb-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[11px] font-medium flex items-center gap-1.5 animate-pulse">
            <Move className="w-3.5 h-3.5" />
            <span>Swipe horizontally to navigate full A4 width</span>
          </div>
        )}

        {/* Scaled Wrapper Box */}
        <div
          className="relative transition-all duration-200 ease-out flex justify-center"
          style={{
            width: scale < 1 && mode === 'fit' ? '100%' : `${Math.max(containerWidth, A4_WIDTH_PX * scale)}px`,
            height: `${wrapperHeight}px`,
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              width: `${A4_WIDTH_PX}px`,
              transform: `scale(${scale})`,
              transformOrigin: 'top center',
              transition: 'transform 0.15s ease-out'
            }}
          >
            <div ref={contentRef}>{children}</div>
          </div>
        </div>
      </div>

      {/* Fullscreen Overlay Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-md flex flex-col items-center p-2 sm:p-6 overflow-y-auto">
          <div className="w-full max-w-5xl flex items-center justify-between mb-4 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white shadow-xl">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-brand-400" />
              <h3 className="font-bold text-sm text-white">{documentTitle}</h3>
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-brand-300 text-xs font-mono font-semibold">
                {currentPercentage}%
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleZoomOut}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleZoomIn}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsFullscreen(false)}
                className="p-2 rounded-lg bg-red-600/80 hover:bg-red-600 text-white ml-2"
                title="Close Fullscreen"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="w-full overflow-auto flex justify-center pb-12">
            <div
              style={{
                width: `${A4_WIDTH_PX}px`,
                transform: `scale(${Math.max(scale, 0.7)})`,
                transformOrigin: 'top center'
              }}
            >
              {children}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
