'use client';

import { useState } from 'react';

export function TopBar() {
  const [email, setEmail]         = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitted(true);
  };

  return (
    <div
      id="subscribe"
      className="bg-[#e8dffb]"
    >
      <div className="mx-auto max-w-[1200px] px-6 md:px-10 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">

        <div className="flex-1 min-w-0">
          <p className="font-display text-[15px] md:text-[16px] text-[#2a225e] font-semibold">
            Subscribe to the Rig Wire Daily Digest
          </p>
          <p className="font-sans text-[13px] text-[#4d3f7a] mt-0.5">
            The most impactful stories of the day, expertly curated and explained.{' '}
            <em className="font-display italic">100% free, unsubscribe anytime.</em>
          </p>
        </div>

        {submitted ? (
          <p className="font-sans text-[14px] text-[#2a225e] font-semibold">
            Check your inbox to confirm.
          </p>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="flex items-stretch h-11 w-full md:w-auto md:min-w-[440px]"
          >
            <input
              type="email"
              required
              placeholder="Your Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-label="Email address"
              className="flex-1 min-w-0 bg-white px-4 font-sans text-[14px] text-[#1a1815] placeholder:text-[#9c95b3] outline-none focus:ring-2 focus:ring-[#1f234a] focus:ring-inset transition"
            />
            <button
              type="submit"
              className="bg-[#1f234a] text-white font-sans text-[14px] font-bold px-6 hover:bg-[#0f1339] transition-colors"
            >
              Subscribe
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
