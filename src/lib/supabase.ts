import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://sfjjfaixkqpjcwfrurlf.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_B-s7rZDXDSxf_XH7cpq0kQ_RD04re1n';

export const supabase = createClient(supabaseUrl, supabaseKey);
