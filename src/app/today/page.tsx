import type { Metadata } from 'next';
import { TodayPage } from '@/components/today/today-page';

export const metadata: Metadata = {
  title:       "Today's edition · Rig Wire",
  description: 'Pick where you start reading today. Six modes, six editions, one daily wire.',
};

export default function Today() {
  return <TodayPage />;
}
