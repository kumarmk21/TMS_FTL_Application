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
      customer_rate_master: {
        Row: {
          rate_id: string
          customer_id: string | null
          customer_master_id: string | null
          customer_name: string | null
          is_active: boolean
          sac_code: string | null
          sac_description: string | null
          from_city: string | null
          from_city_id: string | null
          to_city: string | null
          to_city_id: string | null
          vehicle_type: string | null
          vehicle_type_id: string | null
          service_type: string | null
          service_type_rate: number
          gst_charge_type: string | null
          gst_percentage: number
          effective_from: string | null
          effective_to: string | null
          remarks: string | null
          created_by: string | null
          created_date: string | null
          created_at: string
          updated_by: string | null
          updated_at: string
        }
        Insert: {
          rate_id?: string
          customer_id?: string | null
          customer_master_id?: string | null
          customer_name?: string | null
          is_active?: boolean
          sac_code?: string | null
          sac_description?: string | null
          from_city?: string | null
          from_city_id?: string | null
          to_city?: string | null
          to_city_id?: string | null
          vehicle_type?: string | null
          vehicle_type_id?: string | null
          service_type?: string | null
          service_type_rate?: number
          gst_charge_type?: string | null
          gst_percentage?: number
          effective_from?: string | null
          effective_to?: string | null
          remarks?: string | null
          created_by?: string | null
          created_date?: string | null
          created_at?: string
          updated_by?: string | null
          updated_at?: string
        }
        Update: {
          rate_id?: string
          customer_id?: string | null
          customer_master_id?: string | null
          customer_name?: string | null
          is_active?: boolean
          sac_code?: string | null
          sac_description?: string | null
          from_city?: string | null
          from_city_id?: string | null
          to_city?: string | null
          to_city_id?: string | null
          vehicle_type?: string | null
          vehicle_type_id?: string | null
          service_type?: string | null
          service_type_rate?: number
          gst_charge_type?: string | null
          gst_percentage?: number
          effective_from?: string | null
          effective_to?: string | null
          remarks?: string | null
          created_by?: string | null
          created_date?: string | null
          created_at?: string
          updated_by?: string | null
          updated_at?: string
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
