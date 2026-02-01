import type { NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { ZabbixClient } from '@/lib/zabbix/client';

const isProduction = process.env.NODE_ENV === 'production';

export const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      id: 'zabbix',
      name: 'Zabbix',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        try {
          const client = new ZabbixClient({
            url: process.env.ZABBIX_URL || 'http://localhost:8080',
            user: credentials.username as string,
            password: credentials.password as string,
          });

          const authToken = await client.login();

          if (authToken) {
            let role: string = 'viewer';
            if ((credentials.username as string).toLowerCase() === 'admin') {
              role = 'admin';
            }

            await client.logout();

            // Audit log for successful login
            console.log(JSON.stringify({
              timestamp: new Date().toISOString(),
              action: 'LOGIN_SUCCESS',
              userId: credentials.username,
              role,
            }));

            return {
              id: credentials.username as string,
              name: credentials.username as string,
              email: `${credentials.username}@zabbix.local`,
              role,
            };
          }

          // Audit log for failed login
          console.log(JSON.stringify({
            timestamp: new Date().toISOString(),
            action: 'LOGIN_FAILED',
            userId: credentials.username,
            reason: 'Invalid credentials',
          }));

          return null;
        } catch (error) {
          // Audit log for error
          console.error(JSON.stringify({
            timestamp: new Date().toISOString(),
            action: 'LOGIN_ERROR',
            userId: credentials.username,
            error: error instanceof Error ? error.message : 'Unknown error',
          }));
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role || 'viewer';
        token.loginAt = Date.now();
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string; role?: string }).id = token.id as string;
        (session.user as { id?: string; role?: string }).role = token.role as string;
      }
      return session;
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 hours
    updateAge: 60 * 60, // 1 hour - refresh session
  },
  // Cookie security settings
  cookies: {
    sessionToken: {
      name: isProduction ? '__Secure-next-auth.session-token' : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: isProduction,
      },
    },
    callbackUrl: {
      name: isProduction ? '__Secure-next-auth.callback-url' : 'next-auth.callback-url',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: isProduction,
      },
    },
    csrfToken: {
      name: isProduction ? '__Host-next-auth.csrf-token' : 'next-auth.csrf-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: isProduction,
      },
    },
  },
  trustHost: true,
  // Enable debug in development only
  debug: !isProduction,
};
