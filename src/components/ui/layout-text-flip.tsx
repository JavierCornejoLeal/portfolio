"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/*
 * Layout Text Flip, from Aceternity UI. Deviations from the source, all deliberate:
 * - The word chip uses the source's dark-mode utilities unconditionally. The site is dark only, and `dark:`
 *   follows the OS colour scheme, which would show a white chip with black text to visitors in light mode.
 * - `className` props let the page size the text; the defaults are the source's sizes.
 * - Under reduced motion the word swaps with a plain fade instead of sliding through a blur.
 * - The interval restarts when `words` or `duration` change (the source's effect had no dependencies).
 * - The unused default `React` import is dropped.
 */
export const LayoutTextFlip = ({
  text = "Build Amazing",
  words = ["Landing Pages", "Component Blocks", "Page Sections", "3D Shaders"],
  duration = 3000,
  className,
  wordClassName,
}: {
  text: string;
  words: string[];
  duration?: number;
  className?: string;
  wordClassName?: string;
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % words.length);
    }, duration);

    return () => clearInterval(interval);
  }, [words.length, duration]);

  return (
    <>
      <motion.span
        layoutId="subtext"
        className={cn("text-2xl font-bold tracking-tight drop-shadow-lg md:text-4xl", className)}
      >
        {text}
      </motion.span>

      <motion.span
        layout
        className={cn(
          "relative w-fit overflow-hidden rounded-md border border-transparent bg-neutral-900 px-4 py-2 font-sans text-2xl font-bold tracking-tight text-white shadow-sm ring-1 shadow-white/10 ring-white/10 drop-shadow-lg md:text-4xl",
          wordClassName,
        )}
      >
        <AnimatePresence mode="popLayout">
          <motion.span
            key={currentIndex}
            initial={reduce ? { opacity: 0 } : { y: -40, filter: "blur(10px)" }}
            animate={
              reduce
                ? { opacity: 1 }
                : {
                    y: 0,
                    filter: "blur(0px)",
                  }
            }
            exit={reduce ? { opacity: 0 } : { y: 50, filter: "blur(10px)", opacity: 0 }}
            transition={{
              duration: reduce ? 0.2 : 0.5,
            }}
            className={cn("inline-block whitespace-nowrap")}
          >
            {words[currentIndex]}
          </motion.span>
        </AnimatePresence>
      </motion.span>
    </>
  );
};
