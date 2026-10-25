import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';

interface PhotoLightboxModalProps {
  photos: string[];
  initialIndex?: number;
  userName: string;
  onClose: () => void;
}

export const PhotoLightboxModal: React.FC<PhotoLightboxModalProps> = ({
  photos,
  initialIndex = 0,
  userName,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(initialIndex);
  const [direction, setDirection] = useState<number>(0);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && photos.length > 1) {
        setDirection(1);
        setCurrentIndex((prev) => (prev + 1) % photos.length);
      }
      if (e.key === 'ArrowLeft' && photos.length > 1) {
        setDirection(-1);
        setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, photos.length]);

  if (!photos || photos.length === 0) return null;

  const handleNext = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (photos.length <= 1) return;
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % photos.length);
  };

  const handlePrev = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (photos.length <= 1) return;
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  const handleThumbnailClick = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setDirection(idx > currentIndex ? 1 : -1);
    setCurrentIndex(idx);
  };

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 80 : -80,
      opacity: 0,
      scale: 0.95,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: {
        x: { type: 'spring' as const, stiffness: 350, damping: 30 },
        opacity: { duration: 0.15 },
        scale: { duration: 0.15 }
      }
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -80 : 80,
      opacity: 0,
      scale: 0.95,
      transition: {
        x: { type: 'spring' as const, stiffness: 350, damping: 30 },
        opacity: { duration: 0.15 },
        scale: { duration: 0.15 }
      }
    })
  };

  return (
    <div 
      className="fixed inset-0 z-[70] bg-black/95 backdrop-blur-2xl flex flex-col justify-between items-center select-none animate-fadeIn pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))] px-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]"
      onClick={onClose}
    >
      {/* Top Header Bar */}
      <div 
        className="w-full max-w-2xl flex items-center justify-between z-10 pt-2 pb-3 px-2 sm:px-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center space-x-2.5 text-white">
          <div className="w-8 h-8 rounded-full bg-[#581C87] border border-[#F59E0B]/40 flex items-center justify-center text-[#F59E0B]">
            <ImageIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm tracking-tight">{userName}</h3>
            <p className="text-[11px] text-purple-300">
              Photo {currentIndex + 1} of {photos.length}
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-2.5 sm:p-3 rounded-full bg-white/15 hover:bg-white/25 active:bg-white/35 text-white transition-all cursor-pointer shadow-xl active:scale-90"
          title="Close full photo view"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Image Stage */}
      <div 
        className="relative flex-1 w-full max-w-2xl flex items-center justify-center overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Previous Button */}
        {photos.length > 1 && (
          <button
            onClick={handlePrev}
            className="absolute left-2 z-20 p-3 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 transition-all cursor-pointer shadow-2xl active:scale-90"
            title="Previous photo"
          >
            <ChevronLeft className="w-6 h-6 text-[#F59E0B]" />
          </button>
        )}

        {/* Current Photo with Swipe/Drag */}
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="w-full h-full flex items-center justify-center p-2 touch-none cursor-grab active:cursor-grabbing"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.5}
            onDragEnd={(_, { offset, velocity }) => {
              const swipe = Math.abs(offset.x) * velocity.x;
              if (swipe < -80 || offset.x < -60) {
                handleNext();
              } else if (swipe > 80 || offset.x > 60) {
                handlePrev();
              }
            }}
          >
            <img
              src={photos[currentIndex]}
              alt={`${userName} - photo ${currentIndex + 1}`}
              className="max-h-[72vh] max-w-full w-auto object-contain rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-white/10"
            />
          </motion.div>
        </AnimatePresence>

        {/* Next Button */}
        {photos.length > 1 && (
          <button
            onClick={handleNext}
            className="absolute right-2 z-20 p-3 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 transition-all cursor-pointer shadow-2xl active:scale-90"
            title="Next photo"
          >
            <ChevronRight className="w-6 h-6 text-[#F59E0B]" />
          </button>
        )}
      </div>

      {/* Bottom Thumbnail Strip & Controls */}
      <div 
        className="w-full max-w-md flex flex-col items-center space-y-2 z-10 pt-2 pb-1"
        onClick={(e) => e.stopPropagation()}
      >
        {photos.length > 1 && (
          <div className="flex items-center space-x-2.5 p-1.5 rounded-2xl bg-black/60 border border-white/10 backdrop-blur-md">
            {photos.map((url, idx) => (
              <button
                key={idx}
                onClick={(e) => handleThumbnailClick(idx, e)}
                className={`relative w-12 h-12 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                  currentIndex === idx
                    ? 'border-[#F59E0B] scale-105 shadow-[0_0_15px_rgba(245,158,11,0.5)] ring-2 ring-[#F59E0B]/30'
                    : 'border-white/20 opacity-50 hover:opacity-100'
                }`}
              >
                <img src={url} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {photos.length > 1 && (
          <span className="text-[11px] text-slate-400">
            Swipe left or right to view photos
          </span>
        )}
      </div>
    </div>
  );
};

