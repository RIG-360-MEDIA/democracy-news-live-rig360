'use client';

import { motion } from 'framer-motion';

const SPRING = [0.16, 1, 0.3, 1] as const;

export function ExploreIntro() {
  return (
    <section className="px-6 md:px-10 pt-16 pb-6 md:pt-24 md:pb-10 bg-white">
      <div className="mx-auto max-w-[1100px] text-center">

        <motion.h2
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.8, ease: SPRING }}
          className="font-display text-[#1a1815] text-balance"
          style={{
            fontSize: 'clamp(2rem, 4.4vw, 3.75rem)',
            lineHeight: 1.04,
            letterSpacing: '-0.024em',
            fontWeight: 500,
            fontVariationSettings: "'opsz' 144, 'SOFT' 80",
          }}
        >
          Read it your way.
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="font-sans text-[15px] md:text-[17px] text-[#4f4b46] mt-5 max-w-[640px] mx-auto leading-[1.55]"
        >
          Sixty seconds. Five minutes. Fourteen. Six different ways into the same world —
          pick the one that fits the time you have.
        </motion.p>

      </div>
    </section>
  );
}
