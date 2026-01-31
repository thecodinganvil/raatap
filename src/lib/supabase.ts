import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Check if Supabase credentials are configured
const isConfigured = supabaseUrl && 
                     supabaseAnonKey && 
                     supabaseUrl.startsWith('http') &&
                     !supabaseUrl.includes('your-project');

// Only create client if properly configured, otherwise use a dummy URL
const safeUrl = isConfigured ? supabaseUrl : 'https://placeholder.supabase.co';
const safeKey = isConfigured ? supabaseAnonKey : 'placeholder-key';

export const supabase = createBrowserClient(safeUrl, safeKey);

// Helper to check if Supabase is properly configured
export const isSupabaseConfigured = () => isConfigured;
