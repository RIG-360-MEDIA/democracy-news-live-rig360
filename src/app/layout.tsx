import type { Metadata, Viewport } from 'next';
import {
  Fraunces,
  Plus_Jakarta_Sans,
  JetBrains_Mono,
  Bricolage_Grotesque,
} from 'next/font/google';
import './globals.css';

const fraunces = Fraunces({
  subsets:  ['latin'],
  variable: '--font-fraunces',
  display:  'swap',
  axes:     ['SOFT', 'WONK', 'opsz'],
});

const jakarta = Plus_Jakarta_Sans({
  subsets:  ['latin'],
  variable: '--font-jakarta',
  display:  'swap',
  weight:   ['400', '500', '600', '700', '800'],
});

const jetbrainsMono = JetBrains_Mono({
  subsets:  ['latin'],
  variable: '--font-mono',
  display:  'swap',
  weight:   ['400', '500', '700', '800'],
});

/* Bricolage Grotesque — display sans with prominent ink traps
   at heavy weights. The angular notches in R, W, K become
   alien geometric voids at masthead scale. Variable wdth axis
   left at 100 for normal width; can be compressed to 75. */
const bricolage = Bricolage_Grotesque({
  subsets:  ['latin'],
  variable: '--font-bricolage',
  display:  'swap',
  axes:     ['wdth', 'opsz'],
});

export const metadata: Metadata = {
  // Absolute base so relative OG image paths resolve for social scrapers (WhatsApp/X/FB/iMessage).
  metadataBase: new URL('https://global.democracynewslive.com'),
  title:       'Rig Wire — Six ways to read the world',
  description: 'Rig Wire synthesises 247 newsrooms into six reading formats — from a sixty-second pulse to a fourteen-minute report. Same world. Pick your length.',
  keywords:    ['news', 'curation', 'global news', 'newsletter', 'independent journalism', 'wire service'],
  authors:     [{ name: 'Rig Wire' }],
  openGraph: {
    title:       'Rig Wire',
    description: 'Six ways to read the world.',
    type:        'website',
    siteName:    'Democracy News Live',
    images:      [{ url: '/cards/placeholder.png', width: 1200, height: 630, alt: 'Democracy News Live' }],
  },
  twitter: {
    card:        'summary_large_image',
    title:       'Rig Wire',
    description: 'Six ways to read the world.',
    images:      ['/cards/placeholder.png'],
  },
};

export const viewport: Viewport = {
  themeColor:  '#ffffff',
  colorScheme: 'light',
};

// Set the reader theme before first paint (no flash of the wrong theme).
// Default is ALWAYS light/white — dark only if the user explicitly chose it (saved 'dark').
// We deliberately do NOT follow the OS prefers-color-scheme, so the site never opens dark by surprise.
const THEME_INIT = `(function(){try{document.documentElement.setAttribute('data-theme',localStorage.getItem('rw-theme')==='dark'?'dark':'light');}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-theme="light"
      suppressHydrationWarning
      className={`${fraunces.variable} ${jakarta.variable} ${jetbrainsMono.variable} ${bricolage.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
