import type { Variants } from 'framer-motion';

const EASE = [0.16, 1, 0.3, 1] as const;

/* Container — staggers the text-column and card-column. */
export const sectionContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.15,
      delayChildren:   0.1,
    },
  },
};

/* Text column entering from the LEFT. Cascades children. */
export const textFromLeft: Variants = {
  hidden: { opacity: 0, x: -64 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.85,
      ease: EASE,
      when: 'beforeChildren',
      staggerChildren: 0.08,
    },
  },
};

/* Text column entering from the RIGHT. */
export const textFromRight: Variants = {
  hidden: { opacity: 0, x: 64 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.85,
      ease: EASE,
      when: 'beforeChildren',
      staggerChildren: 0.08,
    },
  },
};

/* Each text item — kicker, headline, blurb, CTA — fades up in sequence. */
export const textItem: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: EASE },
  },
};

/* Card popping in from the RIGHT — spring physics, scale up,
   slight rotation that resolves to 0. */
export const cardFromRight: Variants = {
  hidden: { opacity: 0, scale: 0.88, rotate: 3, x: 90 },
  visible: {
    opacity: 1,
    scale:   1,
    rotate:  0,
    x:       0,
    transition: {
      type:      'spring',
      stiffness: 95,
      damping:   17,
      mass:      1.1,
    },
  },
};

/* Card popping in from the LEFT. */
export const cardFromLeft: Variants = {
  hidden: { opacity: 0, scale: 0.88, rotate: -3, x: -90 },
  visible: {
    opacity: 1,
    scale:   1,
    rotate:  0,
    x:       0,
    transition: {
      type:      'spring',
      stiffness: 95,
      damping:   17,
      mass:      1.1,
    },
  },
};
