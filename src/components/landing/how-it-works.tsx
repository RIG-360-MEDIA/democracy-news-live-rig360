'use client';

import { motion } from 'framer-motion';

const SPRING = [0.16, 1, 0.3, 1] as const;

const STEPS = [
  {
    name: 'Curate',
    text: 'We select the best newsrooms across regions, perspectives, and beats — 247 sources in total, sampled deliberately.',
  },
  {
    name: 'Synthesise',
    text: 'We remove bias, framing, repetition and AI slop. Each story is rebuilt from its load-bearing facts.',
  },
  {
    name: 'Deliver',
    text: 'We deliver clear, easy-to-read insight in six formats — sixty seconds to fourteen minutes. You pick your length.',
  },
] as const;

export function HowItWorks() {
  return (
    <section id="how" className="px-6 md:px-10 py-16 md:py-24 bg-white">
      <div className="mx-auto max-w-[1100px]">

        {/* "How we do it" handwritten-feel intro with arrow */}
        <div className="relative flex justify-center mb-10 md:mb-12">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.7 }}
            className="relative inline-flex items-center gap-2"
          >
            <span
              className="font-display italic text-[#4f4b46]"
              style={{
                fontSize: 'clamp(1.125rem, 1.5vw, 1.375rem)',
                fontVariationSettings: "'opsz' 144, 'SOFT' 100",
              }}
            >
              How we do it
            </span>
            <svg width="32" height="20" viewBox="0 0 32 20" fill="none" className="text-[#4f4b46]">
              <path
                d="M2 4 Q 10 18, 28 14 L 24 10 M 28 14 L 26 18"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          </motion.div>
        </div>

        <div className="grid md:grid-cols-3 gap-10 md:gap-12 text-center">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.7, ease: SPRING, delay: i * 0.1 }}
            >
              <h3
                className="font-display text-[#1a1815] mb-3"
                style={{
                  fontSize: 'clamp(1.75rem, 2.6vw, 2.25rem)',
                  fontWeight: 600,
                  letterSpacing: '-0.02em',
                  fontVariationSettings: "'opsz' 144, 'SOFT' 80",
                }}
              >
                {step.name}
              </h3>
              <p className="font-sans text-[15px] text-[#4f4b46] leading-[1.55] max-w-[300px] mx-auto">
                {step.text}
              </p>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
