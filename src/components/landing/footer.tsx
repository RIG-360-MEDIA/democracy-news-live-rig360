import Link from 'next/link';
import { Wordmark } from '@/components/brand/wordmark';
import { MODES } from '@/lib/modes';

const COLUMNS = [
  {
    title: 'Modes',
    links: MODES.map((m) => ({ label: m.name, href: m.href })),
  },
  {
    title: 'Read',
    links: [
      { label: "Today's edition", href: '/today' },
      { label: 'Archive',         href: '/archive' },
      { label: 'Sources',         href: '/sources' },
      { label: 'Topics',          href: '/topics' },
    ],
  },
  {
    title: 'About',
    links: [
      { label: 'Editorial standards', href: '/standards' },
      { label: 'Masthead',            href: '/team' },
      { label: 'Methodology',         href: '/method' },
      { label: 'Contact',             href: '/contact' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Terms',   href: '/legal/terms' },
      { label: 'Privacy', href: '/legal/privacy' },
      { label: 'Cookies', href: '/legal/cookies' },
      { label: 'Imprint', href: '/legal/imprint' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="px-6 md:px-10 py-16 md:py-20 bg-white border-t border-[#e8e5e0]">
      <div className="mx-auto max-w-[1200px]">

        <div className="grid md:grid-cols-[1.2fr_2fr] gap-12 md:gap-16 mb-12">

          <div>
            <Wordmark size="lg" />
            <p
              className="font-sans mt-4"
              style={{ color: '#7a756e', fontSize: 11, fontWeight: 700, letterSpacing: '0.16em' }}
            >
              EST. 2025 &nbsp;·&nbsp; INDEPENDENT WIRE SERVICE
            </p>
            <p className="font-sans text-[14px] text-[#4f4b46] leading-[1.6] mt-5 max-w-[340px]">
              247 newsrooms, synthesised into six reading formats — from a sixty-second
              pulse to a fourteen-minute report.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <p
                  className="font-sans mb-5"
                  style={{ color: '#1a1815', fontSize: 11, fontWeight: 700, letterSpacing: '0.16em' }}
                >
                  {col.title.toUpperCase()}
                </p>
                <ul className="space-y-3">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="font-sans text-[13.5px] text-[#4f4b46] hover:text-[#1a1815] hover:editorial-underline transition-all"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="h-px bg-[#e8e5e0] mb-7" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="font-sans text-[12px] text-[#7a756e]">
            © 2025 Rig Wire &nbsp;·&nbsp; All rights reserved
          </p>
          <p className="font-sans text-[12px] text-[#7a756e]">
            247 sources &nbsp;·&nbsp; 6 formats &nbsp;·&nbsp; updated every 5 min
          </p>
        </div>

      </div>
    </footer>
  );
}
