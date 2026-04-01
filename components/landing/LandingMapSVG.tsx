'use client';

import { useEffect, useRef } from 'react';

interface LandingMapSVGProps {
  children: React.ReactNode;
}

/**
 * Client component to handle SVG map animations
 * Animates the route path and markers on component mount
 */
export function LandingMapSVG({ children }: LandingMapSVGProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    // Guard against React Strict Mode double-invocation and re-renders
    if (hasAnimated.current) return;
    hasAnimated.current = true;

    const container = containerRef.current;
    if (!container) return;

    // Animate the route path using CSS transition so the actual path length is used
    const pathElement = container.querySelector('[data-animated-path="true"]') as SVGPathElement | null;
    if (pathElement) {
      const length = pathElement.getTotalLength();
      pathElement.style.strokeDasharray = String(length);
      pathElement.style.strokeDashoffset = String(length);
      pathElement.style.opacity = '1';
      // Force reflow so the browser registers the initial dashoffset before transitioning
      void pathElement.getBoundingClientRect();
      pathElement.style.transition = 'stroke-dashoffset 2.2s ease-in-out';
      pathElement.style.strokeDashoffset = '0';
    }

    // Animate markers with staggered opacity fade-in
    // (CSS transform on SVG <g> requires transform-box:fill-box; opacity is more reliable)
    const markers = container.querySelectorAll('[data-animated-marker="true"]') as NodeListOf<SVGGElement>;
    markers.forEach((marker, index) => {
      setTimeout(() => {
        marker.style.transition = 'opacity 0.4s ease-out';
        marker.style.opacity = '1';
        setTimeout(() => {
          marker.querySelector('path')?.classList.add('animate-pulse-soft');
        }, 400);
      }, 300 + index * 300);
    });
  }, []);

  return <div ref={containerRef}>{children}</div>;
}
