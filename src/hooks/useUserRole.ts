import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type AppRole = 'admin' | 'moderator' | 'user';

export function useUserRole() {
  const { user, loading: authLoading } = useAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (authLoading) return;
    if (!user) {
      setRole(null);
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .order('role', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;
      if (error) {
        console.warn('useUserRole error:', error);
        setRole(null);
      } else {
        setRole((data?.role as AppRole) ?? null);
      }
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [user, authLoading]);

  return { role, isAdmin: role === 'admin', loading: loading || authLoading };
}
