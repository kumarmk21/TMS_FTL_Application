import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { BookOpen, Link2, Unlink, Loader2, CheckCircle, AlertCircle, RefreshCw, ExternalLink, Users, Upload, ArrowRight, FileText, Eye, Send, Wrench, Calendar, Filter, AlertTriangle, X, Wallet, ArrowLeft, Pencil, CreditCard, History, Settings, Clock, SearchCheck, CheckSquare, RotateCcw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import VendorPaymentsDashboard from './VendorPaymentsDashboard';
import VendorPaymentHistory from './VendorPaymentHistory';
import VendorPaymentSettings from './VendorPaymentSettings';

interface ConnectionStatus {
  connected: boolean;
  connected_at?: string;
  expires_at?: string;
  api_domain?: string;
  location?: string;
}

interface SyncResult {
  zohoCount: number;
  localCount: number;
  matched: number;
  unmatched: number;
  pushed: number;
  details: Array<{
    customer_id: string;
    customer_name: string;
    action: string;
    zoho_id?: string;
    status: string;
  }>;
}

interface SyncStats {
  totalLocal: number;
  linked: number;
  unlinked: number;
}

interface InvoiceSyncStats {
  lr: { total: number; synced: number; pending: number };
  warehouse: { total: number; synced: number; pending: number };
  total: number;
  synced: number;
  pending: number;
}

interface InvoicePushResult {
  total: number;
  pushed: number;
  skipped: number;
  errors: number;
  dryRun: boolean;
  details: Array<{
    bill_id: string;
    bill_number: string;
    bill_type: string;
    customer_name: string;
    amount: number;
    zoho_invoice_id?: string;
    zoho_invoice_number?: string;
    status: string;
    detail?: string;
  }>;
}

interface FixLinkResult {
  total: number;
  valid: number;
  reactivated: number;
  relinked: number;
  created: number;
  cleared: number;
  errors: number;
  details: Array<{
    customer_id: string;
    customer_name: string;
    old_zoho_id: string;
    new_zoho_id?: string;
    action: string;
    status: string;
  }>;
}

interface VendorSyncResult {
  zohoCount: number;
  localCount: number;
  matched: number;
  unmatched: number;
  pushed: number;
  errors: number;
  details: Array<{
    vendor_code: string;
    vendor_name: string;
    action: string;
    zoho_id?: string;
    status: string;
  }>;
}

interface PurchaseSyncStats {
  thc: { total: number; synced: number; pending: number; failed: number };
  vendors: { total: number; linked: number; unlinked: number };
}

interface PurchasePushResult {
  total: number;
  pushed: number;
  skipped: number;
  errors: number;
  dryRun: boolean;
  details: Array<{
    thc_id: string;
    thc_number: string;
    vendor_name: string;
    amount: number;
    zoho_bill_id?: string;
    zoho_bill_number?: string;
    status: string;
    detail?: string;
  }>;
}

interface PendingTHC {
  thc_id: string;
  thc_number: string;
  thc_id_number: string;
  lr_number: string | null;
  thc_date: string;
  vendor_name: string;
  thc_gross_amount: number;
  zoho_sync_status?: string;
  zoho_books_id?: string | null;
}

interface PendingInvoice {
  bill_id: string;
  bill_number: string;
  bill_type: 'LR' | 'WH';
  bill_date: string;
  customer_name: string;
  amount: number;
}

interface ProcessedInvoice {
  bill_id: string;
  bill_number: string;
  bill_type: 'LR' | 'WH';
  bill_date: string;
  customer_name: string;
  amount: number;
  zoho_invoice_id: string;
  zoho_invoice_number: string | null;
  zoho_synced_at: string | null;
}

interface AthRecord {
  thc_id: string;
  thc_id_number: string;
  lr_number: string | null;
  origin: string | null;
  destination: string | null;
  vehicle_type: string | null;
  vehicle_number: string | null;
  thc_vendor: string;
  vendor_name: string;
  thc_amount: number | null;
  thc_advance_amount: number | null;
  thc_net_payable_amount: number | null;
  ven_act_name: string | null;
  ven_act_number: string | null;
  ven_act_ifsc: string | null;
  ven_act_bank: string | null;
  ven_act_branch: string | null;
  ath_date: string | null;
  thc_date: string | null;
  zoho_ath_sync_status: string | null;
  zoho_ath_payment_id: string | null;
  zoho_ath_error: string | null;
  zoho_books_id: string | null;
}

interface BthRecord {
  thc_id: string;
  thc_id_number: string;
  lr_number: string | null;
  origin: string | null;
  destination: string | null;
  vehicle_type: string | null;
  vehicle_number: string | null;
  thc_vendor: string;
  vendor_name: string;
  thc_amount: number | null;
  thc_advance_amount: number | null;
  thc_balance_amount: number | null;
  ven_act_name: string | null;
  ven_act_number: string | null;
  ven_act_ifsc: string | null;
  ven_act_bank: string | null;
  ven_act_branch: string | null;
  thc_balance_payment_date: string | null;
  thc_balance_pmt_utr_details: string | null;
  thc_date: string | null;
  zoho_ath_sync_status: string | null;
  zoho_ath_error: string | null;
  zoho_bth_sync_status: string | null;
  zoho_bth_error: string | null;
  zoho_bth_payment_id: string | null;
  zoho_books_id: string | null;
}

export default function ZohoBooksIntegration() {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [syncStats, setSyncStats] = useState<SyncStats | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [syncFilter, setSyncFilter] = useState<'all' | 'linked' | 'pushed' | 'error'>('all');

  const [invoiceStats, setInvoiceStats] = useState<InvoiceSyncStats | null>(null);
  const [pushing, setPushing] = useState(false);
  const [pushResult, setPushResult] = useState<InvoicePushResult | null>(null);
  const [pushFilter, setPushFilter] = useState<'all' | 'pushed' | 'skipped' | 'error'>('all');
  const [billTypeFilter, setBillTypeFilter] = useState<'lr' | 'warehouse' | 'both'>('both');
  const [dateRange, setDateRange] = useState<{ startDate: string | null; endDate: string | null }>({ startDate: null, endDate: null });
  const [dryRunOnly, setDryRunOnly] = useState(false);
  const [fixingLinks, setFixingLinks] = useState(false);
  const [fixLinkResult, setFixLinkResult] = useState<FixLinkResult | null>(null);

  const [pendingInvoices, setPendingInvoices] = useState<PendingInvoice[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [selectedBillIds, setSelectedBillIds] = useState<Set<string>>(new Set());
  const [processedInvoices, setProcessedInvoices] = useState<ProcessedInvoice[]>([]);
  const [loadingProcessed, setLoadingProcessed] = useState(false);
  const [invoiceView, setInvoiceView] = useState<'pending' | 'processed'>('pending');
  const [showGstWarning, setShowGstWarning] = useState(false);
  const [pendingPushAction, setPendingPushAction] = useState<(() => void) | null>(null);

  const [activeTab, setActiveTab] = useState<'invoices' | 'purchases' | 'ath-payment' | 'bth-payment'>('invoices');
  const [view, setView] = useState<'main' | 'payment-info'>('main');
  const [paymentInfoPage, setPaymentInfoPage] = useState<'dashboard' | 'history' | 'settings'>('dashboard');
  const [vendorSyncing, setVendorSyncing] = useState(false);
  const [vendorSyncResult, setVendorSyncResult] = useState<VendorSyncResult | null>(null);
  const [purchaseStats, setPurchaseStats] = useState<PurchaseSyncStats | null>(null);
  const [pushingPurchases, setPushingPurchases] = useState(false);
  const [purchasePushResult, setPurchasePushResult] = useState<PurchasePushResult | null>(null);
  const [pendingTHCs, setPendingTHCs] = useState<PendingTHC[]>([]);
  const [loadingPendingTHCs, setLoadingPendingTHCs] = useState(false);
  const [selectedTHCIds, setSelectedTHCIds] = useState<Set<string>>(new Set());
  const [thcFilter, setThcFilter] = useState<'pending' | 'pushed' | 'failed' | 'all'>('pending');
  const [vendorSyncFilter, setVendorSyncFilter] = useState<'all' | 'linked' | 'pushed' | 'error'>('all');
  const [purchasePushFilter, setPurchasePushFilter] = useState<'all' | 'pushed' | 'skipped' | 'error'>('all');

  // ATH Payment tab state
  const [athRecords, setAthRecords] = useState<AthRecord[]>([]);
  const [loadingAth, setLoadingAth] = useState(false);
  const [athError, setAthError] = useState('');
  const [editingAth, setEditingAth] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ ven_act_name: '', ven_act_number: '', ven_act_ifsc: '', ven_act_bank: '', ven_act_branch: '', thc_advance_amount: 0 });
  const [viewingAth, setViewingAth] = useState<AthRecord | null>(null);
  const [submittingAth, setSubmittingAth] = useState<string | null>(null);

  // BTH Payment tab state
  const [bthRecords, setBthRecords] = useState<BthRecord[]>([]);
  const [loadingBth, setLoadingBth] = useState(false);
  const [bthError, setBthError] = useState('');
  const [editingBth, setEditingBth] = useState<string | null>(null);
  const [bthEditForm, setBthEditForm] = useState({ ven_act_name: '', ven_act_number: '', ven_act_ifsc: '', ven_act_bank: '', ven_act_branch: '', thc_balance_amount: 0, thc_balance_pmt_utr_details: '' });
  const [viewingBth, setViewingBth] = useState<BthRecord | null>(null);
  const [submittingBth, setSubmittingBth] = useState<string | null>(null);
  const [markingAthBth, setMarkingAthBth] = useState<string | null>(null);
  const [verifyingAthBth, setVerifyingAthBth] = useState<string | null>(null);
  const [retryingAthBth, setRetryingAthBth] = useState<string | null>(null);

  const oauthUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/zoho-oauth`;
  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/zoho-api`;

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${oauthUrl}?action=status`, {
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
      });
      if (!res.ok) throw new Error(`Failed to check status (${res.status})`);
      const data = await res.json();
      setStatus(data);
      if (data.connected) {
        await fetchSyncStats();
        await fetchInvoiceStats();
        await fetchPendingInvoices();
        await fetchProcessedInvoices();
        await fetchPurchaseStats();
        await fetchPendingTHCs();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to check connection status');
    } finally {
      setLoading(false);
    }
  }, [oauthUrl]);

  const fetchPendingInvoices = useCallback(async () => {
    setLoadingPending(true);
    try {
      const { data: lrBills, error: lrError } = await supabase
        .from('lr_bill')
        .select('bill_id, lr_bill_number, lr_bill_date, billing_party_name, bill_amount, sub_total')
        .in('bill_status', ['Active', 'Regenerated'])
        .is('zoho_invoice_id', null)
        .order('lr_bill_date', { ascending: false })
        .limit(500);

      if (lrError) throw lrError;

      const { data: whBills, error: whError } = await supabase
        .from('warehouse_bill')
        .select('bill_id, bill_number, bill_date, billing_party_name, total_amount, sub_total')
        .is('zoho_invoice_id', null)
        .order('bill_date', { ascending: false })
        .limit(500);

      if (whError) throw whError;

      const invoices: PendingInvoice[] = [
        ...(lrBills || []).map((b: any) => ({
          bill_id: b.bill_id,
          bill_number: b.lr_bill_number || '',
          bill_type: 'LR' as const,
          bill_date: b.lr_bill_date || '',
          customer_name: b.billing_party_name || '',
          amount: parseFloat(b.bill_amount || b.sub_total || '0'),
        })),
        ...(whBills || []).map((b: any) => ({
          bill_id: b.bill_id,
          bill_number: b.bill_number || '',
          bill_type: 'WH' as const,
          bill_date: b.bill_date || '',
          customer_name: b.billing_party_name || '',
          amount: parseFloat(b.total_amount || b.sub_total || '0'),
        })),
      ];

      setPendingInvoices(invoices);
      setSelectedBillIds(new Set());
    } catch (err) {
      console.error('Failed to fetch pending invoices:', err);
    } finally {
      setLoadingPending(false);
    }
  }, []);

  const fetchProcessedInvoices = useCallback(async () => {
    setLoadingProcessed(true);
    try {
      const { data: lrBills, error: lrError } = await supabase
        .from('lr_bill')
        .select('bill_id, lr_bill_number, lr_bill_date, billing_party_name, bill_amount, sub_total, zoho_invoice_id, zoho_invoice_number, zoho_synced_at')
        .in('bill_status', ['Active', 'Regenerated'])
        .not('zoho_invoice_id', 'is', null)
        .order('zoho_synced_at', { ascending: false })
        .limit(500);

      if (lrError) throw lrError;

      const { data: whBills, error: whError } = await supabase
        .from('warehouse_bill')
        .select('bill_id, bill_number, bill_date, billing_party_name, total_amount, sub_total, zoho_invoice_id, zoho_invoice_number, zoho_synced_at')
        .not('zoho_invoice_id', 'is', null)
        .order('zoho_synced_at', { ascending: false })
        .limit(500);

      if (whError) throw whError;

      const processed: ProcessedInvoice[] = [
        ...(lrBills || []).map((b: any) => ({
          bill_id: b.bill_id,
          bill_number: b.lr_bill_number || '',
          bill_type: 'LR' as const,
          bill_date: b.lr_bill_date || '',
          customer_name: b.billing_party_name || '',
          amount: parseFloat(b.bill_amount || b.sub_total || '0'),
          zoho_invoice_id: b.zoho_invoice_id,
          zoho_invoice_number: b.zoho_invoice_number,
          zoho_synced_at: b.zoho_synced_at,
        })),
        ...(whBills || []).map((b: any) => ({
          bill_id: b.bill_id,
          bill_number: b.bill_number || '',
          bill_type: 'WH' as const,
          bill_date: b.bill_date || '',
          customer_name: b.billing_party_name || '',
          amount: parseFloat(b.total_amount || b.sub_total || '0'),
          zoho_invoice_id: b.zoho_invoice_id,
          zoho_invoice_number: b.zoho_invoice_number,
          zoho_synced_at: b.zoho_synced_at,
        })),
      ];

      processed.sort((a, b) => (b.zoho_synced_at || '').localeCompare(a.zoho_synced_at || ''));
      setProcessedInvoices(processed);
    } catch (err) {
      console.error('Failed to fetch processed invoices:', err);
    } finally {
      setLoadingProcessed(false);
    }
  }, []);

  const fetchInvoiceStats = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}?action=invoice-sync-stats`, {
        headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setInvoiceStats(data);
    } catch {
      // non-critical
    }
  }, [apiUrl]);

  const fetchSyncStats = useCallback(async () => {
    try {
      const { count: total } = await supabase
        .from('customer_master')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      const { count: linked } = await supabase
        .from('customer_master')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .not('zoho_customer_id', 'is', null);

      setSyncStats({
        totalLocal: total || 0,
        linked: linked || 0,
        unlinked: (total || 0) - (linked || 0),
      });
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const params = new URLSearchParams(window.location.search);
    if (params.get('zoho') === 'connected' || params.get('status') === 'connected') {
      setSuccess('Successfully connected to Zoho Books!');
      window.history.replaceState({}, '', window.location.pathname);
      setTimeout(() => setSuccess(''), 5000);
    }
  }, [fetchStatus]);

  // ── ATH Payment tab: fetch, real-time subscription, actions ──
  const fetchAthRecords = useCallback(async () => {
    setLoadingAth(true);
    setAthError('');
    try {
      const { data, error } = await supabase
        .from('thc_details')
        .select(`
          thc_id, thc_id_number, lr_number, origin, destination,
          vehicle_type, vehicle_number, thc_vendor,
          thc_amount, thc_advance_amount, thc_balance_amount,
          ven_act_name, ven_act_number, ven_act_ifsc, ven_act_bank, ven_act_branch,
          ath_date, thc_date, zoho_ath_sync_status, zoho_ath_payment_id, zoho_ath_error, zoho_books_id
        `)
        .not('ath_date', 'is', null)
        .order('ath_date', { ascending: false })
        .limit(500);

      if (error) throw error;

      const vendorIds = [...new Set((data || []).map((r: any) => r.thc_vendor).filter(Boolean))];
      const vendorMap = new Map<string, string>();
      if (vendorIds.length > 0) {
        const { data: vendorData } = await supabase
          .from('vendor_master')
          .select('id, vendor_name')
          .in('id', vendorIds);
        (vendorData || []).forEach((v: any) => vendorMap.set(v.id, v.vendor_name));
      }

      const enriched: AthRecord[] = (data || []).map((r: any) => ({
        ...r,
        vendor_name: vendorMap.get(r.thc_vendor) || 'Unknown',
      }));
      setAthRecords(enriched);
    } catch (err: any) {
      setAthError(err.message || 'Failed to fetch ATH payment records');
    } finally {
      setLoadingAth(false);
    }
  }, []);

  useEffect(() => {
    if (status?.connected && view === 'main' && activeTab === 'ath-payment') {
      fetchAthRecords();
    }
  }, [status?.connected, view, activeTab, fetchAthRecords]);

  // Real-time subscription for thc_details changes
  const athChannelRef = useRef<any>(null);
  useEffect(() => {
    if (view === 'main' && activeTab === 'ath-payment' && status?.connected) {
      const channel = supabase
        .channel('ath-payment-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'thc_details' },
          () => fetchAthRecords()
        )
        .subscribe();
      athChannelRef.current = channel;
      return () => {
        supabase.removeChannel(channel);
        athChannelRef.current = null;
      };
    }
  }, [view, activeTab, status?.connected, fetchAthRecords]);

  const startEditAth = (record: AthRecord) => {
    setEditingAth(record.thc_id);
    setEditForm({
      ven_act_name: record.ven_act_name || '',
      ven_act_number: record.ven_act_number || '',
      ven_act_ifsc: record.ven_act_ifsc || '',
      ven_act_bank: record.ven_act_bank || '',
      ven_act_branch: record.ven_act_branch || '',
      thc_advance_amount: record.thc_advance_amount || 0,
    });
  };

  const saveEditAth = async () => {
    if (!editingAth) return;
    try {
      const { error } = await supabase
        .from('thc_details')
        .update({
          ven_act_name: editForm.ven_act_name,
          ven_act_number: editForm.ven_act_number,
          ven_act_ifsc: editForm.ven_act_ifsc,
          ven_act_bank: editForm.ven_act_bank,
          ven_act_branch: editForm.ven_act_branch,
          thc_advance_amount: editForm.thc_advance_amount,
        } as any)
        .eq('thc_id', editingAth);
      if (error) throw error;
      setEditingAth(null);
      await fetchAthRecords();
    } catch (err: any) {
      setAthError(err.message || 'Failed to save changes');
    }
  };

  const submitAthPayment = async (record: AthRecord) => {
    setSubmittingAth(record.thc_id);
    setAthError('');
    try {
      const res = await fetch(`${apiUrl}?action=push-ath-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ thc_id: record.thc_id }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || `Push failed (${res.status})`);
      setSuccess(`ATH payment submitted for ${record.thc_id_number}.`);
      setTimeout(() => setSuccess(''), 5000);
      await fetchAthRecords();
    } catch (err: any) {
      setAthError(err.message || 'Failed to submit ATH payment');
    } finally {
      setSubmittingAth(null);
    }
  };

  const athTotalAmount = useMemo(() => {
    return athRecords.reduce((sum, r) => sum + (r.thc_advance_amount || 0), 0);
  }, [athRecords]);

  // ── BTH Payment tab: fetch, real-time subscription, actions ──
  const fetchBthRecords = useCallback(async () => {
    setLoadingBth(true);
    setBthError('');
    try {
      const { data, error } = await supabase
        .from('thc_details')
        .select(`
          thc_id, thc_id_number, lr_number, origin, destination,
          vehicle_type, vehicle_number, thc_vendor,
          thc_amount, thc_advance_amount, thc_balance_amount,
          ven_act_name, ven_act_number, ven_act_ifsc, ven_act_bank, ven_act_branch,
          thc_balance_payment_date, thc_balance_pmt_utr_details, thc_date,
          zoho_ath_sync_status, zoho_ath_error, zoho_bth_sync_status, zoho_bth_error, zoho_bth_payment_id, zoho_books_id
        `)
        .not('thc_balance_payment_date', 'is', null)
        .order('thc_balance_payment_date', { ascending: false })
        .limit(500);

      if (error) throw error;

      const vendorIds = [...new Set((data || []).map((r: any) => r.thc_vendor).filter(Boolean))];
      const vendorMap = new Map<string, string>();
      if (vendorIds.length > 0) {
        const { data: vendorData } = await supabase
          .from('vendor_master')
          .select('id, vendor_name')
          .in('id', vendorIds);
        (vendorData || []).forEach((v: any) => vendorMap.set(v.id, v.vendor_name));
      }

      const enriched: BthRecord[] = (data || []).map((r: any) => ({
        ...r,
        vendor_name: vendorMap.get(r.thc_vendor) || 'Unknown',
      }));
      setBthRecords(enriched);
    } catch (err: any) {
      setBthError(err.message || 'Failed to fetch BTH payment records');
    } finally {
      setLoadingBth(false);
    }
  }, []);

  useEffect(() => {
    if (status?.connected && view === 'main' && activeTab === 'bth-payment') {
      fetchBthRecords();
    }
  }, [status?.connected, view, activeTab, fetchBthRecords]);

  const bthChannelRef = useRef<any>(null);
  useEffect(() => {
    if (view === 'main' && activeTab === 'bth-payment' && status?.connected) {
      const channel = supabase
        .channel('bth-payment-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'thc_details' },
          () => fetchBthRecords()
        )
        .subscribe();
      bthChannelRef.current = channel;
      return () => {
        supabase.removeChannel(channel);
        bthChannelRef.current = null;
      };
    }
  }, [view, activeTab, status?.connected, fetchBthRecords]);

  const startEditBth = (record: BthRecord) => {
    setEditingBth(record.thc_id);
    setBthEditForm({
      ven_act_name: record.ven_act_name || '',
      ven_act_number: record.ven_act_number || '',
      ven_act_ifsc: record.ven_act_ifsc || '',
      ven_act_bank: record.ven_act_bank || '',
      ven_act_branch: record.ven_act_branch || '',
      thc_balance_amount: record.thc_balance_amount || 0,
      thc_balance_pmt_utr_details: record.thc_balance_pmt_utr_details || '',
    });
  };

  const saveEditBth = async () => {
    if (!editingBth) return;
    try {
      const { error } = await supabase
        .from('thc_details')
        .update({
          ven_act_name: bthEditForm.ven_act_name,
          ven_act_number: bthEditForm.ven_act_number,
          ven_act_ifsc: bthEditForm.ven_act_ifsc,
          ven_act_bank: bthEditForm.ven_act_bank,
          ven_act_branch: bthEditForm.ven_act_branch,
          thc_balance_amount: bthEditForm.thc_balance_amount,
          thc_balance_pmt_utr_details: bthEditForm.thc_balance_pmt_utr_details,
        } as any)
        .eq('thc_id', editingBth);
      if (error) throw error;
      setEditingBth(null);
      await fetchBthRecords();
    } catch (err: any) {
      setBthError(err.message || 'Failed to save changes');
    }
  };

  const submitBthPayment = async (record: BthRecord) => {
    setSubmittingBth(record.thc_id);
    setBthError('');
    try {
      const res = await fetch(`${apiUrl}?action=push-bth-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ thc_id: record.thc_id }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || `Push failed (${res.status})`);
      setSuccess(`BTH payment submitted for ${record.thc_id_number}.`);
      setTimeout(() => setSuccess(''), 5000);
      await fetchBthRecords();
    } catch (err: any) {
      setBthError(err.message || 'Failed to submit BTH payment');
    } finally {
      setSubmittingBth(null);
    }
  };

  const markAthPushedInBth = async (record: BthRecord) => {
    setMarkingAthBth(record.thc_id);
    setBthError('');
    try {
      const { error } = await supabase
        .from('thc_details')
        .update({
          zoho_ath_sync_status: 'synced',
          zoho_synced_at: new Date().toISOString(),
        } as any)
        .eq('thc_id', record.thc_id);
      if (error) throw error;
      setBthRecords(prev => prev.map(r => r.thc_id === record.thc_id ? { ...r, zoho_ath_sync_status: 'synced' } : r));
      setSuccess(`ATH marked as pushed for ${record.thc_id_number}.`);
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      setBthError(err.message || 'Failed to mark ATH as pushed');
    } finally {
      setMarkingAthBth(null);
    }
  };

  const verifyAthInZoho = async (record: BthRecord) => {
    setVerifyingAthBth(record.thc_id);
    setBthError('');
    try {
      const res = await fetch(`${apiUrl}?action=verify-ath-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ thc_id: record.thc_id }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || `Verify failed (${res.status})`);
      if (data.verified) {
        setBthRecords(prev => prev.map(r => r.thc_id === record.thc_id ? { ...r, zoho_ath_sync_status: 'synced' } : r));
        setSuccess(`ATH payment verified in Zoho Books for ${record.thc_id_number} (Payment #: ${data.zoho_payment_number || data.zoho_payment_id}).`);
        setTimeout(() => setSuccess(''), 6000);
      } else {
        setBthError(data.message || 'No matching ATH payment found in Zoho Books. You can mark it as pushed manually.');
      }
    } catch (err: any) {
      setBthError(err.message || 'Failed to verify ATH payment in Zoho');
    } finally {
      setVerifyingAthBth(null);
    }
  };

  const retryAthPush = async (record: BthRecord) => {
    setRetryingAthBth(record.thc_id);
    setBthError('');
    try {
      const res = await fetch(`${apiUrl}?action=push-ath-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ thc_id: record.thc_id }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || `ATH push failed (${res.status})`);
      setBthRecords(prev => prev.map(r => r.thc_id === record.thc_id ? { ...r, zoho_ath_sync_status: 'synced', zoho_ath_error: null } : r));
      setSuccess(`ATH payment pushed to Zoho for ${record.thc_id_number}.`);
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      setBthError(err.message || 'Failed to push ATH payment');
      await fetchBthRecords();
    } finally {
      setRetryingAthBth(null);
    }
  };

  const bthTotalAmount = useMemo(() => {
    return bthRecords.reduce((sum, r) => sum + (r.thc_balance_amount || 0), 0);
  }, [bthRecords]);

  const handleConnect = async () => {
    setConnecting(true);
    setError('');
    try {
      const res = await fetch(`${oauthUrl}?action=authorize`, {
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
      });
      if (!res.ok) throw new Error('Failed to get authorization URL');
      const data = await res.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        throw new Error('No authorization URL returned');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to start authorization');
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect from Zoho Books? You will need to re-authorize to use the integration.')) return;

    setDisconnecting(true);
    setError('');
    try {
      const res = await fetch(`${oauthUrl}?action=disconnect`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
      });
      if (!res.ok) throw new Error('Failed to disconnect');
      setSuccess('Disconnected from Zoho Books.');
      setTimeout(() => setSuccess(''), 5000);
      await fetchStatus();
    } catch (err: any) {
      setError(err.message || 'Failed to disconnect');
    } finally {
      setDisconnecting(false);
    }
  };

  const handleSyncCustomers = async () => {
    setSyncing(true);
    setError('');
    setSyncResult(null);
    try {
      const res = await fetch(`${apiUrl}?action=sync-customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || `Sync failed (${res.status})`);
      }
      setSyncResult(data);
      setSuccess(`Sync complete: ${data.matched} linked, ${data.pushed} pushed to Zoho, ${data.unmatched - data.pushed} could not be matched.`);
      setTimeout(() => setSuccess(''), 8000);
      await fetchSyncStats();
    } catch (err: any) {
      setError(err.message || 'Failed to sync customers');
    } finally {
      setSyncing(false);
    }
  };

  const handleFixCustomerLinks = async () => {
    setFixingLinks(true);
    setError('');
    setFixLinkResult(null);
    try {
      const res = await fetch(`${apiUrl}?action=fix-customer-links`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || `Fix failed (${res.status})`);
      }
      setFixLinkResult(data);
      const parts: string[] = [];
      if (data.valid) parts.push(`${data.valid} valid`);
      if (data.reactivated) parts.push(`${data.reactivated} reactivated`);
      if (data.relinked) parts.push(`${data.relinked} relinked`);
      if (data.created) parts.push(`${data.created} created`);
      if (data.errors) parts.push(`${data.errors} errors`);
      setSuccess(`Customer links validated: ${parts.join(', ')}.`);
      setTimeout(() => setSuccess(''), 8000);
      await fetchSyncStats();
    } catch (err: any) {
      setError(err.message || 'Failed to fix customer links');
    } finally {
      setFixingLinks(false);
    }
  };

  const handlePushInvoices = useCallback(async (billIds?: string[]) => {
    setPushing(true);
    setError('');
    setPushResult(null);
    try {
      const payload: Record<string, any> = {
        bill_type: billTypeFilter,
        dry_run: dryRunOnly,
      };
      if (billIds && billIds.length > 0) {
        payload.bill_ids = billIds;
      }

      const res = await fetch(`${apiUrl}?action=push-invoices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || `Push failed (${res.status})`);
      }
      setPushResult(data);
      const mode = data.dryRun ? 'DRY RUN: ' : '';
      setSuccess(`${mode}${data.pushed} invoices pushed, ${data.skipped} skipped, ${data.errors} errors out of ${data.total} processed.`);
      setTimeout(() => setSuccess(''), 8000);
      await fetchInvoiceStats();
      await fetchPendingInvoices();
      await fetchProcessedInvoices();
    } catch (err: any) {
      setError(err.message || 'Failed to push invoices');
    } finally {
      setPushing(false);
    }
  }, [apiUrl, billTypeFilter, dryRunOnly, fetchInvoiceStats, fetchPendingInvoices, fetchProcessedInvoices]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateShort = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const filteredDetails = syncResult
    ? syncResult.details.filter(d => {
        if (syncFilter === 'all') return true;
        if (syncFilter === 'linked') return d.action === 'link' && d.status === 'linked';
        if (syncFilter === 'pushed') return d.action === 'push' && d.status === 'pushed';
        if (syncFilter === 'error') return d.status.includes('error') || d.status.includes('not in Zoho');
        return true;
      })
    : [];

  const filteredInvoiceDetails = pushResult
    ? pushResult.details.filter(d => {
        if (pushFilter === 'all') return true;
        if (pushFilter === 'pushed') return d.status === 'pushed';
        if (pushFilter === 'skipped') return d.status.startsWith('skipped');
        if (pushFilter === 'error') return d.status.includes('error') || d.status === 'customer-inactive' || d.status === 'customer-not-found' || d.status === 'auth-error' || d.status === 'invoice-duplicate' || d.status === 'api-error';
        return true;
      })
    : [];

  const isErrorStatus = (status: string): boolean =>
    status.includes('error') || status === 'customer-inactive' || status === 'customer-not-found' || status === 'auth-error' || status === 'invoice-duplicate' || status === 'api-error';

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  };

  // ── Client-side filtering of pending invoices ──
  const filteredInvoices = useMemo(() => {
    return pendingInvoices.filter(inv => {
      if (billTypeFilter === 'lr' && inv.bill_type !== 'LR') return false;
      if (billTypeFilter === 'warehouse' && inv.bill_type !== 'WH') return false;

      if (dateRange.startDate) {
        const invDate = inv.bill_date ? new Date(inv.bill_date).getTime() : 0;
        const startDate = new Date(dateRange.startDate).getTime();
        if (invDate < startDate) return false;
      }
      if (dateRange.endDate) {
        const invDate = inv.bill_date ? new Date(inv.bill_date).getTime() : 0;
        const endDate = new Date(dateRange.endDate).getTime() + 24 * 60 * 60 * 1000 - 1;
        if (invDate > endDate) return false;
      }

      return true;
    });
  }, [pendingInvoices, billTypeFilter, dateRange]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (billTypeFilter !== 'both') count++;
    if (dateRange.startDate || dateRange.endDate) count++;
    return count;
  }, [billTypeFilter, dateRange]);

  // ── GST filing period check ──
  const isInFiledGstPeriod = (billDate: string): boolean => {
    if (!billDate) return false;
    const now = new Date();
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const filingCutoff = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 11);
    filingCutoff.setHours(23, 59, 59, 999);
    return new Date(billDate).getTime() <= filingCutoff.getTime();
  };

  const selectedInvoices = useMemo(() => {
    return filteredInvoices.filter(inv => selectedBillIds.has(inv.bill_id));
  }, [filteredInvoices, selectedBillIds]);

  const hasFiledPeriodSelection = useMemo(() => {
    return selectedInvoices.some(inv => isInFiledGstPeriod(inv.bill_date));
  }, [selectedInvoices]);

  const toggleBillSelection = (billId: string) => {
    setSelectedBillIds(prev => {
      const next = new Set(prev);
      if (next.has(billId)) next.delete(billId);
      else next.add(billId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (filteredInvoices.length > 0 && filteredInvoices.every(inv => selectedBillIds.has(inv.bill_id))) {
      setSelectedBillIds(new Set());
    } else {
      setSelectedBillIds(new Set(filteredInvoices.map(inv => inv.bill_id)));
    }
  };

  const clearDateRange = () => {
    setDateRange({ startDate: null, endDate: null });
  };

  // ── Vendor & Purchase helpers ──
  const fetchPurchaseStats = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}?action=purchase-sync-stats`, {
        headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setPurchaseStats(data);
    } catch {
      // non-critical
    }
  }, [apiUrl]);

  const fetchPendingTHCs = useCallback(async (filter?: 'pending' | 'pushed' | 'failed' | 'all') => {
    const activeFilter = filter || thcFilter;
    setLoadingPendingTHCs(true);
    try {
      let query = supabase
        .from('thc_details')
        .select(`
          thc_id, thc_number, thc_id_number, lr_number, thc_date, thc_vendor,
          thc_gross_amount, zoho_sync_status, zoho_books_id,
          vendor_master:thc_vendor (vendor_name)
        `)
        .not('thc_id_number', 'is', null);

      if (activeFilter === 'pending') {
        query = query.in('zoho_sync_status', ['not_synced', 'failed']);
      } else if (activeFilter === 'pushed') {
        query = query.eq('zoho_sync_status', 'synced');
      } else if (activeFilter === 'failed') {
        query = query.eq('zoho_sync_status', 'failed');
      }

      const { data, error } = await query
        .order('thc_date', { ascending: false })
        .limit(500);

      if (error) throw error;

      const thcs: PendingTHC[] = (data || []).map((t: any) => ({
        thc_id: t.thc_id,
        thc_number: t.thc_number || '',
        thc_id_number: t.thc_id_number || '',
        lr_number: t.lr_number || null,
        thc_date: t.thc_date || '',
        vendor_name: t.vendor_master?.vendor_name || t.thc_vendor || '',
        thc_gross_amount: parseFloat(t.thc_gross_amount || '0'),
        zoho_sync_status: t.zoho_sync_status || 'not_synced',
        zoho_books_id: t.zoho_books_id || null,
      }));

      setPendingTHCs(thcs);
      setSelectedTHCIds(new Set());
    } catch (err) {
      console.error('Failed to fetch pending THCs:', err);
    } finally {
      setLoadingPendingTHCs(false);
    }
  }, [thcFilter]);

  const handleSyncVendors = async () => {
    setVendorSyncing(true);
    setError('');
    setVendorSyncResult(null);
    try {
      const res = await fetch(`${apiUrl}?action=sync-vendors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || `Sync failed (${res.status})`);
      }
      setVendorSyncResult(data);
      setSuccess(`Vendor sync complete: ${data.matched} linked, ${data.pushed} pushed to Zoho, ${data.errors} errors.`);
      setTimeout(() => setSuccess(''), 8000);
      await fetchPurchaseStats();
    } catch (err: any) {
      setError(err.message || 'Failed to sync vendors');
    } finally {
      setVendorSyncing(false);
    }
  };

  const handlePushPurchases = async (thcIds?: string[]) => {
    setPushingPurchases(true);
    setError('');
    setPurchasePushResult(null);
    try {
      const payload: Record<string, any> = { dry_run: false };
      if (thcIds && thcIds.length > 0) {
        payload.thc_ids = thcIds;
      } else {
        payload.thc_ids = Array.from(selectedTHCIds);
      }

      if (payload.thc_ids.length === 0) {
        setError('Please select at least one THC to push.');
        setPushingPurchases(false);
        return;
      }

      const res = await fetch(`${apiUrl}?action=push-purchases`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || `Push failed (${res.status})`);
      }
      setPurchasePushResult(data);
      setSuccess(`${data.pushed} purchase bills pushed, ${data.skipped} skipped, ${data.errors} errors out of ${data.total} processed.`);
      setTimeout(() => setSuccess(''), 8000);
      await fetchPurchaseStats();
      await fetchPendingTHCs();
    } catch (err: any) {
      setError(err.message || 'Failed to push purchases');
    } finally {
      setPushingPurchases(false);
    }
  };

  const toggleTHCSelection = (thcId: string) => {
    setSelectedTHCIds(prev => {
      const next = new Set(prev);
      if (next.has(thcId)) next.delete(thcId);
      else next.add(thcId);
      return next;
    });
  };

  const toggleSelectAllTHCs = () => {
    if (pendingTHCs.length > 0 && pendingTHCs.every(t => selectedTHCIds.has(t.thc_id))) {
      setSelectedTHCIds(new Set());
    } else {
      setSelectedTHCIds(new Set(pendingTHCs.map(t => t.thc_id)));
    }
  };

  const filteredVendorSyncDetails = vendorSyncResult
    ? vendorSyncResult.details.filter(d => {
        if (vendorSyncFilter === 'all') return true;
        if (vendorSyncFilter === 'linked') return d.action === 'link' && (d.status === 'linked' || d.status === 'already linked' || d.status.includes('relinked'));
        if (vendorSyncFilter === 'pushed') return d.action === 'push' && d.status === 'pushed';
        if (vendorSyncFilter === 'error') return d.status.includes('error') || d.status === 'not in Zoho';
        return true;
      })
    : [];

  const filteredPurchaseDetails = purchasePushResult
    ? purchasePushResult.details.filter(d => {
        if (purchasePushFilter === 'all') return true;
        if (purchasePushFilter === 'pushed') return d.status === 'pushed';
        if (purchasePushFilter === 'skipped') return d.status.startsWith('skipped');
        if (purchasePushFilter === 'error') return d.status.includes('error') || d.status === 'api-error';
        return true;
      })
    : [];

  const handlePushSelected = () => {
    if (selectedBillIds.size === 0) {
      setError('Please select at least one invoice to push.');
      return;
    }

    if (hasFiledPeriodSelection) {
      setShowGstWarning(true);
      setPendingPushAction(() => () => {
        setShowGstWarning(false);
        handlePushInvoices(Array.from(selectedBillIds));
      });
    } else {
      handlePushInvoices(Array.from(selectedBillIds));
    }
  };

  const handlePushAllFiltered = () => {
    if (filteredInvoices.length === 0) {
      setError('No invoices match the current filters.');
      return;
    }

    const allFilteredIds = filteredInvoices.map(inv => inv.bill_id);
    const hasFiled = filteredInvoices.some(inv => isInFiledGstPeriod(inv.bill_date));

    if (hasFiled) {
      setShowGstWarning(true);
      setPendingPushAction(() => () => {
        setShowGstWarning(false);
        handlePushInvoices(allFilteredIds);
      });
    } else {
      handlePushInvoices(allFilteredIds);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-red-50 rounded-lg">
          <BookOpen className="w-6 h-6 text-red-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Zoho Books Integration</h1>
          <p className="text-sm text-gray-500">Connect your Zoho Books account to sync invoices, payments, and financial data</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-lg border bg-red-50 border-red-200 text-red-800">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="font-medium">{error}</p>
          <button onClick={() => setError('')} className="ml-auto text-red-600 hover:text-red-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-3 p-4 rounded-lg border bg-green-50 border-green-200 text-green-800">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <p className="font-medium">{success}</p>
        </div>
      )}

      {/* Connection Status Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-red-600" />
            <span className="ml-3 text-gray-500">Checking connection status...</span>
          </div>
        ) : status?.connected ? (
          <div className="space-y-6">
            <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="p-2 bg-green-100 rounded-full">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-green-900">Connected to Zoho Books</h3>
                <p className="text-sm text-green-700">Your account is linked and ready to sync data.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Connected Since</p>
                <p className="text-sm font-semibold text-gray-900">{formatDate(status.connected_at)}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Token Expires At</p>
                <p className="text-sm font-semibold text-gray-900">{formatDate(status.expires_at)}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">API Domain</p>
                <p className="text-sm font-semibold text-gray-900">{status.api_domain || '-'}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Data Center</p>
                <p className="text-sm font-semibold text-gray-900">{status.location || '-'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="flex items-center gap-2 px-5 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {disconnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlink className="w-4 h-4" />}
                Disconnect
              </button>
              <button
                onClick={fetchStatus}
                className="flex items-center gap-2 px-5 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh Status
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="p-2 bg-gray-200 rounded-full">
                <Link2 className="w-6 h-6 text-gray-500" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Not Connected</h3>
                <p className="text-sm text-gray-600">Click the button below to authorize access to your Zoho Books account.</p>
              </div>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">What happens when you connect?</h4>
              <ul className="space-y-1.5 text-sm text-blue-800">
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">•</span>
                  You'll be redirected to Zoho's secure login page
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">•</span>
                  Grant access to your Zoho Books organization
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">•</span>
                  You'll be redirected back here with the connection active
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">•</span>
                  Access tokens auto-refresh — no repeated logins needed
                </li>
              </ul>
            </div>

            <button
              onClick={handleConnect}
              disabled={connecting}
              className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {connecting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Link2 className="w-5 h-5" />}
              Connect to Zoho Books
            </button>
          </div>
        )}
      </div>

      {/* Customer Sync Card */}
      {status?.connected && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-gray-900">Customer Sync</h2>
              <p className="text-sm text-gray-500">Sync your local customers with Zoho Books contacts</p>
            </div>
          </div>

          {/* Sync Stats */}
          {syncStats && (
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="p-3 bg-gray-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-gray-900">{syncStats.totalLocal}</p>
                <p className="text-xs text-gray-500 mt-0.5">Total Customers</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-green-700">{syncStats.linked}</p>
                <p className="text-xs text-green-600 mt-0.5">Linked to Zoho</p>
              </div>
              <div className="p-3 bg-amber-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-amber-700">{syncStats.unlinked}</p>
                <p className="text-xs text-amber-600 mt-0.5">Not Yet Linked</p>
              </div>
            </div>
          )}

          {/* Sync Button */}
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={handleSyncCustomers}
              disabled={syncing}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {syncing ? 'Syncing...' : 'Sync Customers Now'}
            </button>
            <button
              onClick={handleFixCustomerLinks}
              disabled={fixingLinks}
              className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {fixingLinks ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wrench className="w-4 h-4" />}
              {fixingLinks ? 'Fixing...' : 'Fix Customer Links'}
            </button>
          </div>

          {/* Fix Links Info Banner */}
          <div className="p-4 bg-amber-50 rounded-lg border border-amber-200 mb-4">
            <h4 className="text-sm font-semibold text-amber-900 mb-2">Fix Customer Links</h4>
            <p className="text-sm text-amber-800">
              Validates every stored Zoho contact ID. If a contact is inactive, it reactivates it. If the ID is wrong,
              it searches for the correct active contact by GSTIN or name and relinks. If no match is found, it creates
              a new contact. Run this if invoice pushes fail with "Customer not found or inactive".
            </p>
          </div>

          {/* Fix Links Results */}
          {fixLinkResult && (
            <div className="border border-gray-200 rounded-lg overflow-hidden mb-4">
              <div className="p-4 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <h4 className="text-sm font-semibold text-gray-900">Fix Links Results</h4>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-gray-600">Total: <strong>{fixLinkResult.total}</strong></span>
                    <span className="text-green-700">Valid: <strong>{fixLinkResult.valid}</strong></span>
                    <span className="text-blue-700">Reactivated: <strong>{fixLinkResult.reactivated}</strong></span>
                    <span className="text-blue-700">Relinked: <strong>{fixLinkResult.relinked}</strong></span>
                    <span className="text-blue-700">Created: <strong>{fixLinkResult.created}</strong></span>
                    <span className="text-red-700">Errors: <strong>{fixLinkResult.errors}</strong></span>
                  </div>
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Customer</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Old Zoho ID</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">New Zoho ID</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Action</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {fixLinkResult.details.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-400">No records</td>
                      </tr>
                    ) : (
                      fixLinkResult.details.map((d, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-gray-900">{d.customer_name}</td>
                          <td className="px-4 py-2 text-gray-500 font-mono text-xs">{d.old_zoho_id}</td>
                          <td className="px-4 py-2 text-gray-500 font-mono text-xs">{d.new_zoho_id || '-'}</td>
                          <td className="px-4 py-2">
                            <span className={`text-xs ${
                              d.action === 'valid' ? 'text-green-700' :
                              d.action === 'reactivated' ? 'text-blue-700' :
                              d.action === 'relinked' ? 'text-blue-700' :
                              d.action === 'created' ? 'text-blue-700' :
                              'text-red-700'
                            }`}>
                              {d.action}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-xs text-gray-600">{d.status}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sync Info */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 mb-4">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">How sync works</h4>
            <ul className="space-y-1.5 text-sm text-blue-800">
              <li className="flex items-start gap-2">
                <ArrowRight className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                Fetches all customer contacts from Zoho Books
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                Matches local customers to Zoho contacts by GSTIN (primary) or name (fallback)
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                Unmatched local customers are automatically pushed to Zoho Books as new contacts
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                Links are stored in <code className="text-xs bg-blue-100 px-1 rounded">zoho_customer_id</code> column
              </li>
            </ul>
          </div>

          {/* Sync Results */}
          {syncResult && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="p-4 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <h4 className="text-sm font-semibold text-gray-900">Sync Results</h4>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-gray-600">
                      Zoho: <strong>{syncResult.zohoCount}</strong>
                    </span>
                    <span className="text-gray-600">
                      Local: <strong>{syncResult.localCount}</strong>
                    </span>
                    <span className="text-green-700">
                      Linked: <strong>{syncResult.matched}</strong>
                    </span>
                    <span className="text-blue-700">
                      Pushed: <strong>{syncResult.pushed}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 px-4 py-2 bg-gray-50 border-b border-gray-200">
                {(['all', 'linked', 'pushed', 'error'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setSyncFilter(f)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      syncFilter === f
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {f === 'all' && `All (${syncResult.details.length})`}
                    {f === 'linked' && `Linked (${syncResult.details.filter(d => d.action === 'link' && d.status === 'linked').length})`}
                    {f === 'pushed' && `Pushed (${syncResult.details.filter(d => d.action === 'push' && d.status === 'pushed').length})`}
                    {f === 'error' && `Errors (${syncResult.details.filter(d => d.status.includes('error') || d.status.includes('not in Zoho')).length})`}
                  </button>
                ))}
              </div>

              {/* Details Table */}
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Customer ID</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Name</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Action</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Zoho ID</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredDetails.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                          No records in this category
                        </td>
                      </tr>
                    ) : (
                      filteredDetails.map((d, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-gray-700 font-mono text-xs">{d.customer_id}</td>
                          <td className="px-4 py-2 text-gray-900">{d.customer_name}</td>
                          <td className="px-4 py-2">
                            {d.action === 'link' ? (
                              <span className="inline-flex items-center gap-1 text-xs text-green-700">
                                <Link2 className="w-3 h-3" /> Link
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs text-blue-700">
                                <Upload className="w-3 h-3" /> Push
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-gray-500 font-mono text-xs">{d.zoho_id || '-'}</td>
                          <td className="px-4 py-2">
                            <span className={`text-xs ${
                              d.status === 'linked' ? 'text-green-700' :
                              d.status === 'pushed' ? 'text-blue-700' :
                              d.status.includes('error') ? 'text-red-700' :
                              'text-gray-500'
                            }`}>
                              {d.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab Switcher + Payment Info Nav */}
      {status?.connected && view === 'main' && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg w-fit">
            <button
              onClick={() => setActiveTab('invoices')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'invoices' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Sales Invoices
            </button>
            <button
              onClick={() => setActiveTab('purchases')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'purchases' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Purchase Bills (THC)
            </button>
            <button
              onClick={() => setActiveTab('ath-payment')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'ath-payment' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              ATH Payment
            </button>
            <button
              onClick={() => setActiveTab('bth-payment')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'bth-payment' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              BTH Payment
            </button>
          </div>
          <button
            onClick={() => setView('payment-info')}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Wallet className="w-4 h-4" />
            Payment Information
          </button>
        </div>
      )}

      {/* Push Invoices Card */}
      {status?.connected && view === 'main' && activeTab === 'invoices' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <FileText className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-gray-900">Push Invoices to Zoho Books</h2>
              <p className="text-sm text-gray-500">Export your LR and Warehouse bills as invoices to Zoho Books</p>
            </div>
          </div>

          {/* Invoice Stats */}
          {invoiceStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              <div className="p-3 bg-gray-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-gray-900">{invoiceStats.total}</p>
                <p className="text-xs text-gray-500 mt-0.5">Total Bills</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-green-700">{invoiceStats.synced}</p>
                <p className="text-xs text-green-600 mt-0.5">Pushed to Zoho</p>
              </div>
              <div className="p-3 bg-amber-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-amber-700">{invoiceStats.pending}</p>
                <p className="text-xs text-amber-600 mt-0.5">Pending</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg text-center">
                <p className="text-xl font-bold text-blue-700">
                  {invoiceStats.lr.total > 0 ? `${invoiceStats.lr.synced}/${invoiceStats.lr.total}` : '0'}
                  <span className="text-xs text-gray-400 mx-1">LR</span>
                  {invoiceStats.warehouse.total > 0 ? `${invoiceStats.warehouse.synced}/${invoiceStats.warehouse.total}` : '0'}
                  <span className="text-xs text-gray-400 ml-1">WH</span>
                </p>
                <p className="text-xs text-blue-600 mt-0.5">Breakdown</p>
              </div>
            </div>
          )}

          {/* View Toggle: Pending vs Already Processed */}
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => setInvoiceView('pending')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                invoiceView === 'pending'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              Pending ({pendingInvoices.length})
            </button>
            <button
              onClick={() => { setInvoiceView('processed'); fetchProcessedInvoices(); }}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                invoiceView === 'processed'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              Already Processed ({processedInvoices.length})
            </button>
          </div>

          {/* Enhanced Filter Bar */}
          {invoiceView === 'pending' && (
          <div className="border border-gray-200 rounded-lg p-4 mb-4 bg-gray-50/50">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-4 h-4 text-gray-600" />
              <h4 className="text-sm font-semibold text-gray-700">Filters</h4>
              {activeFilterCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
                  Filters Active: {activeFilterCount}
                </span>
              )}
              <button
                onClick={() => {
                  setBillTypeFilter('both');
                  setDateRange({ startDate: null, endDate: null });
                }}
                className="ml-auto text-xs text-gray-500 hover:text-gray-700 font-medium flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                Clear All
              </button>
            </div>

            <div className="flex flex-wrap items-end gap-4">
              {/* Bill Type Filter */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">Bill Type</label>
                <select
                  value={billTypeFilter}
                  onChange={(e) => setBillTypeFilter(e.target.value as 'lr' | 'warehouse' | 'both')}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                >
                  <option value="both">Both (LR + Warehouse)</option>
                  <option value="lr">LR Bills Only</option>
                  <option value="warehouse">Warehouse Bills Only</option>
                </select>
              </div>

              {/* Date Range Filter */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Start Date
                </label>
                <input
                  type="date"
                  value={dateRange.startDate || ''}
                  onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value || null }))}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  End Date
                </label>
                <input
                  type="date"
                  value={dateRange.endDate || ''}
                  onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value || null }))}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                />
              </div>

              {/* Clear Dates Button */}
              {(dateRange.startDate || dateRange.endDate) && (
                <button
                  onClick={clearDateRange}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  Clear Dates
                </button>
              )}

              {/* Dry Run Toggle */}
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer ml-auto">
                <input
                  type="checkbox"
                  checked={dryRunOnly}
                  onChange={(e) => setDryRunOnly(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" />
                  Dry Run (preview only)
                </span>
              </label>
            </div>

            {/* Selected Date Range Display */}
            {(dateRange.startDate || dateRange.endDate) && (
              <div className="mt-3 flex items-center gap-2 text-xs text-gray-600">
                <span className="font-medium">Date Range:</span>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded border border-emerald-200">
                  {dateRange.startDate ? formatDateShort(dateRange.startDate) : 'Any'}
                </span>
                <span className="text-gray-400">to</span>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded border border-emerald-200">
                  {dateRange.endDate ? formatDateShort(dateRange.endDate) : 'Any'}
                </span>
              </div>
            )}
          </div>
          )}

          {/* Processed Invoices Table */}
          {invoiceView === 'processed' && (
            <div>
              <div className="flex items-center justify-between flex-wrap gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200 mb-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                  <p className="text-sm font-medium text-blue-900">
                    Showing <strong>{processedInvoices.length}</strong> already processed invoices
                  </p>
                </div>
                <button
                  onClick={fetchProcessedInvoices}
                  disabled={loadingProcessed}
                  className="flex items-center gap-1 text-xs text-blue-700 hover:text-blue-900 font-medium"
                >
                  {loadingProcessed ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                  Refresh List
                </button>
              </div>

              {loadingProcessed ? (
                <div className="flex items-center justify-center py-12 border border-gray-200 rounded-lg">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  <span className="ml-3 text-gray-500 text-sm">Loading processed invoices...</span>
                </div>
              ) : processedInvoices.length === 0 ? (
                <div className="flex items-center justify-center py-12 border border-gray-200 rounded-lg">
                  <p className="text-gray-400 text-sm">No processed invoices found.</p>
                </div>
              ) : (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="max-h-96 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-white border-b border-gray-200 z-10">
                        <tr>
                          <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Bill No.</th>
                          <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Type</th>
                          <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Customer</th>
                          <th className="text-right px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Amount</th>
                          <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Zoho Invoice No.</th>
                          <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Pushed At</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {processedInvoices.map((inv) => (
                          <tr key={inv.bill_id} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-gray-900 font-medium">{inv.bill_number}</td>
                            <td className="px-4 py-2">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                inv.bill_type === 'LR' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                              }`}>
                                {inv.bill_type}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-gray-900">{inv.customer_name}</td>
                            <td className="px-4 py-2 text-right text-gray-700 font-medium">{formatCurrency(inv.amount)}</td>
                            <td className="px-4 py-2 text-gray-500 font-mono text-xs">{inv.zoho_invoice_number || inv.zoho_invoice_id}</td>
                            <td className="px-4 py-2 text-gray-500 text-xs">{inv.zoho_synced_at ? new Date(inv.zoho_synced_at).toLocaleString('en-IN') : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Reactive Summary Bar */}
          {invoiceView === 'pending' && (
          <>
          <div className="flex items-center justify-between flex-wrap gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200 mb-4">
            <div className="flex items-center gap-3">
              <FileText className="w-4 h-4 text-emerald-600" />
              <p className="text-sm font-medium text-emerald-900">
                Showing <strong>{filteredInvoices.length}</strong> of <strong>{pendingInvoices.length}</strong> pending invoices
              </p>
            </div>
            <div className="flex items-center gap-3">
              {selectedBillIds.size > 0 && (
                <span className="text-sm text-emerald-700 font-medium">
                  {selectedBillIds.size} selected
                </span>
              )}
              <button
                onClick={fetchPendingInvoices}
                disabled={loadingPending}
                className="flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-900 font-medium"
              >
                {loadingPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                Refresh List
              </button>
            </div>
          </div>

          {/* Pending Invoices Selection Table */}
          {loadingPending ? (
            <div className="flex items-center justify-center py-12 border border-gray-200 rounded-lg">
              <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
              <span className="ml-3 text-gray-500 text-sm">Loading pending invoices...</span>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="flex items-center justify-center py-12 border border-gray-200 rounded-lg">
              <p className="text-gray-400 text-sm">No pending invoices match the current filters.</p>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-hidden mb-4">
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white border-b border-gray-200 z-10">
                    <tr>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide w-10">
                        <input
                          type="checkbox"
                          checked={filteredInvoices.length > 0 && filteredInvoices.every(inv => selectedBillIds.has(inv.bill_id))}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                      </th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Bill No.</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Type</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Date</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Customer</th>
                      <th className="text-right px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredInvoices.map((inv) => {
                      const isSelected = selectedBillIds.has(inv.bill_id);
                      const isFiled = isInFiledGstPeriod(inv.bill_date);
                      return (
                        <tr key={inv.bill_id} className={`hover:bg-gray-50 ${isSelected ? 'bg-emerald-50/50' : ''}`}>
                          <td className="px-4 py-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleBillSelection(inv.bill_id)}
                              className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                          </td>
                          <td className="px-4 py-2 text-gray-700 font-mono text-xs">{inv.bill_number}</td>
                          <td className="px-4 py-2">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              inv.bill_type === 'LR' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                            }`}>
                              {inv.bill_type}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-gray-600 text-xs">
                            <span className="flex items-center gap-1.5">
                              {formatDateShort(inv.bill_date)}
                              {isFiled && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-100 text-amber-700 text-xs rounded" title="This invoice falls within a potentially filed GST period">
                                  <AlertTriangle className="w-3 h-3" />
                                </span>
                              )}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-gray-900">{inv.customer_name}</td>
                          <td className="px-4 py-2 text-right text-gray-700 font-medium">{formatCurrency(inv.amount)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Push Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <button
              onClick={handlePushSelected}
              disabled={pushing || selectedBillIds.size === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {pushing ? <Loader2 className="w-4 h-4 animate-spin" /> : dryRunOnly ? <Eye className="w-4 h-4" /> : <Send className="w-4 h-4" />}
              {pushing ? 'Processing...' : dryRunOnly ? `Preview ${selectedBillIds.size} Selected` : `Push ${selectedBillIds.size} Selected`}
            </button>
            <button
              onClick={handlePushAllFiltered}
              disabled={pushing || filteredInvoices.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-gray-700 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {pushing ? <Loader2 className="w-4 h-4 animate-spin" /> : dryRunOnly ? <Eye className="w-4 h-4" /> : <Send className="w-4 h-4" />}
              {pushing ? 'Processing...' : dryRunOnly ? `Preview All ${filteredInvoices.length}` : `Push All ${filteredInvoices.length} Filtered`}
            </button>
            {selectedBillIds.size > 0 && (
              <button
                onClick={() => setSelectedBillIds(new Set())}
                className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 font-medium"
              >
                <X className="w-3.5 h-3.5" />
                Clear Selection
              </button>
            )}
          </div>

          {/* Info Banner */}
          <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200 mb-4">
            <h4 className="text-sm font-semibold text-emerald-900 mb-2">How invoice push works</h4>
            <ul className="space-y-1.5 text-sm text-emerald-800">
              <li className="flex items-start gap-2">
                <ArrowRight className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                Use the filters above to narrow down pending invoices by bill type and/or date range
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                Select specific invoices using the checkboxes, or push all filtered results at once
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                Invoices marked with <AlertTriangle className="w-3 h-3 inline" /> may fall within an already-filed GST period
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                Each bill is created as a Zoho Books invoice linked to the synced customer contact
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                Use Dry Run to preview which bills would be pushed without creating anything
              </li>
            </ul>
          </div>
          </>
          )}

          {/* Push Results */}
          {pushResult && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="p-4 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <h4 className="text-sm font-semibold text-gray-900">
                    {pushResult.dryRun ? 'Dry Run Results' : 'Push Results'}
                  </h4>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-gray-600">
                      Total: <strong>{pushResult.total}</strong>
                    </span>
                    <span className="text-green-700">
                      Pushed: <strong>{pushResult.pushed}</strong>
                    </span>
                    <span className="text-amber-700">
                      Skipped: <strong>{pushResult.skipped}</strong>
                    </span>
                    <span className="text-red-700">
                      Errors: <strong>{pushResult.errors}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 px-4 py-2 bg-gray-50 border-b border-gray-200">
                {(['all', 'pushed', 'skipped', 'error'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setPushFilter(f)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      pushFilter === f
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {f === 'all' && `All (${pushResult.details.length})`}
                    {f === 'pushed' && `Pushed (${pushResult.details.filter(d => d.status === 'pushed').length})`}
                    {f === 'skipped' && `Skipped (${pushResult.details.filter(d => d.status.startsWith('skipped')).length})`}
                    {f === 'error' && `Errors (${pushResult.details.filter(d => isErrorStatus(d.status)).length})`}
                  </button>
                ))}
              </div>

              {/* Details Table */}
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Bill No.</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Type</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Customer</th>
                      <th className="text-right px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Amount</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Zoho Invoice</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredInvoiceDetails.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                          No records in this category
                        </td>
                      </tr>
                    ) : (
                      filteredInvoiceDetails.map((d, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-gray-700 font-mono text-xs">{d.bill_number}</td>
                          <td className="px-4 py-2">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              d.bill_type === 'LR' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                            }`}>
                              {d.bill_type}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-gray-900">{d.customer_name}</td>
                          <td className="px-4 py-2 text-right text-gray-700 font-medium">{formatCurrency(d.amount)}</td>
                          <td className="px-4 py-2 text-gray-500 font-mono text-xs">{d.zoho_invoice_number || d.zoho_invoice_id || '-'}</td>
                          <td className="px-4 py-2">
                            <span className={`text-xs ${
                              d.status === 'pushed' ? 'text-green-700' :
                              d.status.startsWith('skipped') ? 'text-amber-700' :
                              d.status.includes('error') ? 'text-red-700' :
                              'text-gray-500'
                            }`}>
                              {d.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Purchase Bills (THC) Card */}
      {status?.connected && view === 'main' && activeTab === 'purchases' && (
        <div className="space-y-6">
          {/* Vendor Sync Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 bg-orange-50 rounded-lg">
                <Users className="w-5 h-5 text-orange-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-gray-900">Vendor Sync</h2>
                <p className="text-sm text-gray-500">Sync your local vendors with Zoho Books vendor contacts before pushing purchase bills</p>
              </div>
            </div>

            {purchaseStats && (
              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="p-3 bg-gray-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-gray-900">{purchaseStats.vendors.total}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Total Vendors</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-green-700">{purchaseStats.vendors.linked}</p>
                  <p className="text-xs text-green-600 mt-0.5">Linked to Zoho</p>
                </div>
                <div className="p-3 bg-amber-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-amber-700">{purchaseStats.vendors.unlinked}</p>
                  <p className="text-xs text-amber-600 mt-0.5">Not Yet Linked</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={handleSyncVendors}
                disabled={vendorSyncing}
                className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {vendorSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                {vendorSyncing ? 'Syncing...' : 'Sync Vendors Now'}
              </button>
            </div>

            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200 mb-4">
              <h4 className="text-sm font-semibold text-orange-900 mb-2">How vendor sync works</h4>
              <ul className="space-y-1.5 text-sm text-orange-800">
                <li className="flex items-start gap-2">
                  <ArrowRight className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  Fetches all vendor contacts from Zoho Books
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  Matches local vendors to Zoho contacts by name
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  Unmatched vendors are automatically created in Zoho Books
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  Links are stored in the vendor master table
                </li>
              </ul>
            </div>

            {vendorSyncResult && (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="p-4 bg-gray-50 border-b border-gray-200">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <h4 className="text-sm font-semibold text-gray-900">Vendor Sync Results</h4>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-gray-600">Zoho: <strong>{vendorSyncResult.zohoCount}</strong></span>
                      <span className="text-gray-600">Local: <strong>{vendorSyncResult.localCount}</strong></span>
                      <span className="text-green-700">Linked: <strong>{vendorSyncResult.matched}</strong></span>
                      <span className="text-blue-700">Pushed: <strong>{vendorSyncResult.pushed}</strong></span>
                      <span className="text-red-700">Errors: <strong>{vendorSyncResult.errors}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 px-4 py-2 bg-gray-50 border-b border-gray-200">
                  {(['all', 'linked', 'pushed', 'error'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setVendorSyncFilter(f)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                        vendorSyncFilter === f ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {f === 'all' && `All (${vendorSyncResult.details.length})`}
                      {f === 'linked' && `Linked (${vendorSyncResult.details.filter(d => d.action === 'link' && (d.status === 'linked' || d.status === 'already linked' || d.status.includes('relinked'))).length})`}
                      {f === 'pushed' && `Pushed (${vendorSyncResult.details.filter(d => d.action === 'push' && d.status === 'pushed').length})`}
                      {f === 'error' && `Errors (${vendorSyncResult.details.filter(d => d.status.includes('error') || d.status === 'not in Zoho').length})`}
                    </button>
                  ))}
                </div>

                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white border-b border-gray-200">
                      <tr>
                        <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Vendor Code</th>
                        <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Name</th>
                        <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Action</th>
                        <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Zoho ID</th>
                        <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredVendorSyncDetails.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-gray-400">No records in this category</td>
                        </tr>
                      ) : (
                        filteredVendorSyncDetails.map((d, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-gray-700 font-mono text-xs">{d.vendor_code}</td>
                            <td className="px-4 py-2 text-gray-900">{d.vendor_name}</td>
                            <td className="px-4 py-2">
                              {d.action === 'link' ? (
                                <span className="inline-flex items-center gap-1 text-xs text-green-700">
                                  <Link2 className="w-3 h-3" /> Link
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs text-blue-700">
                                  <Upload className="w-3 h-3" /> Push
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-gray-500 font-mono text-xs">{d.zoho_id || '-'}</td>
                            <td className="px-4 py-2">
                              <span className={`text-xs ${
                                d.status === 'linked' || d.status === 'already linked' ? 'text-green-700' :
                                d.status === 'pushed' ? 'text-blue-700' :
                                d.status.includes('error') ? 'text-red-700' :
                                'text-gray-500'
                              }`}>{d.status}</span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Push Purchases Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 bg-emerald-50 rounded-lg">
                <FileText className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-gray-900">Push Purchase Bills to Zoho Books</h2>
                <p className="text-sm text-gray-500">Export THC records as purchase bills to Zoho Books</p>
              </div>
            </div>

            {purchaseStats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                <button
                  onClick={() => { setThcFilter('all'); fetchPendingTHCs('all'); }}
                  className={`p-3 rounded-lg text-center transition-all border-2 ${thcFilter === 'all' ? 'bg-gray-100 border-gray-900 ring-2 ring-gray-900/10' : 'bg-gray-50 border-transparent hover:bg-gray-100 hover:border-gray-300'}`}
                >
                  <p className="text-2xl font-bold text-gray-900">{purchaseStats.thc.total}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Total THCs</p>
                </button>
                <button
                  onClick={() => { setThcFilter('pushed'); fetchPendingTHCs('pushed'); }}
                  className={`p-3 rounded-lg text-center transition-all border-2 ${thcFilter === 'pushed' ? 'bg-green-100 border-green-700 ring-2 ring-green-700/10' : 'bg-green-50 border-transparent hover:bg-green-100 hover:border-green-300'}`}
                >
                  <p className="text-2xl font-bold text-green-700">{purchaseStats.thc.synced}</p>
                  <p className="text-xs text-green-600 mt-0.5">Pushed to Zoho</p>
                </button>
                <button
                  onClick={() => { setThcFilter('pending'); fetchPendingTHCs('pending'); }}
                  className={`p-3 rounded-lg text-center transition-all border-2 ${thcFilter === 'pending' ? 'bg-amber-100 border-amber-700 ring-2 ring-amber-700/10' : 'bg-amber-50 border-transparent hover:bg-amber-100 hover:border-amber-300'}`}
                >
                  <p className="text-2xl font-bold text-amber-700">{purchaseStats.thc.pending}</p>
                  <p className="text-xs text-amber-600 mt-0.5">Pending</p>
                </button>
                <button
                  onClick={() => { setThcFilter('failed'); fetchPendingTHCs('failed'); }}
                  className={`p-3 rounded-lg text-center transition-all border-2 ${thcFilter === 'failed' ? 'bg-red-100 border-red-700 ring-2 ring-red-700/10' : 'bg-red-50 border-transparent hover:bg-red-100 hover:border-red-300'}`}
                >
                  <p className="text-2xl font-bold text-red-700">{purchaseStats.thc.failed}</p>
                  <p className="text-xs text-red-600 mt-0.5">Failed</p>
                </button>
              </div>
            )}

            {/* Summary bar */}
            <div className="flex items-center justify-between flex-wrap gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200 mb-4">
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-emerald-600" />
                <p className="text-sm font-medium text-emerald-900">
                  <strong>{pendingTHCs.length}</strong> {thcFilter === 'all' ? 'total' : thcFilter} THCs{thcFilter === 'pushed' ? ' pushed to Zoho' : thcFilter === 'pending' ? ' pending push' : thcFilter === 'failed' ? ' with errors' : ' loaded'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {selectedTHCIds.size > 0 && (
                  <span className="text-sm text-emerald-700 font-medium">
                    {selectedTHCIds.size} selected
                  </span>
                )}
                <button
                  onClick={() => fetchPendingTHCs()}
                  disabled={loadingPendingTHCs}
                  className="flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-900 font-medium"
                >
                  {loadingPendingTHCs ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                  Refresh List
                </button>
              </div>
            </div>

            {/* Pending THCs table */}
            {loadingPendingTHCs ? (
              <div className="flex items-center justify-center py-12 border border-gray-200 rounded-lg">
                <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                <span className="ml-3 text-gray-500 text-sm">Loading THCs...</span>
              </div>
            ) : pendingTHCs.length === 0 ? (
              <div className="flex items-center justify-center py-12 border border-gray-200 rounded-lg">
                <p className="text-gray-400 text-sm">No THCs in this category.</p>
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg overflow-hidden mb-4">
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white border-b border-gray-200 z-10">
                      <tr>
                        <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide w-10">
                          <input
                            type="checkbox"
                            checked={pendingTHCs.length > 0 && pendingTHCs.every(t => selectedTHCIds.has(t.thc_id))}
                            onChange={toggleSelectAllTHCs}
                            className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          />
                        </th>
                        <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">THC No.</th>
                        <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">LR No.</th>
                        <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">THC ID</th>
                        <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Date</th>
                        <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Vendor</th>
                        <th className="text-right px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Amount</th>
                        <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {pendingTHCs.map((t) => {
                        const isSelected = selectedTHCIds.has(t.thc_id);
                        const status = t.zoho_sync_status || 'not_synced';
                        return (
                          <tr key={t.thc_id} className={`hover:bg-gray-50 ${isSelected ? 'bg-emerald-50/50' : ''}`}>
                            <td className="px-4 py-2">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleTHCSelection(t.thc_id)}
                                className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                              />
                            </td>
                            <td className="px-4 py-2 text-gray-700 font-mono text-xs">{t.thc_number || '-'}</td>
                            <td className="px-4 py-2 text-gray-700 font-mono text-xs">{t.lr_number || '-'}</td>
                            <td className="px-4 py-2 text-gray-600 font-mono text-xs">{t.thc_id_number || '-'}</td>
                            <td className="px-4 py-2 text-gray-600 text-xs">{formatDateShort(t.thc_date)}</td>
                            <td className="px-4 py-2 text-gray-900">{t.vendor_name || '-'}</td>
                            <td className="px-4 py-2 text-right text-gray-700 font-medium">{formatCurrency(t.thc_gross_amount)}</td>
                            <td className="px-4 py-2">
                              {status === 'synced' ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Pushed</span>
                              ) : status === 'failed' ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Failed</span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Pending</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Push buttons */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <button
                onClick={() => handlePushPurchases()}
                disabled={pushingPurchases || selectedTHCIds.size === 0}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {pushingPurchases ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {pushingPurchases ? 'Processing...' : `Push ${selectedTHCIds.size} Selected`}
              </button>
              <button
                onClick={() => handlePushPurchases(pendingTHCs.map(t => t.thc_id))}
                disabled={pushingPurchases || pendingTHCs.length === 0}
                className="flex items-center gap-2 px-5 py-2.5 bg-gray-700 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {pushingPurchases ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {pushingPurchases ? 'Processing...' : `Push All ${pendingTHCs.length} ${thcFilter === 'all' ? 'Loaded' : thcFilter === 'pushed' ? 'Pushed' : thcFilter === 'failed' ? 'Failed' : 'Pending'}`}
              </button>
              {selectedTHCIds.size > 0 && (
                <button
                  onClick={() => setSelectedTHCIds(new Set())}
                  className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 font-medium"
                >
                  <X className="w-3.5 h-3.5" />
                  Clear Selection
                </button>
              )}
            </div>

            {/* Info banner */}
            <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200 mb-4">
              <h4 className="text-sm font-semibold text-emerald-900 mb-2">How purchase bill push works</h4>
              <ul className="space-y-1.5 text-sm text-emerald-800">
                <li className="flex items-start gap-2">
                  <ArrowRight className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  Each THC is created as a Zoho Books Purchase Bill linked to the synced vendor contact
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  Line items include freight, loading, unloading, detention, other charges, and munshiyana
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  THCs with unlinked vendors are skipped — run Vendor Sync first
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  Already-synced THCs are skipped automatically
                </li>
              </ul>
            </div>

            {/* Push results */}
            {purchasePushResult && (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="p-4 bg-gray-50 border-b border-gray-200">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <h4 className="text-sm font-semibold text-gray-900">Push Results</h4>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-gray-600">Total: <strong>{purchasePushResult.total}</strong></span>
                      <span className="text-green-700">Pushed: <strong>{purchasePushResult.pushed}</strong></span>
                      <span className="text-amber-700">Skipped: <strong>{purchasePushResult.skipped}</strong></span>
                      <span className="text-red-700">Errors: <strong>{purchasePushResult.errors}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 px-4 py-2 bg-gray-50 border-b border-gray-200">
                  {(['all', 'pushed', 'skipped', 'error'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setPurchasePushFilter(f)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                        purchasePushFilter === f ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {f === 'all' && `All (${purchasePushResult.details.length})`}
                      {f === 'pushed' && `Pushed (${purchasePushResult.details.filter(d => d.status === 'pushed').length})`}
                      {f === 'skipped' && `Skipped (${purchasePushResult.details.filter(d => d.status.startsWith('skipped')).length})`}
                      {f === 'error' && `Errors (${purchasePushResult.details.filter(d => d.status.includes('error') || d.status === 'api-error').length})`}
                    </button>
                  ))}
                </div>

                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white border-b border-gray-200">
                      <tr>
                        <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">THC No.</th>
                        <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Vendor</th>
                        <th className="text-right px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Amount</th>
                        <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Zoho Bill</th>
                        <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredPurchaseDetails.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-gray-400">No records in this category</td>
                        </tr>
                      ) : (
                        filteredPurchaseDetails.map((d, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-gray-700 font-mono text-xs">{d.thc_number || '-'}</td>
                            <td className="px-4 py-2 text-gray-900">{d.vendor_name || '-'}</td>
                            <td className="px-4 py-2 text-right text-gray-700 font-medium">{formatCurrency(d.amount)}</td>
                            <td className="px-4 py-2 text-gray-500 font-mono text-xs">{d.zoho_bill_number || d.zoho_bill_id || '-'}</td>
                            <td className="px-4 py-2">
                              <span className={`text-xs ${
                                d.status === 'pushed' ? 'text-green-700' :
                                d.status.startsWith('skipped') ? 'text-amber-700' :
                                'text-red-700'
                              }`}>{d.status}</span>
                              {d.detail && <p className="text-xs text-gray-400 mt-0.5">{d.detail}</p>}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* API Access Card */}
      {status?.connected && view === 'main' && activeTab === 'invoices' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">API Access</h2>
            <a
              href="https://www.zoho.com/books/api/v3/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700 font-medium"
            >
              API Docs <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
          <p className="text-sm text-gray-600 mb-3">
            The Zoho Books API proxy is active. API calls are made through the secure edge function which handles
            authentication and automatic token refresh.
          </p>
          <div className="p-3 bg-gray-900 rounded-lg overflow-x-auto">
            <code className="text-xs text-green-400 font-mono">
              POST {apiUrl}?action=proxy
              <br />
              <span className="text-gray-400">{'{ "method": "GET", "path": "/books/v3/invoices" }'}</span>
            </code>
          </div>
        </div>
      )}

      {/* GST Period Warning Modal */}
      {showGstWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="flex items-center gap-3 p-5 bg-amber-50 border-b border-amber-200">
              <div className="p-2 bg-amber-100 rounded-full">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="text-lg font-bold text-amber-900">GST Filed Period Warning</h3>
              <button
                onClick={() => {
                  setShowGstWarning(false);
                  setPendingPushAction(null);
                }}
                className="ml-auto text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5">
              <p className="text-sm text-gray-700 leading-relaxed">
                Some selected invoices belong to a GST-filed period. Generating invoices for this period may cause
                discrepancies in your GST returns.
              </p>
              <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-xs text-amber-800">
                  <strong>{selectedInvoices.filter(inv => isInFiledGstPeriod(inv.bill_date)).length}</strong> of{' '}
                  <strong>{selectedInvoices.length}</strong> selected invoices fall within a potentially filed GST period
                  (on or before the 11th of last month).
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-4 bg-gray-50 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowGstWarning(false);
                  setPendingPushAction(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (pendingPushAction) pendingPushAction();
                  else setShowGstWarning(false);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors"
              >
                Proceed Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ATH Payment Tab ── */}
      {status?.connected && view === 'main' && activeTab === 'ath-payment' && (
        <div className="space-y-4">
          {/* Summary bar */}
          <div className="flex items-center justify-between bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Total Records</p>
                <p className="text-xl font-bold text-gray-900">{athRecords.length}</p>
              </div>
              <div className="h-8 w-px bg-gray-200" />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Total Advance Amount</p>
                <p className="text-xl font-bold text-gray-900">₹{athTotalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
            <button
              onClick={fetchAthRecords}
              disabled={loadingAth}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loadingAth ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {athError && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm font-medium">{athError}</p>
            </div>
          )}

          {loadingAth && athRecords.length === 0 ? (
            <div className="flex items-center justify-center py-20 bg-white rounded-xl shadow-sm border border-gray-200">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : athRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl shadow-sm border border-gray-200">
              <Wallet className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">No ATH payment records found</p>
              <p className="text-sm text-gray-400 mt-1">Records processed through "Generate Advance Bank File" will appear here.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">THC No</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">LR No</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Vendor</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Vehicle</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Route</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">Advance</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">ATH Date</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Bank Account</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-700">Zoho Status</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {athRecords.map((record) => (
                      <tr key={record.thc_id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900">{record.thc_id_number}</td>
                        <td className="px-4 py-3 text-gray-600">{record.lr_number || '-'}</td>
                        <td className="px-4 py-3 text-gray-600">{record.vendor_name}</td>
                        <td className="px-4 py-3 text-gray-600">{record.vehicle_number || '-'}</td>
                        <td className="px-4 py-3 text-gray-600">
                          {record.origin || '-'} → {record.destination || '-'}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900">
                          ₹{(record.thc_advance_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {record.ath_date ? new Date(record.ath_date).toLocaleDateString('en-GB') : '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {editingAth === record.thc_id ? (
                            <div className="space-y-1">
                              <input
                                type="text"
                                value={editForm.ven_act_name}
                                onChange={(e) => setEditForm({ ...editForm, ven_act_name: e.target.value })}
                                placeholder="Account Name"
                                className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                              />
                              <input
                                type="text"
                                value={editForm.ven_act_number}
                                onChange={(e) => setEditForm({ ...editForm, ven_act_number: e.target.value })}
                                placeholder="Account No"
                                className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                              />
                              <input
                                type="text"
                                value={editForm.ven_act_ifsc}
                                onChange={(e) => setEditForm({ ...editForm, ven_act_ifsc: e.target.value })}
                                placeholder="IFSC"
                                className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                              />
                              <input
                                type="text"
                                value={editForm.ven_act_bank}
                                onChange={(e) => setEditForm({ ...editForm, ven_act_bank: e.target.value })}
                                placeholder="Bank"
                                className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                              />
                              <input
                                type="text"
                                value={editForm.ven_act_branch}
                                onChange={(e) => setEditForm({ ...editForm, ven_act_branch: e.target.value })}
                                placeholder="Branch"
                                className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                              />
                              <input
                                type="number"
                                value={editForm.thc_advance_amount}
                                onChange={(e) => setEditForm({ ...editForm, thc_advance_amount: parseFloat(e.target.value) || 0 })}
                                placeholder="Advance Amount"
                                className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                              />
                              <div className="flex gap-1">
                                <button
                                  onClick={saveEditAth}
                                  className="px-2 py-1 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => setEditingAth(null)}
                                  className="px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs">
                              <div>{record.ven_act_name || '-'}</div>
                              <div className="text-gray-400">{record.ven_act_number || ''}</div>
                              <div className="text-gray-400">{record.ven_act_bank || ''} {record.ven_act_ifsc || ''}</div>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {record.zoho_ath_sync_status === 'synced' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full">
                              <CheckCircle className="w-3 h-3" />
                              Pushed
                            </span>
                          ) : record.zoho_ath_sync_status === 'failed' ? (
                            <div className="flex flex-col items-center gap-1">
                              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-full">
                                <AlertCircle className="w-3 h-3" />
                                Failed
                              </span>
                              {record.zoho_ath_error && (
                                <span className="text-xs text-red-600 max-w-xs" title={record.zoho_ath_error}>
                                  {record.zoho_ath_error.length > 60 ? record.zoho_ath_error.slice(0, 60) + '...' : record.zoho_ath_error}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-500 bg-gray-50 border border-gray-200 rounded-full">
                              <Clock className="w-3 h-3" />
                              Not Pushed
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setViewingAth(record)}
                              className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                              title="View"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {editingAth !== record.thc_id && (
                              <button
                                onClick={() => startEditAth(record)}
                                className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => submitAthPayment(record)}
                              disabled={submittingAth === record.thc_id}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                              title={record.zoho_ath_sync_status === 'failed' ? 'Retry ATH Payment push to Zoho' : 'Submit Payment to Zoho'}
                            >
                              {submittingAth === record.thc_id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Send className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* View modal */}
          {viewingAth && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <h2 className="text-lg font-bold text-gray-900">ATH Payment Details</h2>
                  <button onClick={() => setViewingAth(null)} className="p-1 text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div><p className="text-xs text-gray-500 uppercase">THC Number</p><p className="font-medium text-gray-900">{viewingAth.thc_id_number}</p></div>
                    <div><p className="text-xs text-gray-500 uppercase">LR Number</p><p className="font-medium text-gray-900">{viewingAth.lr_number || '-'}</p></div>
                    <div><p className="text-xs text-gray-500 uppercase">Vendor</p><p className="font-medium text-gray-900">{viewingAth.vendor_name}</p></div>
                    <div><p className="text-xs text-gray-500 uppercase">Vehicle</p><p className="font-medium text-gray-900">{viewingAth.vehicle_number || '-'}</p></div>
                    <div><p className="text-xs text-gray-500 uppercase">Origin</p><p className="font-medium text-gray-900">{viewingAth.origin || '-'}</p></div>
                    <div><p className="text-xs text-gray-500 uppercase">Destination</p><p className="font-medium text-gray-900">{viewingAth.destination || '-'}</p></div>
                    <div><p className="text-xs text-gray-500 uppercase">Vehicle Type</p><p className="font-medium text-gray-900">{viewingAth.vehicle_type || '-'}</p></div>
                    <div><p className="text-xs text-gray-500 uppercase">ATH Date</p><p className="font-medium text-gray-900">{viewingAth.ath_date ? new Date(viewingAth.ath_date).toLocaleDateString('en-GB') : '-'}</p></div>
                    <div><p className="text-xs text-gray-500 uppercase">THC Amount</p><p className="font-medium text-gray-900">₹{(viewingAth.thc_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p></div>
                    <div><p className="text-xs text-gray-500 uppercase">Advance Amount</p><p className="font-medium text-gray-900">₹{(viewingAth.thc_advance_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p></div>
                    <div><p className="text-xs text-gray-500 uppercase">Net Payable</p><p className="font-medium text-gray-900">₹{(viewingAth.thc_net_payable_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p></div>
                  </div>
                  <div className="border-t border-gray-200 pt-4">
                    <p className="text-xs text-gray-500 uppercase mb-2">Bank Account Details</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div><p className="text-xs text-gray-400">Account Name</p><p className="font-medium text-gray-900">{viewingAth.ven_act_name || '-'}</p></div>
                      <div><p className="text-xs text-gray-400">Account Number</p><p className="font-medium text-gray-900">{viewingAth.ven_act_number || '-'}</p></div>
                      <div><p className="text-xs text-gray-400">IFSC Code</p><p className="font-medium text-gray-900">{viewingAth.ven_act_ifsc || '-'}</p></div>
                      <div><p className="text-xs text-gray-400">Bank</p><p className="font-medium text-gray-900">{viewingAth.ven_act_bank || '-'}</p></div>
                      <div><p className="text-xs text-gray-400">Branch</p><p className="font-medium text-gray-900">{viewingAth.ven_act_branch || '-'}</p></div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-3 p-4 bg-gray-50 border-t border-gray-200">
                  <button onClick={() => setViewingAth(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── BTH Payment Tab ── */}
      {status?.connected && view === 'main' && activeTab === 'bth-payment' && (
        <div className="space-y-4">
          {/* Summary bar */}
          <div className="flex items-center justify-between bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Total Records</p>
                <p className="text-xl font-bold text-gray-900">{bthRecords.length}</p>
              </div>
              <div className="h-8 w-px bg-gray-200" />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Total Balance Payable</p>
                <p className="text-xl font-bold text-gray-900">₹{bthTotalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
            <button
              onClick={fetchBthRecords}
              disabled={loadingBth}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loadingBth ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {bthError && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm font-medium">{bthError}</p>
            </div>
          )}

          {loadingBth && bthRecords.length === 0 ? (
            <div className="flex items-center justify-center py-20 bg-white rounded-xl shadow-sm border border-gray-200">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : bthRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl shadow-sm border border-gray-200">
              <Wallet className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">No BTH payment records found</p>
              <p className="text-sm text-gray-400 mt-1">Records with status "Financially Close" and a balance payment date will appear here.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">THC No</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">LR No</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Vendor</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Vehicle</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Route</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">Balance Amount</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Balance Pmt Date</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Bank Account</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-700">ATH Status</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-700">BTH Status</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {bthRecords.map((record) => (
                      <tr key={record.thc_id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900">{record.thc_id_number}</td>
                        <td className="px-4 py-3 text-gray-600">{record.lr_number || '-'}</td>
                        <td className="px-4 py-3 text-gray-600">{record.vendor_name}</td>
                        <td className="px-4 py-3 text-gray-600">{record.vehicle_number || '-'}</td>
                        <td className="px-4 py-3 text-gray-600">
                          {record.origin || '-'} → {record.destination || '-'}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900">
                          ₹{(record.thc_balance_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {record.thc_balance_payment_date ? new Date(record.thc_balance_payment_date).toLocaleDateString('en-GB') : '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {editingBth === record.thc_id ? (
                            <div className="space-y-1">
                              <input
                                type="text"
                                value={bthEditForm.ven_act_name}
                                onChange={(e) => setBthEditForm({ ...bthEditForm, ven_act_name: e.target.value })}
                                placeholder="Account Name"
                                className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                              />
                              <input
                                type="text"
                                value={bthEditForm.ven_act_number}
                                onChange={(e) => setBthEditForm({ ...bthEditForm, ven_act_number: e.target.value })}
                                placeholder="Account No"
                                className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                              />
                              <input
                                type="text"
                                value={bthEditForm.ven_act_ifsc}
                                onChange={(e) => setBthEditForm({ ...bthEditForm, ven_act_ifsc: e.target.value })}
                                placeholder="IFSC"
                                className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                              />
                              <input
                                type="text"
                                value={bthEditForm.ven_act_bank}
                                onChange={(e) => setBthEditForm({ ...bthEditForm, ven_act_bank: e.target.value })}
                                placeholder="Bank"
                                className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                              />
                              <input
                                type="text"
                                value={bthEditForm.ven_act_branch}
                                onChange={(e) => setBthEditForm({ ...bthEditForm, ven_act_branch: e.target.value })}
                                placeholder="Branch"
                                className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                              />
                              <input
                                type="number"
                                value={bthEditForm.thc_balance_amount}
                                onChange={(e) => setBthEditForm({ ...bthEditForm, thc_balance_amount: parseFloat(e.target.value) || 0 })}
                                placeholder="Balance Amount"
                                className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                              />
                              <input
                                type="text"
                                value={bthEditForm.thc_balance_pmt_utr_details}
                                onChange={(e) => setBthEditForm({ ...bthEditForm, thc_balance_pmt_utr_details: e.target.value })}
                                placeholder="UTR Details"
                                className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                              />
                              <div className="flex gap-1">
                                <button
                                  onClick={saveEditBth}
                                  className="px-2 py-1 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => setEditingBth(null)}
                                  className="px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs">
                              <div>{record.ven_act_name || '-'}</div>
                              <div className="text-gray-400">{record.ven_act_number || ''}</div>
                              <div className="text-gray-400">{record.ven_act_bank || ''} {record.ven_act_ifsc || ''}</div>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {record.zoho_ath_sync_status === 'synced' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full">
                              <CheckCircle className="w-3 h-3" />
                              Pushed
                            </span>
                          ) : record.zoho_ath_sync_status === 'failed' ? (
                            <div className="flex flex-col items-center gap-1">
                              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-full">
                                <AlertCircle className="w-3 h-3" />
                                Failed
                              </span>
                              {record.zoho_ath_error && (
                                <span className="text-xs text-red-600 max-w-xs" title={record.zoho_ath_error}>
                                  {record.zoho_ath_error.length > 60 ? record.zoho_ath_error.slice(0, 60) + '...' : record.zoho_ath_error}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-500 bg-gray-50 border border-gray-200 rounded-full">
                              <Clock className="w-3 h-3" />
                              Not Pushed
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {record.zoho_bth_sync_status === 'synced' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full">
                              <CheckCircle className="w-3 h-3" />
                              Pushed
                            </span>
                          ) : record.zoho_bth_sync_status === 'failed' ? (
                            <div className="flex flex-col items-center gap-1">
                              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-full">
                                <AlertCircle className="w-3 h-3" />
                                Failed
                              </span>
                              {record.zoho_bth_error && (
                                <span className="text-xs text-red-600 max-w-xs" title={record.zoho_bth_error}>
                                  {record.zoho_bth_error.length > 60 ? record.zoho_bth_error.slice(0, 60) + '...' : record.zoho_bth_error}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-500 bg-gray-50 border border-gray-200 rounded-full">
                              <Clock className="w-3 h-3" />
                              Not Pushed
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setViewingBth(record)}
                              className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                              title="View"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {editingBth !== record.thc_id && (
                              <button
                                onClick={() => startEditBth(record)}
                                className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                            )}
                            {record.zoho_ath_sync_status !== 'synced' && (
                              <>
                                {record.zoho_ath_sync_status === 'failed' && (
                                  <button
                                    onClick={() => retryAthPush(record)}
                                    disabled={retryingAthBth === record.thc_id}
                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                    title="Retry ATH push to Zoho"
                                  >
                                    {retryingAthBth === record.thc_id ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <RotateCcw className="w-4 h-4" />
                                    )}
                                  </button>
                                )}
                                <button
                                  onClick={() => verifyAthInZoho(record)}
                                  disabled={verifyingAthBth === record.thc_id}
                                  className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-50"
                                  title="Verify ATH payment in Zoho Books"
                                >
                                  {verifyingAthBth === record.thc_id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <SearchCheck className="w-4 h-4" />
                                  )}
                                </button>
                                <button
                                  onClick={() => markAthPushedInBth(record)}
                                  disabled={markingAthBth === record.thc_id}
                                  className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50"
                                  title="Mark ATH as pushed (manual)"
                                >
                                  {markingAthBth === record.thc_id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <CheckSquare className="w-4 h-4" />
                                  )}
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => submitBthPayment(record)}
                              disabled={submittingBth === record.thc_id || record.zoho_ath_sync_status !== 'synced'}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                              title={record.zoho_ath_sync_status !== 'synced' ? 'ATH must be pushed first' : 'Submit BTH Payment to Zoho'}
                            >
                              {submittingBth === record.thc_id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Send className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* View modal */}
          {viewingBth && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <h2 className="text-lg font-bold text-gray-900">BTH Payment Details</h2>
                  <button onClick={() => setViewingBth(null)} className="p-1 text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div><p className="text-xs text-gray-500 uppercase">THC Number</p><p className="font-medium text-gray-900">{viewingBth.thc_id_number}</p></div>
                    <div><p className="text-xs text-gray-500 uppercase">LR Number</p><p className="font-medium text-gray-900">{viewingBth.lr_number || '-'}</p></div>
                    <div><p className="text-xs text-gray-500 uppercase">Vendor</p><p className="font-medium text-gray-900">{viewingBth.vendor_name}</p></div>
                    <div><p className="text-xs text-gray-500 uppercase">Vehicle</p><p className="font-medium text-gray-900">{viewingBth.vehicle_number || '-'}</p></div>
                    <div><p className="text-xs text-gray-500 uppercase">Origin</p><p className="font-medium text-gray-900">{viewingBth.origin || '-'}</p></div>
                    <div><p className="text-xs text-gray-500 uppercase">Destination</p><p className="font-medium text-gray-900">{viewingBth.destination || '-'}</p></div>
                    <div><p className="text-xs text-gray-500 uppercase">Vehicle Type</p><p className="font-medium text-gray-900">{viewingBth.vehicle_type || '-'}</p></div>
                    <div><p className="text-xs text-gray-500 uppercase">Balance Pmt Date</p><p className="font-medium text-gray-900">{viewingBth.thc_balance_payment_date ? new Date(viewingBth.thc_balance_payment_date).toLocaleDateString('en-GB') : '-'}</p></div>
                    <div><p className="text-xs text-gray-500 uppercase">THC Amount</p><p className="font-medium text-gray-900">₹{(viewingBth.thc_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p></div>
                    <div><p className="text-xs text-gray-500 uppercase">Advance Amount</p><p className="font-medium text-gray-900">₹{(viewingBth.thc_advance_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p></div>
                    <div><p className="text-xs text-gray-500 uppercase">Balance Amount</p><p className="font-medium text-gray-900">₹{(viewingBth.thc_balance_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p></div>
                    <div><p className="text-xs text-gray-500 uppercase">UTR Details</p><p className="font-medium text-gray-900">{viewingBth.thc_balance_pmt_utr_details || '-'}</p></div>
                  </div>
                  <div className="border-t border-gray-200 pt-4">
                    <p className="text-xs text-gray-500 uppercase mb-2">Bank Account Details</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div><p className="text-xs text-gray-400">Account Name</p><p className="font-medium text-gray-900">{viewingBth.ven_act_name || '-'}</p></div>
                      <div><p className="text-xs text-gray-400">Account Number</p><p className="font-medium text-gray-900">{viewingBth.ven_act_number || '-'}</p></div>
                      <div><p className="text-xs text-gray-400">IFSC Code</p><p className="font-medium text-gray-900">{viewingBth.ven_act_ifsc || '-'}</p></div>
                      <div><p className="text-xs text-gray-400">Bank</p><p className="font-medium text-gray-900">{viewingBth.ven_act_bank || '-'}</p></div>
                      <div><p className="text-xs text-gray-400">Branch</p><p className="font-medium text-gray-900">{viewingBth.ven_act_branch || '-'}</p></div>
                    </div>
                  </div>
                  <div className="border-t border-gray-200 pt-4">
                    <p className="text-xs text-gray-500 uppercase mb-2">Zoho Sync Status</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-400">ATH Payment</p>
                        <p className="font-medium text-gray-900">{viewingBth.zoho_ath_sync_status || 'not_synced'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">BTH Payment</p>
                        <p className="font-medium text-gray-900">{viewingBth.zoho_bth_sync_status || 'not_synced'}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-3 p-4 bg-gray-50 border-t border-gray-200">
                  <button onClick={() => setViewingBth(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Payment Information View ── */}
      {status?.connected && view === 'payment-info' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setView('main')}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Zoho Books
            </button>
          </div>
          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg w-fit">
            <button
              onClick={() => setPaymentInfoPage('dashboard')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                paymentInfoPage === 'dashboard' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              Dashboard
            </button>
            <button
              onClick={() => setPaymentInfoPage('history')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                paymentInfoPage === 'history' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <History className="w-4 h-4" />
              History
            </button>
            <button
              onClick={() => setPaymentInfoPage('settings')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                paymentInfoPage === 'settings' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>
          </div>
          <div className="mt-2">
            {paymentInfoPage === 'dashboard' && <VendorPaymentsDashboard />}
            {paymentInfoPage === 'history' && <VendorPaymentHistory />}
            {paymentInfoPage === 'settings' && <VendorPaymentSettings />}
          </div>
        </div>
      )}
    </div>
  );
}
