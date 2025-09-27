import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

export type Database = {
  public: {
    Tables: {
      students: {
        Row: {
          id: string
          first_name: string
          last_name: string
          phone: string
          enrollment_date: string
          status: 'active' | 'inactive'
          user_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          first_name: string
          last_name: string
          phone: string
          enrollment_date?: string
          status?: 'active' | 'inactive'
          user_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          first_name?: string
          last_name?: string
          phone?: string
          enrollment_date?: string
          status?: 'active' | 'inactive'
          user_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          student_id: string
          user_id: string
          input_content: string
          output_content: string | null
          message_type: 'text' | 'image' | 'file'
          is_read: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          student_id: string
          user_id: string
          input_content: string
          output_content?: string | null
          message_type?: 'text' | 'image' | 'file'
          is_read?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          user_id?: string
          input_content?: string
          output_content?: string | null
          message_type?: 'text' | 'image' | 'file'
          is_read?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      message_insights: {
        Row: {
          user_id: string
          student_id: string
          message_date: string
          message_count: number
          unread_count: number
        }
      }
    }
  }
}