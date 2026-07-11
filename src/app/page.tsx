import { TopAnnouncement } from '@/components/landing/top-announcement';
import { Nav }              from '@/components/brand/nav';
import { TopBar }           from '@/components/landing/top-bar';
import { Hero }             from '@/components/landing/hero';
import { ValueProps }       from '@/components/landing/value-props';
import { ExploreIntro }     from '@/components/landing/explore-intro';
import { SectionMinute }    from '@/components/landing/section-minute';
import { SectionDigest }    from '@/components/landing/section-digest';
import { SectionAllSides }  from '@/components/landing/section-all-sides';
import { SectionLongRead }  from '@/components/landing/section-long-read';
import { SectionLongView }  from '@/components/landing/section-long-view';
import { SectionQueue }     from '@/components/landing/section-queue';
import { FinalCta }         from '@/components/landing/final-cta';
import { Footer }           from '@/components/landing/footer';

export default function LandingPage() {
  return (
    <>
      <TopAnnouncement />
      <Nav />
      <TopBar />
      <main>
        <Hero />
        <ValueProps />
        <ExploreIntro />
        <SectionMinute />
        <SectionDigest />
        <SectionAllSides />
        <SectionLongRead />
        <SectionLongView />
        <SectionQueue />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
