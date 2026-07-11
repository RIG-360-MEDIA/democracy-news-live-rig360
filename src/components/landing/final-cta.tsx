'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

const SPRING = [0.16, 1, 0.3, 1] as const;

export function FinalCta() {
  const [email, setEmail]         = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitted(true);
  };

  return (
    <section className="px-6 md:px-10 py-24 md:py-32 bg-[#e8dffb]">
      <div className="mx-auto max-w-[820px] text-center">

        <motion.h2
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.8, ease: SPRING }}
          className="font-display text-[#1a1815] text-balance mb-5"
          style={{
            fontSize: 'clamp(2.25rem, 4.8vw, 4rem)',
            lineHeight: 1.04,
            letterSpacing: '-0.025em',
            fontWeight: 500,
            fontVariationSettings: "'opsz' 144, 'SOFT' 80",
          }}
        >
          Six readings of the same world.
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="font-sans text-[#2a225e] mb-10 max-w-[580px] mx-auto"
          style={{ fontSize: 'clamp(1rem, 1.3vw, 1.125rem)', lineHeight: 1.55 }}
        >
          Start with the Digest — five minutes, every morning. Free, in your inbox.
          The other five modes unlock as you read.
        </motion.p>

        {submitted ? (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="font-sans text-[15px] text-[#2a225e] font-semibold"
          >
            Check your inbox to confirm. Tomorrow morning&rsquo;s Digest is on the way.
          </motion.p>
        ) : (
          <motion.form
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.7, ease: SPRING, delay: 0.2 }}
            onSubmit={handleSubmit}
            className="flex flex-col sm:flex-row items-stretch h-auto sm:h-12 max-w-[480px] mx-auto gap-2 sm:gap-0"
          >
            <input
              type="email"
              required
              placeholder="Your Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-label="Email address"
              className="flex-1 min-w-0 h-12 sm:h-full bg-white px-4 font-sans text-[14px] text-[#1a1815] placeholder:text-[#9c95b3] outline-none focus:ring-2 focus:ring-[#1f234a] focus:ring-inset transition"
            />
            <button
              type="submit"
              className="h-12 sm:h-full px-7 bg-[#1f234a] text-white font-sans text-[14px] font-bold hover:bg-[#0f1339] transition-colors"
            >
              Subscribe — free
            </button>
          </motion.form>
        )}

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-7 font-sans text-[12px] text-[#4d3f7a]"
        >
          No password &middot; No credit card &middot; Unsubscribe anytime
        </motion.p>

      </div>
    </section>
  );
}
