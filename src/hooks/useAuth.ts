import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { sanitizeError, logError } from '@/lib/errors';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        logError(error, 'useAuth.signIn');
        toast({
          title: "Erro ao entrar",
          description: sanitizeError(error),
          variant: "destructive",
        });
        return { error };
      }
      
      // Redirect to intended destination or dashboard
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
      return { error: null };
    } catch (err) {
      logError(err, 'useAuth.signIn.catch');
      toast({
        title: "Erro ao entrar",
        description: sanitizeError(err),
        variant: "destructive",
      });
      return { error: err };
    }
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      const redirectUrl = `${window.location.origin}/dashboard`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
          },
        },
      });
      
      if (error) {
        logError(error, 'useAuth.signUp');
        toast({
          title: "Erro ao criar conta",
          description: sanitizeError(error),
          variant: "destructive",
        });
        return { error };
      }
      
      toast({
        title: "Conta criada com sucesso!",
        description: "Você já pode acessar a plataforma.",
      });
      
      navigate('/dashboard');
      return { error: null };
    } catch (err) {
      logError(err, 'useAuth.signUp.catch');
      toast({
        title: "Erro ao criar conta",
        description: sanitizeError(err),
        variant: "destructive",
      });
      return { error: err };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/login');
    } catch (err) {
      logError(err, 'useAuth.signOut');
    }
  };

  return {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
  };
};
