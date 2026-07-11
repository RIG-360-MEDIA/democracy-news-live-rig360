'use client';

import { motion } from 'framer-motion';

const SPRING = [0.16, 1, 0.3, 1] as const;

export function Hero() {
  return (
    <section className="px-6 md:px-10 pt-14 md:pt-20 pb-10 md:pb-12 bg-white">
      <div className="mx-auto max-w-[1100px] text-center">

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: SPRING }}
          className="font-display text-[#1a1815] text-balance"
          style={{
            fontSize:      'clamp(2.75rem, 7vw, 6.25rem)',
            lineHeight:    '0.98',
            letterSpacing: '-0.03em',
            fontWeight:    700,
            fontVariationSettings: "'opsz' 144, 'SOFT' 30, 'WONK' 0",
          }}
        >
          Six readings of the same world.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: SPRING, delay: 0.2 }}
          className="font-sans text-[#4f4b46] mt-7 mx-auto text-balance"
          style={{
            fontSize:   'clamp(1.0625rem, 1.4vw, 1.3125rem)',
            lineHeight: '1.5',
            maxWidth:   '760px',
          }}
        >
          From a sixty-second pulse to a fourteen-minute report, Rig Wire is designed to deliver{' '}
          <strong className="text-[#1a1815] font-bold">
            fact-driven news synthesised from 247 newsrooms
          </strong>
          , without the opinions or distractions. One world. Pick your length.
        </motion.p>

      </div>
    </section>
  );
}
