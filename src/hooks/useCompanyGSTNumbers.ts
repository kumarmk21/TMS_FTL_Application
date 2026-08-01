import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface CustomField {
  label: string;
  value: string;
}

export interface CompanyGSTNumber {
  id: string;
  company_id: string;
  gst_number: string;
  label: string | null;
  custom_fields: CustomField[];
  created_at: string;
  updated_at: string;
}

export function useCompanyGSTNumbers(companyId?: string) {
  const [gstNumbers, setGstNumbers] = useState<CompanyGSTNumber[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGSTNumbers = useCallback(async () => {
    if (!companyId) {
      setGstNumbers([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('company_gst_numbers')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;
      setGstNumbers((data || []) as CompanyGSTNumber[]);
    } catch (err: any) {
      console.error('Error fetching company GST numbers:', err);
      setError(err.message || 'Failed to fetch GST numbers');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchGSTNumbers();
  }, [fetchGSTNumbers]);

  return { gstNumbers, loading, error, refetch: fetchGSTNumbers };
}

export function useAllCompanyGSTNumbers() {
  const [gstNumbers, setGstNumbers] = useState<CompanyGSTNumber[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('company_gst_numbers')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setGstNumbers((data || []) as CompanyGSTNumber[]);
    } catch (err: any) {
      console.error('Error fetching all company GST numbers:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { gstNumbers, loading, refetch: fetchAll };
}
