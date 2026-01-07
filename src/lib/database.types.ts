export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          role: 'user' | 'manager' | 'admin'
          profile_photo_url: string | null
          phone: string | null
          branch_code: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          role?: 'user' | 'manager' | 'admin'
          profile_photo_url?: string | null
          phone?: string | null
          branch_code?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          role?: 'user' | 'manager' | 'admin'
          profile_photo_url?: string | null
          phone?: string | null
          branch_code?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      branch_master: {
        Row: {
          id: string
          branch_name: string
          branch_code: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          branch_name: string
          branch_code?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          branch_name?: string
          branch_code?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      company_master: {
        Row: {
          id: string
          company_code: string
          company_name: string
          company_tagline: string | null
          company_address: string | null
          branch_id: string | null
          city_id: string | null
          pin_code: string | null
          cin: string | null
          gstin: string | null
          contact_number: string | null
          email: string | null
          website: string | null
          logo_url: string | null
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          company_code: string
          company_name: string
          company_tagline?: string | null
          company_address?: string | null
          branch_id?: string | null
          city_id?: string | null
          pin_code?: string | null
          cin?: string | null
          gstin?: string | null
          contact_number?: string | null
          email?: string | null
          website?: string | null
          logo_url?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          company_code?: string
          company_name?: string
          company_tagline?: string | null
          company_address?: string | null
          branch_id?: string | null
          city_id?: string | null
          pin_code?: string | null
          cin?: string | null
          gstin?: string | null
          contact_number?: string | null
          email?: string | null
          website?: string | null
          logo_url?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
      }
    }
  }
}

export type UserRole = 'user' | 'manager' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  profile_photo_url: string | null;
  phone: string | null;
  branch_code: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Branch {
  id: string;
  branch_name: string;
  branch_code: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DocType {
  id: string;
  doc_type: string;
  created_at: string;
  created_by: string;
}
