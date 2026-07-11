'use client';

import Link from 'next/link';
import { Wordmark } from './wordmark';

export function Nav() {
  return (
    <header className="sticky top-0 inset-x-0 z-30 bg-white border-b border-[#e8e5e0]">
      {/* Two-group layout: wordmark anchors left, everything else clusters right.
          Wordmark is the visual wall — no isolated drift in the middle. */}
      <div className="mx-auto max-w-[1200px] h-[80px] px-6 md:px-10 flex items-center justify-between gap-8">

        <Wordmark size="md" />

        <div className="flex items-center gap-9">
          <nav className="hidden lg:flex items-center gap-8 font-sans text-[14px] font-medium text-[#1a1815]">
            <Link href="#modes" className="hover:editorial-underline transition-all">
              The six modes
            </Link>
            <Link href="#how" className="hover:editorial-underline transition-all">
              How it works
            </Link>
            <Link href="/today" className="hover:editorial-underline transition-all">
              Today&rsquo;s edition
            </Link>
          </nav>

          <div className="flex items-center gap-5">
            <Link
              href="/signin"
              className="hidden sm:inline-block font-sans text-[14px] font-medium text-[#1a1815] hover:editorial-underline transition-all"
            >
              Sign in
            </Link>
            <Link
              href="#subscribe"
              className="inline-flex items-center px-5 h-10 bg-[#1f234a] text-white font-sans text-[13px] font-bold hover:bg-[#0f1339] transition-colors"
            >
              Subscribe
            </Link>
          </div>
        </div>

      </div>
    </header>
  );
}
