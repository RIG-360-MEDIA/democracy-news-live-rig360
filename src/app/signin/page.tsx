import type { Metadata } from 'next';
import { AuthShell } from '@/components/auth/auth-shell';
import { BRAND } from '@/lib/brand';

export const metadata: Metadata = {
  title:       `Sign in · ${BRAND.name}`,
  description: 'Enter your email — we send you a link, you click it, you’re in. Pick up where you left off.',
};

export default function SigninPage() {
  return <AuthShell variant="signin" />;
}
