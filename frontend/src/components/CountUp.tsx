'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';

interface CountUpProps {
  end: number;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}

export function CountUp({
  end,
  duration = 1.2,
  className,
  prefix = '',
  suffix = '',
  decimals = 0,
}: CountUpProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });
  const startedRef = useRef(false);

  useEffect(() => {
    if (!inView || startedRef.current) return;
    startedRef.current = true;

    const startTime = performance.now();
    let rafId: number;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / (duration * 1000), 1);

      // ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1)
      const eased = 1 - Math.pow(1 - progress, 4);

      setDisplayValue(end * eased);

      if (progress < 1) {
        rafId = requestAnimationFrame(animate);
      } else {
        setDisplayValue(end);
      }
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [end, duration, inView]);

  return (
    <motion.span
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 4 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      {prefix}
      {decimals > 0 ? displayValue.toFixed(decimals) : Math.round(displayValue).toLocaleString()}
      {suffix}
    </motion.span>
  );
}
