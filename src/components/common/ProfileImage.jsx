import React, { useState, useEffect, useRef } from 'react';

const ProfileImage = ({
  src,
  alt = "Profile",
  size = "md",
  className = "",
  fallbackName = "",
  showFallback = true,
  transformations = {},
  loadingMode = "eager"
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const imgRef = useRef(null);

  // Size configurations
  const sizeConfig = {
    xs: { width: 32, height: 32, textSize: "text-xs" },
    sm: { width: 48, height: 48, textSize: "text-sm" },
    md: { width: 64, height: 64, textSize: "text-base" },
    lg: { width: 96, height: 96, textSize: "text-xl" },
    xl: { width: 128, height: 128, textSize: "text-2xl" },
    "2xl": { width: 192, height: 192, textSize: "text-4xl" }
  };

  const config = sizeConfig[size] || sizeConfig.md;

  // Check if image URL is valid
  const isValidImageUrl = (url) => {
    if (!url || typeof url !== 'string' || url.trim() === '') {
      return false;
    }

    // Check for common invalid values
    const invalidValues = ['null', 'undefined', 'false', ''];
    if (invalidValues.includes(url.toLowerCase().trim())) {
      return false;
    }

    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  // Get optimized image URL from Cloudinary
  const getOptimizedImageUrl = (imageUrl) => {
    if (!isValidImageUrl(imageUrl)) {
      return null;
    }
    // Not using Cloudinary; return original URL
    return imageUrl;
  };

  const optimizedSrc = getOptimizedImageUrl(src);
  const hasValidImage = optimizedSrc !== null;

  // Reset states when src changes
  useEffect(() => {
    setImageError(false);
    const shouldLoad = !!hasValidImage;
    setImageLoading(shouldLoad);

    if (shouldLoad) {
      // If the image element already finished loading from cache
      if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
        setImageLoading(false);
      }
      // Do not set error based on timeouts; rely on onLoad/onError events.
    }
  }, [src, hasValidImage]);

  // Generate fallback avatar URL using UI Avatars service
  const fallbackAvatarUrl = fallbackName && showFallback
    ? `https://ui-avatars.com/api/?name=${encodeURIComponent(fallbackName)}&size=${config.width * 2}&background=random&color=fff&bold=true&format=png`
    : null;

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoading(false);
  };

  const containerClasses = `
    relative inline-block rounded-full overflow-hidden bg-gray-100 flex items-center justify-center
    ${className}
  `;

  const imageClasses = `
    w-full h-full object-cover transition-opacity duration-200
    ${imageLoading ? 'opacity-0' : 'opacity-100'}
  `;

  return (
    <div
      className={containerClasses}
      style={{ width: config.width, height: config.height }}
    >
      {/* Loading spinner - only show when actually loading a valid image */}
      {imageLoading && hasValidImage && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-blue-600"></div>
        </div>
      )}

      {/* Main image - only render if we have a valid image URL */}
      {hasValidImage && !imageError && (
        <img
          ref={imgRef}
          src={optimizedSrc}
          alt={alt}
          className={imageClasses}
          loading={loadingMode}
          fetchPriority={loadingMode === 'eager' ? 'high' : 'auto'}
          decoding="async"
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      )}

      {/* Fallback avatar service - show when no valid image or image failed to load */}
      {(!hasValidImage || imageError) && fallbackAvatarUrl && (
        <img
          src={fallbackAvatarUrl}
          alt={alt}
          className="w-full h-full object-cover"
          onError={() => {
            // If avatar service also fails, we'll show the default icon
            console.warn('Avatar service failed for:', fallbackName);
          }}
        />
      )}

      {/* Default icon fallback - show when everything else fails or no fallback name */}
      {(!hasValidImage || imageError) && !fallbackAvatarUrl && (
        <div className="w-full h-full flex items-center justify-center bg-gray-200">
          <svg
            className={`${config.textSize} text-gray-500`}
            fill="currentColor"
            viewBox="0 0 24 24"
            style={{ width: config.width * 0.5, height: config.height * 0.5 }}
          >
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
        </div>
      )}

      {/* Optional overlay for interactive states */}
      <div className="absolute inset-0 rounded-full ring-2 ring-white ring-opacity-0 transition-all duration-200 hover:ring-opacity-100"></div>
    </div>
  );
};

// Prevent unnecessary re-renders to avoid image reloads when parent state changes (e.g., opening a modal)
const areEqual = (prevProps, nextProps) => {
  return (
    prevProps.src === nextProps.src &&
    prevProps.alt === nextProps.alt &&
    prevProps.size === nextProps.size &&
    prevProps.className === nextProps.className &&
    prevProps.fallbackName === nextProps.fallbackName &&
    prevProps.showFallback === nextProps.showFallback &&
    prevProps.loadingMode === nextProps.loadingMode
  );
};

export default React.memo(ProfileImage, areEqual);