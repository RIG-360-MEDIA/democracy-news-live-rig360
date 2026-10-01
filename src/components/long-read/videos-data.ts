// Video section data — Democracy News Live's own YouTube channel, embedded.
//
// The band renders `videos` (below) as an editorial "Watch" section and swaps in the real
// youtube.com/embed player on click (inline, or in Theater mode). Empty list ⇒ nothing renders.
// Titles/thumbnails come from each id (thumbnail derived; titles pulled from YouTube oEmbed).
// `duration` is optional — omit it and the timecode badge is simply not shown.
// `publishedAt` is required: only clips from the last 30 days reach the rail (E6), and when none
// qualify the band is hidden. Add new uploads here with their publish date to bring it back.

export const CHANNEL_URL = 'https://www.youtube.com/@democracynewslive8562';

export type Video = {
  /** YouTube video id, e.g. the `Sbj8rviLnnM` in youtu.be/Sbj8rviLnnM. Thumbnail + embed derive from it. */
  youtubeId: string;
  title: string;
  /** Short category label shown as the kicker, e.g. 'Feature · International'. */
  kicker: string;
  kind: 'feature' | 'programme' | 'short';
  /** Runtime as 'M:SS' — optional; omit to hide the timecode badge. */
  duration?: string;
  /** YouTube publish time, ISO-8601 UTC (channel RSS `<published>`). The Watch rail shows only clips
   *  from the last 30 days (recentVideos) — an entry without a valid date is never rendered. */
  publishedAt: string;
};

export const videos: Video[] = [
  { youtubeId: 'Sbj8rviLnnM', title: 'The Blood Feud Behind the Iran Ceasefire Collapse', kicker: 'Feature · International', kind: 'feature', publishedAt: '2026-07-13T03:17:54Z' },
  { youtubeId: '00evJlBZtUA', title: "How One Idea Broke an Army | India's Cognitive Warfare in 1971", kicker: 'The Long View · History', kind: 'programme', publishedAt: '2026-06-20T04:28:49Z' },
  { youtubeId: 'HGqMjdRlcJ0', title: 'The oldest trick in war isn’t brute force. It’s deception.', kicker: 'Explainer · Warfare', kind: 'programme', publishedAt: '2026-04-24T17:22:19Z' },
  { youtubeId: '71piGWaEv0g', title: 'Article 21 Under Threat? Kejriwal, BNS 238 and the False-Charges Question', kicker: 'The Explainer · Law', kind: 'programme', publishedAt: '2026-03-03T08:08:58Z' },
  { youtubeId: 'NTIzYmHlN0k', title: "Romeo Mikautadze | Georgia's Journey to Sustainability and the Silk Road", kicker: 'The Interview · Georgia', kind: 'programme', publishedAt: '2023-10-27T00:00:00Z' },
  { youtubeId: 'Kc9ECYQ1wq8', title: "International Tourists Fuel Georgia's Economic Growth | Mariam Kvrivishvili", kicker: 'The Interview · Georgia', kind: 'programme', publishedAt: '2023-10-29T00:00:00Z' },
  { youtubeId: 'Ukoj6pCpMV0', title: 'The World Bank on Extending Support to Georgia | Undersea Cable in the Black Sea', kicker: 'The Interview · Georgia', kind: 'programme', publishedAt: '2023-10-26T00:00:00Z' },
  { youtubeId: '0UeypRsI9aA', title: 'Lockdown Imposed in Australia Again | Latest English News', kicker: 'Short · Bulletin', kind: 'short', publishedAt: '2021-06-30T00:00:00Z' },
  { youtubeId: 'q1Z4_I_kKdI', title: 'Biden meets Israeli President Rivlin | Latest English News', kicker: 'Short · Bulletin', kind: 'short', publishedAt: '2021-06-29T00:00:00Z' },
];
