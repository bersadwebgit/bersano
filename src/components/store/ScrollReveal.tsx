'use client';

import { useEffect, useRef, useState, ReactNode } from 'react';

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  animation?: 'fade-in' | 'fade-in-up' | 'fade-in-down' | 'fade-in-left' | 'fade-in-right' | 'zoom-in' | 'zoom-out';
  duration?: number; // in ms
  delay?: number; // in ms
  threshold?: number;
  once?: boolean;
}

export default function ScrollReveal({
  children,
  className = '',
  animation = 'fade-in-up',
  duration = 500,
  delay = 0,
  threshold = 0.05, // Lowered threshold for better mobile responsiveness
  once = true,
}: ScrollRevealProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [hasSupport, setHasSupport] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!('IntersectionObserver' in window)) {
      setHasSupport(false);
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once && ref.current) {
            observer.unobserve(ref.current);
          }
        } else if (!once) {
          setIsVisible(false);
        }
      },
      { 
        threshold,
        rootMargin: '0px 0px -20px 0px' // Triggers slightly before entering viewport for smoother feel
      }
    );

    const currentRef = ref.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [threshold, once]);

  // Define transition styles based on animation type
  const getAnimationStyles = () => {
    if (!hasSupport) return {};

    const base = {
      transitionProperty: 'opacity, transform',
      transitionDuration: `${duration}ms`,
      transitionDelay: `${delay}ms`,
      transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)', // Ultra smooth ease-out-expo
      willChange: 'opacity, transform', // Hint browser to optimize rendering
    };

    const initial = {
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? 'translate(0, 0) scale(1)' : '',
    };

    if (!isVisible) {
      switch (animation) {
        case 'fade-in-up':
          initial.transform = 'translateY(20px)';
          break;
        case 'fade-in-down':
          initial.transform = 'translateY(-20px)';
          break;
        case 'fade-in-left':
          initial.transform = 'translateX(20px)';
          break;
        case 'fade-in-right':
          initial.transform = 'translateX(-20px)';
          break;
        case 'zoom-in':
          initial.transform = 'scale(0.96)';
          break;
        case 'zoom-out':
          initial.transform = 'scale(1.04)';
          break;
        case 'fade-in':
        default:
          break;
      }
    }

    return { ...base, ...initial };
  };

  return (
    <div ref={ref} style={getAnimationStyles()} className={className}>
      {children}
    </div>
  );
}
