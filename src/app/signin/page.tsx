import type { Metadata } from 'next';
import { AuthShell } from '@/components/auth/auth-shell';

export const metadata: Metadata = {
  title:       'Sign in · Rig Wire',
  description: 'Enter your email — we send you a link, you click it, you’re in. Pick up where you left off.',
};

export default function SigninPage() {
  return <AuthShell variant="signin" />;
}
