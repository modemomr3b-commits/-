import React, { useState } from 'react';

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
  
  let cdnUrl = src;
  const targetWidth = size === 'thumbnail' ? 200 : size === 'medium' ? 600 : 1200;
  
  if (src && src.includes('unsplash.com')) {
      cdnUrl = src.includes('?') ? `${src}&q=80&fm=auto&w=${targetWidth}` : `${src}?q=80&fm=auto&w=${targetWidth}`;
  } else if (src && src.includes('res.cloudinary.com')) {
      cdnUrl = src.replace('/upload/', `/upload/w_${targetWidth},q_auto,f_auto,c_limit/`);
  }

  return (
    <div className={`relative overflow-hidden flex items-center justify-center ${className}`} style={{ width: width ? '100%' : undefined, maxWidth: width }}>
      {!isLoaded && (
        <div className="absolute inset-0 bg-white/5 animate-pulse flex items-center justify-center">
            <span className="w-6 h-6 border-2 border-brq-gold border-t-transparent rounded-full animate-spin opacity-50"></span>
        </div>
      )}
      
      <img
        src={cdnUrl}
        alt={alt}
        className={`w-full h-full transition-opacity duration-300 ${imgClassName || 'object-contain'} ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        loading="lazy"
        onLoad={() => setIsLoaded(true)}
        width={width}
        height={height}
        {...props}
      />
    </div>
  );
}
