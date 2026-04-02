'use client';

import { ReactNode, useEffect, useRef, type ReactElement, type SVGProps } from 'react';
import { AnimatedSection } from '~/components/AnimatedSection';

interface MapSectionProps {
  eyebrow: ReactNode;
  heading: ReactNode;
  description: ReactNode;
  mapContent: ReactElement<SVGProps<SVGSVGElement>>;
  sidebarContent?: ReactNode;
  bottomRightContent?: ReactNode;
}

export function MapSection({
  eyebrow,
  heading,
  description,
  mapContent,
  sidebarContent,
  bottomRightContent,
}: MapSectionProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const hasAnimatedRef = useRef(false);

  useEffect(() => {
    if (hasAnimatedRef.current) return;
    hasAnimatedRef.current = true;

    const mapContainer = mapContainerRef.current;
    if (!mapContainer) return;

    const svg = mapContainer.querySelector('svg[data-landing-map-preview="true"]') as SVGSVGElement | null;
    if (!svg) return;

    const pathElement = svg.querySelector('[data-animated-path="true"]') as SVGPathElement | null;
    if (pathElement) {
      const length = pathElement.getTotalLength();
      pathElement.style.strokeDasharray = String(length);
      pathElement.style.strokeDashoffset = String(length);
      pathElement.style.opacity = '1';
      void pathElement.getBoundingClientRect();
      pathElement.style.transition = 'stroke-dashoffset 2.2s ease-in-out';
      pathElement.style.strokeDashoffset = '0';
    }

    const markers = svg.querySelectorAll('[data-animated-marker="true"]') as NodeListOf<SVGGElement>;
    markers.forEach((marker, index) => {
      window.setTimeout(() => {
        marker.style.transition = 'opacity 0.4s ease-out';
        marker.style.opacity = '1';
        window.setTimeout(() => {
          marker.querySelector('path')?.classList.add('animate-pulse-soft');
        }, 400);
      }, 300 + index * 300);
    });
  }, []);

  return (
    <AnimatedSection animation="fade-in-up">
      <article className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/5 p-6 shadow-[0_24px_90px_rgba(2,6,23,0.4)] backdrop-blur-sm">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center">
          <div className="lg:flex lg:min-h-full lg:flex-col lg:justify-center">
            {eyebrow}
            <h2 className="mt-5 text-2xl font-semibold text-white">{heading}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              {description}
            </p>
          </div>

          <div ref={mapContainerRef} className="relative h-72 overflow-hidden rounded-[1.5rem] border border-slate-800/95 bg-slate-950/60 lg:h-80">
            {mapContent}
            {sidebarContent && (
              <div aria-hidden="true" className="absolute inset-y-2.5 left-2.5 z-10 w-[30%] min-w-[9rem] overflow-hidden rounded-xl border border-slate-700/90 bg-slate-950/86 shadow-2xl backdrop-blur-sm opacity-0 animate-fade-in-left lg:w-[15rem]" style={{ animationDelay: '800ms' }}>
                {sidebarContent}
              </div>
            )}
            {bottomRightContent && (
              <div className="absolute bottom-2.5 right-2.5 z-10 w-32 rounded-lg border border-slate-700/90 bg-slate-950/84 p-1.5 shadow-[0_18px_40px_rgba(2,6,23,0.42)] backdrop-blur-md opacity-0 animate-fade-in-right" style={{ animationDelay: '1000ms' }}>
                {bottomRightContent}
              </div>
            )}
          </div>
        </div>
      </article>
    </AnimatedSection>
  );
}
