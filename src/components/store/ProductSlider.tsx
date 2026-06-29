"use client";

import React, { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronRight, ChevronLeft } from "lucide-react";

interface ProductSliderProps {
  title?: string;
  children: React.ReactNode;
}

export default function ProductSlider({ title, children }: ProductSliderProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    direction: "rtl",
    containScroll: "trimSnaps",
    dragFree: true,
  });

  const [prevBtnDisabled, setPrevBtnDisabled] = useState(true);
  const [nextBtnDisabled, setNextBtnDisabled] = useState(true);

  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);

  const onSelect = useCallback((emblaApi: any) => {
    setPrevBtnDisabled(!emblaApi.canScrollPrev());
    setNextBtnDisabled(!emblaApi.canScrollNext());
  }, []);

  useEffect(() => {
    if (!emblaApi) return;

    onSelect(emblaApi);
    emblaApi.on("reInit", onSelect);
    emblaApi.on("select", onSelect);
  }, [emblaApi, onSelect]);

  return (
    <div className="w-full py-6" dir="rtl">
      {title && (
        <div className="flex items-center justify-between mb-4 px-4 md:px-6">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">{title}</h2>
          <div className="flex gap-2">
            <button
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              onClick={scrollPrev}
              disabled={prevBtnDisabled}
              aria-label="Previous"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
            <button
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              onClick={scrollNext}
              disabled={nextBtnDisabled}
              aria-label="Next"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden px-4 md:px-6" ref={emblaRef}>
        <div className="flex gap-4 touch-pan-y">
          {/* Children should be mapped and wrapped in a div with flex-[0_0_auto] */}
          {React.Children.map(children, (child) => (
            <div className="flex-[0_0_70%] sm:flex-[0_0_45%] md:flex-[0_0_30%] lg:flex-[0_0_20%] min-w-0">
              {child}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
