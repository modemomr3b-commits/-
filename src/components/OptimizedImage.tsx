import React, { useState, useEffect, useRef } from 'react';

// Global cache for loaded image URLs to make revisits and navigation instantaneous
const loadedImageUrls = new Set<string>();

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  width?: number;
  height?: number;
  size?: 'thumbnail' | 'medium' | 'full';
  priority?: boolean;
}

export default function OptimizedImage({ 
  src, 
  alt, 
  className = '', 
  imgClassName = '', 
  width, 
  height, 
  size = 'medium',
  priority = false,
  ...props 
}: OptimizedImageProps) {
  // If image was already loaded previously in this session, render it immediately without waiting/spinner
  const [isLoaded, setIsLoaded] = useState(() => loadedImageUrls.has(src));
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Check if browser already has it cached
  useEffect(() => {
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      setIsLoaded(true);
      loadedImageUrls.add(src);
    }
  }, [src]);

  // Compute optimized URL if using image delivery CDN or transform
  let cdnUrl = src;
  const targetWidth = size === 'thumbnail' ? 240 : size === 'medium' ? 600 : 1200;
  
  if (src && src.includes('unsplash.com')) {
    cdnUrl = src.includes('?') ? `${src}&q=80&fm=auto&w=${targetWidth}` : `${src}?q=80&fm=auto&w=${targetWidth}`;
  } else if (src && src.includes('res.cloudinary.com')) {
    cdnUrl = src.replace('/upload/', `/upload/w_${targetWidth},q_auto,f_auto,c_limit/`);
  } else if (src && src.includes('supabase.co/storage/v1/object/public/')) {
    // Supabase image transform support if available
    // Can pass width parameter
    if (!src.includes('?')) {
      cdnUrl = `${src}?width=${targetWidth}&quality=80`;
    }
  }

  const handleLoad = () => {
    setIsLoaded(true);
    if (src) loadedImageUrls.add(src);
  };

  const handleError = () => {
    // If transformed URL failed, fallback to raw src
    if (cdnUrl !== src) {
      cdnUrl = src;
    } else {
      setHasError(true);
    }
  };

  return (
    <div 
      className={`relative overflow-hidden flex items-center justify-center bg-zinc-900/40 ${className}`} 
      style={{ width: width ? '100%' : undefined, maxWidth: width }}
    >
      {/* Subtle Skeleton Placeholder */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-white/5 animate-pulse flex items-center justify-center z-0">
          <div className="w-5 h-5 border-2 border-brq-gold/40 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {hasError ? (
        <div className="text-white/30 text-2xl flex flex-col items-center justify-center p-2">
          <span>👟</span>
        </div>
      ) : (
        <img
          ref={imgRef}
          src={cdnUrl}
          alt={alt}
          className={`w-full h-full ${imgClassName || 'object-contain'} transition-opacity duration-200 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          width={width}
          height={height}
          {...props}
        />
      )}
    </div>
  );
}
