'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const STORAGE_KEY = 'rigwire:announcement-dismissed';

export function TopAnnouncement() {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.sessionStorage.getItem(STORAGE_KEY) === '1') {
      setOpen(false);
    }
  }, []);

  const dismiss = () => {
    setOpen(false);
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(STORAGE_KEY, '1');
    }
  };

  if (!open) return null;

  return (
    <div className="bg-[#e8dffb] border-b border-[#d8c8f0]">
      <div className="mx-auto max-w-[1200px] px-6 md:px-10 py-2.5 flex items-center justify-center relative">

        <p className="font-sans text-[13px] text-[#2a225e] text-center pr-8">
          Welcome to Rig Wire —{' '}
          <Link
            href="/about"
            className="font-semibold underline underline-offset-[3px] decoration-[1px] hover:text-[#0f1339] transition-colors"
          >
            Read more about how we work
          </Link>
        </p>

        <button
          onClick={dismiss}
          aria-label="Dismiss announcement"
          className="absolute right-4 md:right-10 text-[#2a225e] hover:text-[#0f1339] transition-colors p-1"
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden>
            <path d="M1 1 L12 12 M12 1 L1 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

      </div>
    </div>
  );
}
