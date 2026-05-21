import { createClient } from '@supabase/supabase-js'

// Menggunakan URL project dan Anon Key asli milik Alifia
const supabaseUrl = 'https://qfwofbusegizgzrjbvcu.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmd29mYnVzZWdpemd6cmpidmN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyODM5NjgsImV4cCI6MjA5NDg1OTk2OH0.Oa2SEsozG8ZxdB34q9oHSZB3jstw9lx02cmMiescVvo'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)