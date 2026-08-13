"use client";

import { motion, useReducedMotion } from "framer-motion";

type HandWrittenTitleProps = {
  title: string;
  subtitle?: string;
};

export function HandWrittenTitle({ title, subtitle }: HandWrittenTitleProps) {
  const shouldReduceMotion = useReducedMotion();

  const titleInitial = shouldReduceMotion ? false : { opacity: 0, y: 16 };
  const titleAnimate = { opacity: 1, y: 0 };
  const pathInitial = shouldReduceMotion ? false : { pathLength: 0, opacity: 0 };
  const pathAnimate = { pathLength: 1, opacity: 1 };

  return (
    <div className="handwriting-title">
      <div className="handwriting-title__heading-wrap">
        <motion.h1
          className="handwriting-title__heading"
          initial={titleInitial}
          animate={titleAnimate}
          transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.7, ease: "easeOut" }}
        >
          {title}
        </motion.h1>
        <svg
          className="handwriting-title__circle"
          viewBox="0 0 420 150"
          fill="none"
          aria-hidden="true"
          focusable="false"
        >
          <motion.path
            d="M24 79C33 27 105 10 203 13C306 16 389 42 397 78C405 115 333 137 217 138C105 139 24 122 18 91C12 60 72 35 174 28C276 21 367 43 388 74"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={pathInitial}
            animate={pathAnimate}
            transition={shouldReduceMotion ? { duration: 0 } : { duration: 1.35, delay: 0.35, ease: "easeInOut" }}
          />
        </svg>
      </div>
      {subtitle && (
        <motion.p
          className="handwriting-title__subtitle"
          initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.55, delay: 1, ease: "easeOut" }}
        >
          {subtitle}
        </motion.p>
      )}
    </div>
  );
}
