"use client";

import React, { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import Image from "next/image";
import { ChevronRight, ChevronLeft } from "lucide-react";

export interface Slide {
  id: string | number;
  imageUrl: string;
  mobileImageUrl?: string | null;
  title?: string | null;
  subtitle?: string | null;
  linkUrl?: string | null;
  linkText?: string | null;
}

interface HeroSliderProps {
  slides: Slide[];
  autoPlayInterval?: number;
}

export default function HeroSlider({ slides, autoPlayInterval = 5000 }: HeroSliderProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, direction: "rtl" }, [
    Autoplay({ delay: autoPlayInterval, stopOnInteraction: false }),
  ]);

  const [prevBtnDisabled, setPrevBtnDisabled] = useState(true);
  const [nextBtnDisabled, setNextBtnDisabled] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);
  const scrollTo = useCallback((index: number) => emblaApi && emblaApi.scrollTo(index), [emblaApi]);

  const onInit = useCallback((emblaApi: any) => {
    setScrollSnaps(emblaApi.scrollSnapList());
  }, []);

  const onSelect = useCallback((emblaApi: any) => {
    setSelectedIndex(emblaApi.selectedScrollSnap());
    setPrevBtnDisabled(!emblaApi.canScrollPrev());
    setNextBtnDisabled(!emblaApi.canScrollNext());
  }, []);

  useEffect(() => {
    if (!emblaApi) return;

    onInit(emblaApi);
    onSelect(emblaApi);
    emblaApi.on("reInit", onInit);
    emblaApi.on("reInit", onSelect);
    emblaApi.on("select", onSelect);
  }, [emblaApi, onInit, onSelect]);

  if (!slides || slides.length === 0) return null;

  return (
    <div
      className="relative w-full overflow-hidden bg-gray-100 md:rounded-2xl md:mt-4 md:shadow-sm"
      dir="rtl"
    >
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex touch-pan-y">
          {slides.map((slide, index) => {
            const SlideContent = (
              <>
                {/* Mobile Image (if provided) */}
                <Image
                  src={slide.mobileImageUrl || slide.imageUrl}
                  alt={slide.title || `Slide ${index + 1}`}
                  fill
                  priority={index === 0}
                  className={`object-cover ${slide.mobileImageUrl ? "sm:hidden" : ""}`}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 100vw"
                />
                {/* Desktop Image */}
                {slide.mobileImageUrl && (
                  <Image
                    src={slide.imageUrl}
                    alt={slide.title || `Slide ${index + 1}`}
                    fill
                    priority={index === 0}
                    className="hidden sm:block object-cover"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 100vw"
                  />
                )}

                {/* Overlay Content — minimal, bottom-aligned; image stays the focus */}
                {(slide.title || slide.subtitle || slide.linkText) && (
                  <div className="absolute inset-x-0 bottom-0 flex flex-col items-start text-white p-4 sm:p-5 md:p-7 pb-6 sm:pb-8 md:pb-11 select-none">
                    {/* Soft gradient only at the bottom for legibility */}
                    <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/60 via-black/15 to-transparent pointer-events-none" />

                    <div className="relative z-[1] flex flex-col items-start text-right max-w-[88%] sm:max-w-md">
                      {slide.title && (
                        <h2 className="text-sm sm:text-xl md:text-2xl lg:text-3xl font-bold drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)] leading-snug animate-in fade-in slide-in-from-bottom-2 duration-500 line-clamp-2 sm:line-clamp-none">
                          {slide.title}
                        </h2>
                      )}
                      {slide.subtitle && (
                        <p className="hidden sm:block text-xs sm:text-sm md:text-base text-white/85 drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)] font-normal mt-1.5 line-clamp-1 animate-in fade-in slide-in-from-bottom-1 duration-600 delay-100">
                          {slide.subtitle}
                        </p>
                      )}
                      {slide.linkText && (
                        <div className="mt-2.5 sm:mt-4 animate-in fade-in duration-700 delay-200">
                          <div className="inline-flex items-center gap-1 sm:gap-1.5 px-3 py-1.5 sm:px-5 sm:py-2 bg-white/95 backdrop-blur-sm text-gray-900 font-bold rounded-lg sm:rounded-xl text-[11px] sm:text-xs md:text-sm shadow-md transition-all duration-300 group-hover:bg-primary-600 group-hover:text-white transform group-hover:scale-105 active:scale-95">
                            <span>{slide.linkText}</span>
                            <ChevronLeft className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 transition-transform duration-300 group-hover:-translate-x-1" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            );

            return slide.linkUrl ? (
              <a
                key={slide.id}
                href={slide.linkUrl}
                className="relative min-w-0 flex-[0_0_100%] aspect-[16/10] sm:aspect-[21/8.5] md:aspect-[3/0.95] lg:aspect-[4/1.1] block group"
              >
                {SlideContent}
              </a>
            ) : (
              <div
                key={slide.id}
                className="relative min-w-0 flex-[0_0_100%] aspect-[16/10] sm:aspect-[21/8.5] md:aspect-[3/0.95] lg:aspect-[4/1.1] group"
              >
                {SlideContent}
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation Arrows — desktop only; mobile relies on swipe + dots for app-like UX */}
      {slides.length > 1 && (
        <>
          <button
            className="hidden sm:flex absolute top-1/2 right-3 md:right-4 -translate-y-1/2 w-9 h-9 md:w-11 md:h-11 bg-white/80 hover:bg-white text-gray-800 rounded-full items-center justify-center shadow-lg ring-1 ring-black/5 backdrop-blur-md transition-all duration-300 hover:scale-110 active:scale-95 z-10 disabled:opacity-0"
            onClick={scrollPrev}
            disabled={prevBtnDisabled}
            aria-label="Previous slide"
          >
            <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
          </button>
          <button
            className="hidden sm:flex absolute top-1/2 left-3 md:left-4 -translate-y-1/2 w-9 h-9 md:w-11 md:h-11 bg-white/80 hover:bg-white text-gray-800 rounded-full items-center justify-center shadow-lg ring-1 ring-black/5 backdrop-blur-md transition-all duration-300 hover:scale-110 active:scale-95 z-10 disabled:opacity-0"
            onClick={scrollNext}
            disabled={nextBtnDisabled}
            aria-label="Next slide"
          >
            <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
          </button>

          {/* Pagination Dots — refined, minimal; mobile uses a progress indicator */}
          <div className="absolute bottom-3 md:bottom-5 left-0 right-0 flex justify-center items-center gap-1.5 md:gap-2 z-10">
            {scrollSnaps.map((_, index) => (
              <button
                key={index}
                className={`h-1.5 md:h-2 rounded-full transition-all duration-300 ${
                  index === selectedIndex
                    ? "bg-white w-5 md:w-7 shadow-[0_1px_4px_rgba(0,0,0,0.4)]"
                    : "bg-white/50 hover:bg-white/80 w-1.5 md:w-2"
                }`}
                onClick={() => scrollTo(index)}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
