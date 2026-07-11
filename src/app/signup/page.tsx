import type { Metadata } from 'next';
import { AuthShell } from '@/components/auth/auth-shell';

export const metadata: Metadata = {
  title:       'Start reading · Rig Wire',
  description: 'Enter your email — we send you a link, you click it, you’re in. Six ways to read the world.',
};

export default function SignupPage() {
  return <AuthShell variant="signup" />;
}
