// ============================================================
//  supabaseClient.js  —  the "phone line" to your database
//  Put this file in your project's  src/  folder.
//
//  HOW TO FILL IN YOUR TWO VALUES:
//  1. In Supabase: Project Settings → API
//  2. Copy "Project URL" into SUPABASE_URL below
//  3. Copy the "anon public" key into SUPABASE_ANON_KEY below
//
//  These two values are SAFE to keep in your app.
//  (Never paste the "service_role / secret" key here.)
// ============================================================
import { createClient } from "@supabase/supabase-js";

// 👇 PASTE YOUR TWO VALUES BETWEEN THE QUOTES
const SUPABASE_URL = "https://xhvghwsnnqgapaskzsbp.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhodmdod3NubnFnYXBhc2t6c2JwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxNTk0MjYsImV4cCI6MjA5NTczNTQyNn0.TJRchuUXTMD0zRT--DO2fr7wpVh1RwXwlGh0Wqrwrvg";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
