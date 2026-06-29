'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Story } from '@/types';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';

interface StoryViewerProps {
  stories: Story[];
  initialIndex: number;
  onClose: () => void;
}

export default function StoryViewer({ stories, initialIndex, onClose }: StoryViewerProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [mounted, setMounted] = useState(false);

  // Touch states for swipe-to-close gesture
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [touchEndY, setTouchEndY] = useState<number | null>(null);

  // Prevent body scroll when story viewer is open
  useEffect(() => {
    setMounted(true);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow || '';
    };
  }, []);

  const currentStory = stories[currentIndex];
  const storyDuration = (currentStory.duration || 5) * 1000; // default 5 seconds

  const goToNext = useCallback(() => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setProgress(0);
    } else {
      onClose();
    }
  }, [currentIndex, stories.length, onClose]);

  const goToPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setProgress(0);
    }
  }, [currentIndex]);

  // Internal links (e.g. /#bestsellers, /product/123) should navigate in the same
  // tab and let the target section handle scrolling, instead of opening a new tab.
  const handleLinkClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>, url: string) => {
    e.stopPropagation();
    const isInternal = url.startsWith('/') || url.startsWith('#');
    if (!isInternal) return; // external URLs keep default (new tab) behavior

    e.preventDefault();

    const [rawPath, rawHash] = url.split('#');
    const targetPath = rawPath || '/';
    const targetHash = rawHash ? `#${rawHash}` : '';
    const samePage = targetPath === window.location.pathname;

    onClose();

    // Defer until the viewer unmounts and body scroll is restored.
    window.setTimeout(() => {
      if (samePage && targetHash) {
        if (window.location.hash === targetHash) {
          // Re-fire so the section scrolls even when the hash is unchanged.
          window.dispatchEvent(new HashChangeEvent('hashchange'));
        } else {
          window.location.hash = targetHash;
        }
      } else {
        router.push(url);
      }
    }, 80);
  }, [onClose, router]);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          goToNext();
          return 0;
        }
        return prev + (100 / (storyDuration / 100));
      });
    }, 100);

    return () => clearInterval(interval);
  }, [currentIndex, goToNext, storyDuration]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') goToNext();
      if (e.key === 'ArrowLeft') goToPrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrev, onClose]);

  // Touch handlers for swipe-to-close
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartY(e.targetTouches[0].clientY);
    setTouchEndY(null);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEndY(e.targetTouches[0].clientY);
  };

  const handleTouchEnd = () => {
    if (touchStartY === null || touchEndY === null) return;
    const diffY = touchEndY - touchStartY;
    // Close if swiped down or up by more than 70px
    if (Math.abs(diffY) > 70) {
      onClose();
    }
    setTouchStartY(null);
    setTouchEndY(null);
  };

  if (!mounted) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center overflow-hidden select-none"
      onClick={onClose}
    >
      {/* Global Close Button for Desktop (top-right of screen) */}
      <button 
        onClick={(e) => { e.stopPropagation(); onClose(); }} 
        className="absolute top-6 right-6 z-50 text-white/70 hover:text-white p-2 hover:bg-white/10 rounded-full transition-all hidden md:flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95"
        aria-label="Close viewer"
      >
        <X size={28} />
      </button>

      {/* Main Container for Stories */}
      <div 
        className="relative flex items-center justify-center w-full h-full"
        onClick={(e) => {
          // Clicking anywhere in the background container (outside cards) will trigger close
          e.stopPropagation();
          onClose();
        }}
      >
        {/* Relative wrapper for Active Card and Adjacent Cards */}
        <div 
          className="relative w-full h-full md:w-[90%] md:max-w-md md:h-[90vh] flex items-center justify-center"
          onClick={(e) => e.stopPropagation()} // Stop propagation here so clicks on cards/buttons don't close
        >
          
          {/* Previous Story Card (Desktop only) */}
          {currentIndex > 0 && (
            <div 
              onClick={(e) => { e.stopPropagation(); goToPrev(); }}
              className="absolute right-full mr-6 lg:mr-10 xl:mr-16 top-1/2 -translate-y-1/2 w-48 h-[60vh] lg:w-64 lg:h-[70vh] xl:w-72 xl:h-[75vh] rounded-2xl overflow-hidden hidden md:block opacity-40 hover:opacity-95 scale-90 hover:scale-100 -rotate-3 hover:rotate-0 hover:translate-x-12 lg:hover:translate-x-16 xl:hover:translate-x-24 transition-all duration-500 cursor-pointer bg-gray-900 shadow-2xl border border-white/10 select-none z-10"
            >
              {/* Dark overlay */}
              <div className="absolute inset-0 bg-black/30 z-10 hover:bg-black/10 transition-colors duration-500" />
              <Image 
                src={stories[currentIndex - 1].thumbnailUrl?.startsWith('/') || stories[currentIndex - 1].thumbnailUrl?.startsWith('http') ? stories[currentIndex - 1].thumbnailUrl : '/globe.svg'} 
                alt={stories[currentIndex - 1].title}
                fill
                className="object-cover blur-[1px]"
                sizes="(max-width: 1024px) 192px, (max-width: 1280px) 256px, 288px"
              />
              {/* Small info overlay */}
              <div className="absolute bottom-4 left-4 right-4 z-20 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full overflow-hidden relative border border-white/30">
                  <Image 
                    src={stories[currentIndex - 1].thumbnailUrl?.startsWith('/') || stories[currentIndex - 1].thumbnailUrl?.startsWith('http') ? stories[currentIndex - 1].thumbnailUrl : '/globe.svg'} 
                    alt="" 
                    fill 
                    className="object-cover" 
                  />
                </div>
                <span className="text-white/90 text-xs font-medium truncate">{stories[currentIndex - 1].title}</span>
              </div>
            </div>
          )}

          {/* Active Story Card */}
          <div 
            className="w-full h-full rounded-none md:rounded-2xl overflow-hidden relative bg-gray-900 shadow-[0_10px_50px_rgba(0,0,0,0.8)] border-none md:border md:border-white/10 flex flex-col justify-between z-20"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Drag Handle Indicator for Mobile Swipe-to-Close */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1 bg-white/30 rounded-full z-40 md:hidden" />

            {/* Progress Bars */}
            <div className="absolute top-3 left-0 right-0 z-30 flex gap-1 px-2 pt-1 bg-gradient-to-b from-black/80 to-transparent">
              {stories.map((story, index) => (
                <div key={story.id} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-white transition-all duration-100 ease-linear"
                    style={{ 
                      width: index === currentIndex ? `${progress}%` : index < currentIndex ? '100%' : '0%' 
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Header */}
            <div className="absolute top-6 left-0 right-0 z-30 flex justify-between items-center px-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full overflow-hidden relative border border-white/50">
                  <Image 
                    src={currentStory.thumbnailUrl?.startsWith('/') || currentStory.thumbnailUrl?.startsWith('http') ? currentStory.thumbnailUrl : '/globe.svg'} 
                    alt={currentStory.title} 
                    fill 
                    className="object-cover" 
                  />
                </div>
                <span className="text-white font-medium text-sm drop-shadow-md">{currentStory.title}</span>
              </div>
              
              {/* Highly Prominent Close Pill Button */}
              <button 
                onClick={(e) => { e.stopPropagation(); onClose(); }} 
                className="text-white bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-1.5 hover:bg-black/60 transition-all cursor-pointer border border-white/10 shadow-lg active:scale-95"
                aria-label="Close story"
              >
                <span className="text-[11px] font-bold tracking-wide">بستن</span>
                <X size={14} />
              </button>
            </div>

            {/* Tap Navigation Areas */}
            <div className="absolute inset-0 z-20 flex">
              <div className="w-1/3 h-full cursor-pointer" onClick={(e) => { e.stopPropagation(); goToPrev(); }} />
              <div className="w-2/3 h-full cursor-pointer" onClick={(e) => { e.stopPropagation(); goToNext(); }} />
            </div>

            {/* Media Content */}
            <div className="absolute inset-0 z-0">
              {currentStory.mediaType === 'image' ? (
                <Image 
                  src={currentStory.mediaUrl?.startsWith('/') || currentStory.mediaUrl?.startsWith('http') ? currentStory.mediaUrl : '/globe.svg'} 
                  alt={currentStory.title}
                  fill
                  className="object-cover"
                  priority
                />
              ) : (
                <video 
                  src={currentStory.mediaUrl}
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                  muted
                  loop
                />
              )}
            </div>

            {/* Overlay Text */}
            {currentStory.text && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 p-8">
                <p className="text-white text-xl md:text-2xl font-bold text-center bg-black/50 px-6 py-4 rounded-xl backdrop-blur-sm drop-shadow-lg max-w-[85%]">
                  {currentStory.text}
                </p>
              </div>
            )}

            {/* Link Button */}
            {currentStory.linkUrl && (
              <div className="absolute bottom-8 left-0 right-0 flex justify-center z-30">
                <a 
                  href={currentStory.linkUrl} 
                  target={currentStory.linkUrl.startsWith('/') || currentStory.linkUrl.startsWith('#') ? undefined : '_blank'} 
                  rel="noopener noreferrer" 
                  className="bg-white/95 text-black px-8 py-3 rounded-full font-bold shadow-lg hover:bg-white transition-all transform hover:scale-105"
                  onClick={(e) => handleLinkClick(e, currentStory.linkUrl!)}
                >
                  {currentStory.linkText || 'مشاهده لینک'}
                </a>
              </div>
            )}
          </div>

          {/* Next Story Card (Desktop only) */}
          {currentIndex < stories.length - 1 && (
            <div 
              onClick={(e) => { e.stopPropagation(); goToNext(); }}
              className="absolute left-full ml-6 lg:ml-10 xl:ml-16 top-1/2 -translate-y-1/2 w-48 h-[60vh] lg:w-64 lg:h-[70vh] xl:w-72 xl:h-[75vh] rounded-2xl overflow-hidden hidden md:block opacity-40 hover:opacity-95 scale-90 hover:scale-100 rotate-3 hover:rotate-0 hover:-translate-x-12 lg:hover:-translate-x-16 xl:hover:-translate-x-24 transition-all duration-500 cursor-pointer bg-gray-900 shadow-2xl border border-white/10 select-none z-10"
            >
              {/* Dark overlay */}
              <div className="absolute inset-0 bg-black/30 z-10 hover:bg-black/10 transition-colors duration-500" />
              <Image 
                src={stories[currentIndex + 1].thumbnailUrl?.startsWith('/') || stories[currentIndex + 1].thumbnailUrl?.startsWith('http') ? stories[currentIndex + 1].thumbnailUrl : '/globe.svg'} 
                alt={stories[currentIndex + 1].title}
                fill
                className="object-cover blur-[1px]"
                sizes="(max-width: 1024px) 192px, (max-width: 1280px) 256px, 288px"
              />
              {/* Small info overlay */}
              <div className="absolute bottom-4 left-4 right-4 z-20 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full overflow-hidden relative border border-white/30">
                  <Image 
                    src={stories[currentIndex + 1].thumbnailUrl?.startsWith('/') || stories[currentIndex + 1].thumbnailUrl?.startsWith('http') ? stories[currentIndex + 1].thumbnailUrl : '/globe.svg'} 
                    alt="" 
                    fill 
                    className="object-cover" 
                  />
                </div>
                <span className="text-white/90 text-xs font-medium truncate">{stories[currentIndex + 1].title}</span>
              </div>
            </div>
          )}

          {/* Desktop Navigation Buttons (placed relative to the active card wrapper) */}
          <button 
            onClick={(e) => { e.stopPropagation(); goToPrev(); }}
            className="absolute -left-16 lg:-left-20 top-1/2 -translate-y-1/2 z-30 text-white/80 hover:text-white p-3 bg-white/10 hover:bg-white/20 rounded-full hidden md:flex items-center justify-center transition-all cursor-pointer disabled:opacity-30 disabled:pointer-events-none hover:scale-105 active:scale-95"
            disabled={currentIndex === 0}
          >
            <ChevronLeft size={28} />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); goToNext(); }}
            className="absolute -right-16 lg:-right-20 top-1/2 -translate-y-1/2 z-30 text-white/80 hover:text-white p-3 bg-white/10 hover:bg-white/20 rounded-full hidden md:flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95"
          >
            <ChevronRight size={28} />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
