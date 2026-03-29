'use client'
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-client';
import { useRouter, usePathname } from 'next/navigation';

export type UserRole = 'admin' | 'contractor' | 'homeowner';

interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  full_name: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
});

// Pages that don't require authentication
const PUBLIC_PATHS = ['/login', '/signup', '/', '/confirm-visit'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Check for existing session
    async function getSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          // Fetch profile with role
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, role')
            .eq('id', session.user.id)
            .single();

          setUser({
            id: session.user.id,
            email: session.user.email || '',
            role: profile?.role || 'homeowner',
            full_name: profile?.full_name || session.user.email || '',
          });
        } else {
          setUser(null);
          // Redirect to login if on a protected page
          const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p));
          if (!isPublic) {
            router.push('/login');
          }
        }
      } catch (err) {
        console.error('Auth error:', err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    getSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, role')
            .eq('id', session.user.id)
            .single();

          setUser({
            id: session.user.id,
            email: session.user.email || '',
            role: profile?.role || 'homeowner',
            full_name: profile?.full_name || session.user.email || '',
          });
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          router.push('/login');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [pathname, router]);

  const signOut = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
