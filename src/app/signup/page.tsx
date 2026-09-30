import type { Metadata } from 'next';
import { AuthShell } from '@/components/auth/auth-shell';
import { BRAND } from '@/lib/brand';

export const metadata: Metadata = {
  title:       `Start reading · ${BRAND.name}`,
  description: 'Enter your email — we send you a link, you click it, you’re in. Six ways to read the world.',
};

export default function SignupPage() {
  return <AuthShell variant="signup" />;
}
