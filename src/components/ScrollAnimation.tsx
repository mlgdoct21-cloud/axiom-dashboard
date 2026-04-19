'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';

interface ScrollAnimationProps {
  children: ReactNode;
  animation?: 'fadeInUp' | 'fadeInDown' | 'scaleIn' | 'slideUp';
  delay?: number;
  threshold?: number;
  className?: string;
}

export default function ScrollAnimation({
  children,
  animation = 'fadeInUp',
  delay = 0,
  threshold = 0.1,
  className = '',
}: ScrollAnimationProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Add a small delay if specified
          if (delay > 0) {
            const timer = setTimeout(() => {
              setIsVisible(true);
            }, delay);
            return () => clearTimeout(timer);
          } else {
            setIsVisible(true);
          }
          // Optionally stop observing once visible
          if (ref.current) {
            observer.unobserve(ref.current);
          }
        }
      },
      {
        threshold,
        rootMargin: '0px 0px -100px 0px',
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [delay, threshold]);

  const animationClass = isVisible ? `animate-${animation}` : 'opacity-0';

  return (
    <div ref={ref} className={`${animationClass} ${className}`}>
      {children}
    </div>
  );
}
