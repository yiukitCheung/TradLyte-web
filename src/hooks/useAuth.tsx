import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { setSessionPassword, clearSessionPassword } from '@/lib/sessionSecret';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Sign up with email + password, but use the phone number as the validation
  // factor. With "Confirm phone" enabled, Supabase sends an SMS OTP as part of
  // sign-up and only returns a session once that code is verified.
  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    phone: string,
  ) => {
    const { error } = await supabase.auth.signUp({
      email,
      phone,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
      // The JS types model email/phone as mutually exclusive, but gotrue accepts
      // both on the signup endpoint.
    } as Parameters<typeof supabase.auth.signUp>[0]);
    // Hold the password in memory so the financial vault can derive its key for
    // seamless unlock (never persisted; see sessionSecret).
    if (!error) setSessionPassword(password);
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!error) {
      setSessionPassword(password);
      navigate('/dashboard');
    }

    return { error };
  };

  // Confirm the SMS OTP sent during sign-up. This establishes the session.
  const verifyPhone = async (phone: string, token: string) => {
    const { error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: 'sms',
    });
    return { error };
  };

  // Re-send the SMS OTP for an account whose phone isn't verified yet.
  const resendPhoneOtp = async (phone: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      phone,
      options: { shouldCreateUser: false },
    });
    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      clearSessionPassword();
      navigate('/');
    }
    return { error };
  };

  return {
    user,
    session,
    loading,
    signUp,
    signIn,
    verifyPhone,
    resendPhoneOtp,
    signOut,
  };
};
