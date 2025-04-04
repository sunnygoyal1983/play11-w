import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth-options';

// Use the centralized auth options from lib/auth-options.ts
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
