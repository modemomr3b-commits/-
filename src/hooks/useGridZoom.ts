import { useState, useEffect, useCallback, useRef } from 'react';

interface UseGridZoomOptions {
  storageKey?: string;
  minCols?: number;
  maxCols?: number;
  defaultCols?: number;
}

export function useGridZoom(options: UseGridZoomOptions = {}) {
  const {
    storageKey = 'brq_grid_zoom_cols',
    minCols = 1,
    maxCols = 6,
    defaultCols
  } = options;

  const [columns, setColumnsState] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (parsed >= minCols && parsed <= maxCols) return parsed;
      }
    } catch {}
    if (defaultCols) return defaultCols;
    return typeof window !== 'undefined' && window.innerWidth < 640 ? 2 : 4;
  });

  const [showHUD, setShowHUD] = useState<boolean>(false);
  const hudTimeoutRef = useRef<any>(null);
  const lastWheelTimeRef = useRef<number>(0);

  const triggerHUD = useCallback(() => {
    setShowHUD(true);
    if (hudTimeoutRef.current) clearTimeout(hudTimeoutRef.current);
    hudTimeoutRef.current = setTimeout(() => {
      setShowHUD(false);
    }, 1600);
  }, []);

  const setColumns = useCallback((cols: number, showFeedback = true) => {
    const clamped = Math.max(minCols, Math.min(maxCols, cols));
    setColumnsState(clamped);
    try {
      localStorage.setItem(storageKey, clamped.toString());
    } catch {}
    if (showFeedback) {
      triggerHUD();
    }
  }, [minCols, maxCols, storageKey, triggerHUD]);

  // Zoom IN: Decreases column count => Images become larger
  const zoomIn = useCallback(() => {
    setColumnsState(prev => {
      const next = Math.max(minCols, prev - 1);
      try {
        localStorage.setItem(storageKey, next.toString());
      } catch {}
      return next;
    });
    triggerHUD();
  }, [minCols, storageKey, triggerHUD]);

  // Zoom OUT: Increases column count => Images become smaller
  const zoomOut = useCallback(() => {
    setColumnsState(prev => {
      const next = Math.min(maxCols, prev + 1);
      try {
        localStorage.setItem(storageKey, next.toString());
      } catch {}
      return next;
    });
    triggerHUD();
  }, [maxCols, storageKey, triggerHUD]);

  // Reset to default
  const resetZoom = useCallback(() => {
    const defaultVal = window.innerWidth < 640 ? 2 : 4;
    setColumns(defaultVal);
  }, [setColumns]);

  // Attach Ctrl + Mouse Wheel listener to window
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        // Prevent default browser page zoom
        e.preventDefault();

        const now = Date.now();
        // Debounce / throttle rapid wheel ticks
        if (now - lastWheelTimeRef.current < 120) return;
        lastWheelTimeRef.current = now;

        if (e.deltaY < 0) {
          // Scrolled up -> Zoom In (fewer columns, larger images)
          zoomIn();
        } else if (e.deltaY > 0) {
          // Scrolled down -> Zoom Out (more columns, smaller images)
          zoomOut();
        }
      }
    };

    // Keyboard shortcuts: Ctrl + '=', Ctrl + '+', Ctrl + '-'
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          zoomIn();
        } else if (e.key === '-' || e.key === '_') {
          e.preventDefault();
          zoomOut();
        } else if (e.key === '0') {
          e.preventDefault();
          resetZoom();
        }
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeyDown);
      if (hudTimeoutRef.current) clearTimeout(hudTimeoutRef.current);
    };
  }, [zoomIn, zoomOut, resetZoom]);

  // Touch Pinch-to-zoom support for mobile & tablet
  useEffect(() => {
    let initialDistance = 0;
    let pinchThrottled = false;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        initialDistance = Math.hypot(dx, dy);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && initialDistance > 0 && !pinchThrottled) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const currentDistance = Math.hypot(dx, dy);
        const diff = currentDistance - initialDistance;

        if (Math.abs(diff) > 60) {
          pinchThrottled = true;
          if (diff > 0) {
            // Pinch out / Expand -> Zoom In (larger images)
            zoomIn();
          } else {
            // Pinch in / Contract -> Zoom Out (smaller images)
            zoomOut();
          }
          initialDistance = currentDistance;
          setTimeout(() => { pinchThrottled = false; }, 300);
        }
      }
    };

    const handleTouchEnd = () => {
      initialDistance = 0;
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [zoomIn, zoomOut]);

  // Grid CSS classes based on column count
  const getGridClass = useCallback(() => {
    switch (columns) {
      case 1:
        return 'grid grid-cols-1 max-w-2xl mx-auto gap-4 sm:gap-6';
      case 2:
        return 'grid grid-cols-2 gap-3 sm:gap-5';
      case 3:
        return 'grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4';
      case 4:
        return 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-4';
      case 5:
        return 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3';
      case 6:
        return 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-6 gap-2 sm:gap-3';
      default:
        return 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-4';
    }
  }, [columns]);

  // Arabic descriptive labels for HUD
  const getZoomLabel = useCallback(() => {
    switch (columns) {
      case 1:
        return 'عرض مفرد عملاق (عمود واحد)';
      case 2:
        return 'حجم كبير جداً (عمودين)';
      case 3:
        return 'حجم كبير (3 أعمدة)';
      case 4:
        return 'حجم قياسي متوازن (4 أعمدة)';
      case 5:
        return 'حجم مصغر (5 أعمدة)';
      case 6:
        return 'حجم مصغر جداً (6 أعمدة)';
      default:
        return `${columns} أعمدة`;
    }
  }, [columns]);

  return {
    columns,
    setColumns,
    zoomIn,
    zoomOut,
    resetZoom,
    showHUD,
    zoomLabel: getZoomLabel(),
    gridClass: getGridClass(),
    canZoomIn: columns > minCols,
    canZoomOut: columns < maxCols
  };
}
