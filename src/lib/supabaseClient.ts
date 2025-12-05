import { createClient } from '@supabase/supabase-js';

// Use environment variables for Supabase connection
// In SvelteKit, these should be prefixed with VITE_ or PUBLIC_ depending on where they are used.
// Assuming standard Vite/SvelteKit setup.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase URL or Anon Key missing in environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
