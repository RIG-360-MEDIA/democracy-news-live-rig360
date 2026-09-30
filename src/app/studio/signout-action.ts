'use server';

// F5: Studio had no way to sign out.
import { signOut } from '@/lib/auth';

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: '/signin' });
}
