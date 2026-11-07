'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import BrokenImageIcon from '@mui/icons-material/BrokenImage';

export interface ProductCarouselProps {
  images: string[];
  title: string;
  productId?: number | string;
}

export function ProductCarousel({ images = [], title, productId }: ProductCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [thumbnailErrors, setThumbnailErrors] = useState<Record<number, boolean>>({});

  // Ensure stable, sanitized image strings
  const cleanImages = useMemo(() => {
    if (!Array.isArray(images)) return [];
    return images.filter((img): img is string => typeof img === 'string' && img.trim() !== '');
  }, [images]);

  const total = cleanImages.length;
  const imageKey = cleanImages.join('|');

  // Requirement S2-04: Reset carousel state ONLY when product identity or image collection content changes
  useEffect(() => {
    setCurrentIndex(0);
    setHasError(false);
    setThumbnailErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, imageKey]);

  // Clamp current index to valid bounds if collection size shrinks
  const safeIndex = total > 0 ? Math.min(Math.max(0, currentIndex), total - 1) : 0;

  const handlePrev = () => {
    if (total <= 1) return;
    setCurrentIndex((prev) => (prev === 0 ? total - 1 : prev - 1));
    setHasError(false);
  };

  const handleNext = () => {
    if (total <= 1) return;
    setCurrentIndex((prev) => (prev === total - 1 ? 0 : prev + 1));
    setHasError(false);
  };

  const handleSelectThumbnail = (index: number) => {
    setCurrentIndex(index);
    setHasError(false);
  };

  const handleThumbnailError = (index: number) => {
    setThumbnailErrors((prev) => ({ ...prev, [index]: true }));
  };

  // Case: No usable images or thumbnails exist
  if (total === 0) {
    return (
      <Box
        sx={{
          width: '100%',
          height: 380,
          borderRadius: 3,
          bgcolor: 'action.hover',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'text.secondary',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <BrokenImageIcon sx={{ fontSize: 48, mb: 1, opacity: 0.6 }} />
        <Typography variant="body2">No product images available</Typography>
      </Box>
    );
  }

  const currentImage = cleanImages[safeIndex];

  return (
    <Box sx={{ width: '100%' }}>
      {/* Main Display Stage */}
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          height: { xs: 280, sm: 380 },
          borderRadius: 3,
          bgcolor: '#ffffff',
          border: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          p: 2,
        }}
      >
        {hasError ? (
          <Box display="flex" flexDirection="column" alignItems="center" color="text.secondary">
            <BrokenImageIcon sx={{ fontSize: 44, mb: 1, opacity: 0.6 }} />
            <Typography variant="caption">Image preview unavailable</Typography>
          </Box>
        ) : (
          <Box
            component="img"
            src={currentImage}
            alt={`${title} - image ${safeIndex + 1} of ${total}`}
            onError={() => setHasError(true)}
            sx={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              transition: 'transform 0.25s ease-in-out',
            }}
          />
        )}

        {/* Previous Button: Only rendered if multiple images exist */}
        {total > 1 && (
          <IconButton
            onClick={handlePrev}
            aria-label="Previous product image"
            sx={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              bgcolor: 'rgba(255,255,255,0.85)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
              '&:hover': { bgcolor: '#ffffff' },
            }}
            size="small"
          >
            <NavigateBeforeIcon />
          </IconButton>
        )}

        {/* Next Button: Only rendered if multiple images exist */}
        {total > 1 && (
          <IconButton
            onClick={handleNext}
            aria-label="Next product image"
            sx={{
              position: 'absolute',
              right: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              bgcolor: 'rgba(255,255,255,0.85)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
              '&:hover': { bgcolor: '#ffffff' },
            }}
            size="small"
          >
            <NavigateNextIcon />
          </IconButton>
        )}

        {/* Indicator badge: Only rendered if multiple images exist */}
        {total > 1 && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 12,
              right: 12,
              bgcolor: 'rgba(15, 23, 42, 0.75)',
              color: '#ffffff',
              px: 1.25,
              py: 0.25,
              borderRadius: 1.5,
              fontSize: '0.75rem',
              fontWeight: 600,
            }}
          >
            {safeIndex + 1} / {total}
          </Box>
        )}
      </Box>

      {/* Thumbnails Strip: Only rendered if multiple images exist */}
      {total > 1 && (
        <Box
          display="flex"
          gap={1.5}
          mt={2}
          sx={{
            overflowX: 'auto',
            pb: 0.5,
            '&::-webkit-scrollbar': { height: 6 },
            '&::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: 3 },
          }}
        >
          {cleanImages.map((img, idx) => {
            const isSelected = idx === safeIndex;
            return (
              <Box
                key={idx}
                component="button"
                onClick={() => handleSelectThumbnail(idx)}
                aria-label={`Select product image ${idx + 1}`}
                sx={{
                  flexShrink: 0,
                  width: 64,
                  height: 64,
                  borderRadius: 2,
                  p: 0.5,
                  bgcolor: '#ffffff',
                  border: '2px solid',
                  borderColor: isSelected ? 'primary.main' : 'divider',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease-in-out',
                  '&:hover': {
                    borderColor: isSelected ? 'primary.main' : 'text.secondary',
                  },
                }}
              >
                {thumbnailErrors[idx] ? (
                  <BrokenImageIcon sx={{ fontSize: 24, opacity: 0.5 }} />
                ) : (
                  <Box
                    component="img"
                    src={img}
                    alt={`Thumbnail ${idx + 1}`}
                    onError={() => handleThumbnailError(idx)}
                    sx={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      objectFit: 'contain',
                    }}
                  />
                )}
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
