const { createClient } = require('@supabase/supabase-js');

// Manually add your Supabase credentials here
const SUPABASE_URL = 'https://vcpgstlpfrmnadjuxipj.supabase.co'; // <-- REPLACE with your actual Supabase URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjcGdzdGxwZnJtbmFkanV4aXBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAyNDkzNzksImV4cCI6MjA2NTgyNTM3OX0.fQWmfrMEM2kbqrF47dknzVmRGZ4lZSaATwijQn07uc0'; // <-- REPLACE with your actual anon key

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

module.exports = supabase;