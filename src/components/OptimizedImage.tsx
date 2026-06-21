import React, { useState, useEffect } from 'react';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  width?: number;
  height?: number;
  size?: 'thumbnail' | 'medium' | 'full';
}

export default function OptimizedImage({ src, alt, className = '', imgClassName = '', width, height, size = 'medium', ...props }: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentSrc, setCurrentSrc] = useState<string>('');

  useEffect(() => {
    let cdnUrl = src;
    
    // Determine target width to pull optimized size
    const targetWidth = size === 'thumbnail' ? 200 : size === 'medium' ? 600 : 1200;

    // Faking a CDN URL by converting an Unsplash direct link into an optimized parameter representation
    if (src.includes('unsplash.com')) {
       cdnUrl = src.includes('?') ? `${src}&q=80&fm=auto&w=${targetWidth}` : `${src}?q=80&fm=auto&w=${targetWidth}`;
    } else if (src.includes('res.cloudinary.com')) {
       // Auto-generate cloudinary sizes smartly
       cdnUrl = src.replace('/upload/', `/upload/w_${targetWidth},q_auto,f_auto,c_limit/`);
    }

    const img = new Image();
    img.src = cdnUrl;
    img.onload = () => {
      setCurrentSrc(cdnUrl);
      setIsLoaded(true);
    };
  }, [src, size]);

  return (
    <div className={`relative overflow-hidden flex items-center justify-center ${className}`} style={{ width: width ? '100%' : undefined, maxWidth: width }}>
      {!isLoaded && (
        <div className="absolute inset-0 bg-white/5 animate-pulse flex items-center justify-center">
            <span className="w-6 h-6 border-2 border-brq-gold border-t-transparent rounded-full animate-spin opacity-50"></span>
        </div>
      )}
      
      <img
        src={currentSrc || undefined}
        alt={alt}
        className={`w-full h-full transition-opacity duration-700 ${imgClassName || 'object-contain'} ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        loading="lazy"
        width={width}
        height={height}
        {...props}
      />
    </div>
  );
}

