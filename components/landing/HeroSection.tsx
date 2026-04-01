'use client';

import { ReactNode } from 'react';
import { AnimatedSection } from '~/components/AnimatedSection';
import { StaggeredAnimation } from '~/components/StaggeredAnimation';

interface HeroSectionProps {
  title: ReactNode;
  description: ReactNode;
  cta: ReactNode;
  dateRange?: ReactNode;
  metrics: ReactNode;
}

export function HeroSection({
  title,
  description,
  cta,
  dateRange,
  metrics,
}: HeroSectionProps) {
  return (
    <section className="grid items-stretch gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.4fr)]">
      <div className="lg:self-stretch lg:flex lg:flex-col lg:justify-center">
        <AnimatedSection animation="fade-in-down">
          <h1 className="text-4xl font-semibold leading-[0.95] text-white sm:text-5xl lg:text-6xl">
            {title}
          </h1>
        </AnimatedSection>
        <AnimatedSection animation="fade-in-up" delay={150}>
          <p className="mt-5 text-base leading-7 text-slate-300 sm:text-lg">
            {description}
          </p>
        </AnimatedSection>

        <AnimatedSection animation="fade-in-up" delay={300} className="mt-8 flex flex-wrap items-center gap-3">
          <div>{cta}</div>
          {dateRange ? <div>{dateRange}</div> : null}
        </AnimatedSection>
      </div>

      <StaggeredAnimation animation="fade-in-up" staggerDelay={100} className="grid grid-cols-1 gap-3 h-full [&>*]:flex-1 content-center sm:grid-cols-2 lg:grid-cols-1">
        {metrics}
      </StaggeredAnimation>
    </section>
  );
}
