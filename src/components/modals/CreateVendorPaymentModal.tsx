import { useState, useEffect, useRef } from 'react';
import {
  X,
  Loader2,
  Search,
  CreditCard,
  Calendar,
  FileText,
  AlertCircle,
  CheckCircle,
  Lock,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { VendorPayment } from '../pages/VendorPaymentsDashboard';

interface Settings {
  default_bank_account: string;
  auto_post: boolean;
  ath_requires_approval: boolean;
  bth_requires_approval: boolean;
}

interface ZohoVendor {
  contact_id: string;
  contact_name: string;
  email: string;
  phone: string;
  company_name: string;
}

interface ZohoBill {
  bill_id: string;
  bill_number: string;
  date: string;
  due_date: string;
  total: number;
  balance: number;
  status: string;
  vendor_name: string;
}

interface Props {
  settings: Settings | null;
  onClose: () => void;
  onCreated: () => void;
}

const inr = (v: number) =>
  v != null ? `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-';

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

export function CreateVendorPaymentModal({ settings, onClose, onCreated }: Props) {
  const [vendors, setVendors] = useState<ZohoVendor[]>([]);
  const [vendorsLoading, setVendorsLoading] = useState(true);
  const [vendorSearch, setVendorSearch] = useState('');
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<ZohoVendor | null>(null);

  const [bills, setBills] = useState<ZohoBill[]>([]);
  const [billsLoading, setBillsLoading] = useState(false);
  const [selectedBill, setSelectedBill] = useState<ZohoBill | null>(null);

  const [billAmount, setBillAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentType, setPaymentType] = useState<'ATH' | 'BTH'>('ATH');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/zoho-api`;
  const dropdownRef = useRef<HTMLDivElement>(null);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowVendorDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchVendors = async () => {
    setVendorsLoading(true);
    try {
      const res = await fetch(`${apiUrl}?action=fetch-vendors`, {
        headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
      });
      if (!res.ok) throw new Error('Failed to fetch vendors from Zoho Books');
      const data = await res.json();
      setVendors(data.vendors || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load vendors');
    } finally {
      setVendorsLoading(false);
    }
  };

  const fetchBills = async (vendorId: string) => {
    setBillsLoading(true);
    setSelectedBill(null);
    setBills([]);
    try {
      const res = await fetch(`${apiUrl}?action=fetch-bills`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ vendor_id: vendorId }),
      });
      if (!res.ok) throw new Error('Failed to fetch bills');
      const data = await res.json();
      setBills(data.bills || []);
    } catch {
      // non-critical - vendor may have no open bills
    } finally {
      setBillsLoading(false);
    }
  };

  const filteredVendors = vendors.filter((v) =>
    v.contact_name.toLowerCase().includes(vendorSearch.toLowerCase()),
  );

  const handleSelectVendor = (vendor: ZohoVendor) => {
    setSelectedVendor(vendor);
    setVendorSearch(vendor.contact_name);
    setShowVendorDropdown(false);
    if (paymentType === 'BTH') {
      fetchBills(vendor.contact_id);
    }
  };

  const handleTypeChange = (type: 'ATH' | 'BTH') => {
    setPaymentType(type);
    setSelectedBill(null);
    if (type === 'BTH' && selectedVendor) {
      fetchBills(selectedVendor.contact_id);
    }
  };

  const handleAmountChange = (val: string) => {
    const cleaned = val.replace(/[^0-9.]/g, '');
    setBillAmount(cleaned);
  };

  const generateRefNumber = (type: 'ATH' | 'BTH') => {
    const ts = Date.now().toString().slice(-6);
    return `${type}-${ts}`;
  };

  const handleSubmit = async () => {
    setError('');

    if (!selectedVendor) {
      setError('Please select a vendor');
      return;
    }
    const amount = parseFloat(billAmount);
    if (!amount || amount <= 0) {
      setError('Please enter a valid bill amount');
      return;
    }
    if (!paymentDate) {
      setError('Please select a payment date');
      return;
    }
    if (paymentType === 'BTH' && !selectedBill) {
      setError('Please select a bill for BTH (post-delivery) payment');
      return;
    }

    setSaving(true);
    try {
      const referenceNumber = generateRefNumber(paymentType);

      // Determine if approval is needed
      const requiresApproval =
        paymentType === 'ATH'
          ? settings?.ath_requires_approval ?? true
          : settings?.bth_requires_approval ?? false;

      const shouldAutoPost = settings?.auto_post && !requiresApproval;

      const { data, error: insertError } = await supabase
        .from('vendor_payments')
        .insert({
          vendor_name: selectedVendor.contact_name,
          vendor_id: selectedVendor.contact_id,
          bill_amount: amount,
          payment_date: paymentDate,
          payment_type: paymentType,
          status: shouldAutoPost ? 'processing' : 'pending',
          reference_number: referenceNumber,
          bill_id: selectedBill?.bill_id || null,
          notes: notes || null,
        })
        .select('*')
        .single();

      if (insertError) throw insertError;

      // If auto-post is enabled and no approval needed, post immediately
      if (shouldAutoPost && data) {
        const postRes = await fetch(`${apiUrl}?action=create-vendor-payment`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            vendor_id: selectedVendor.contact_id,
            vendor_name: selectedVendor.contact_name,
            amount,
            payment_date: paymentDate,
            payment_type: paymentType,
            reference_number: referenceNumber,
            notes,
            bill_id: selectedBill?.bill_id || null,
            bank_account_name: settings?.default_bank_account || 'HDFC Bank CA',
          }),
        });
        const postData = await postRes.json();

        if (postRes.ok && postData.success) {
          await supabase
            .from('vendor_payments')
            .update({
              status: 'posted',
              zoho_payment_id: postData.zoho_payment_id,
              posted_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', data.id);
          showToast('success', `Payment of ${inr(amount)} posted to Zoho Books successfully.`);
        } else {
          await supabase
            .from('vendor_payments')
            .update({
              status: 'failed',
              error_message: postData.error || 'Unknown error',
              updated_at: new Date().toISOString(),
            })
            .eq('id', data.id);
          showToast('error', postData.error || 'Failed to post payment.');
        }
      } else {
        showToast('success', requiresApproval
          ? `Payment saved as pending — approval required for ${paymentType} payments.`
          : 'Payment saved as pending. Post it from the dashboard when ready.');
      }

      setTimeout(() => onCreated(), 800);
    } catch (err: any) {
      setError(err.message || 'Failed to create payment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-20 right-6 z-50 px-5 py-3 rounded-lg shadow-lg flex items-center gap-2 ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="text-sm font-medium">{toast.msg}</span>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-lg">
              <CreditCard className="w-5 h-5 text-red-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">New Vendor Payment</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          {/* Vendor search */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Vendor Name *</label>
            <div className="relative" ref={dropdownRef}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={vendorSearch}
                  onChange={(e) => {
                    setVendorSearch(e.target.value);
                    setShowVendorDropdown(true);
                  }}
                  onFocus={() => setShowVendorDropdown(true)}
                  placeholder="Search vendor..."
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
              {showVendorDropdown && (
                <div className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto z-20">
                  {vendorsLoading ? (
                    <div className="flex items-center gap-2 px-4 py-3">
                      <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                      <span className="text-sm text-gray-400">Loading vendors...</span>
                    </div>
                  ) : filteredVendors.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-gray-400">No vendors found</div>
                  ) : (
                    filteredVendors.map((v) => (
                      <button
                        key={v.contact_id}
                        onClick={() => handleSelectVendor(v)}
                        className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                      >
                        <div className="text-sm font-medium text-gray-900">{v.contact_name}</div>
                        {v.company_name && (
                          <div className="text-xs text-gray-400">{v.company_name}</div>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            {selectedVendor && (
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Selected: {selectedVendor.contact_name}
              </p>
            )}
          </div>

          {/* Payment type */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Payment Type *</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleTypeChange('ATH')}
                className={`flex flex-col items-center gap-1 px-4 py-3 rounded-lg border-2 transition-all ${
                  paymentType === 'ATH'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}
              >
                <span className="text-sm font-bold">ATH</span>
                <span className="text-xs">Advance to Hand</span>
              </button>
              <button
                onClick={() => handleTypeChange('BTH')}
                className={`flex flex-col items-center gap-1 px-4 py-3 rounded-lg border-2 transition-all ${
                  paymentType === 'BTH'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}
              >
                <span className="text-sm font-bold">BTH</span>
                <span className="text-xs">Bill to Hand</span>
              </button>
            </div>
          </div>

          {/* Bill selector for BTH */}
          {paymentType === 'BTH' && selectedVendor && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Select Bill *</label>
              {billsLoading ? (
                <div className="flex items-center gap-2 py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                  <span className="text-sm text-gray-400">Loading bills...</span>
                </div>
              ) : bills.length === 0 ? (
                <div className="px-4 py-3 bg-gray-50 rounded-lg text-sm text-gray-400">
                  No open bills found for this vendor in Zoho Books.
                </div>
              ) : (
                <select
                  value={selectedBill?.bill_id || ''}
                  onChange={(e) => {
                    const bill = bills.find((b) => b.bill_id === e.target.value);
                    setSelectedBill(bill || null);
                    if (bill) setBillAmount(String(bill.balance));
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white"
                >
                  <option value="">-- Select a bill --</option>
                  {bills.map((b) => (
                    <option key={b.bill_id} value={b.bill_id}>
                      {b.bill_number} — {inr(b.balance)} (Due: {fmtDate(b.due_date)})
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Amount and date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Bill Amount *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500">₹</span>
                <input
                  type="text"
                  value={billAmount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Payment Date *</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Bank account (locked) */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Bank Account</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={settings?.default_bank_account || 'HDFC Bank CA'}
                disabled
                className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">Pre-filled from settings. Change in Settings panel.</p>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Reference / Notes (Optional)</label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Add any reference notes..."
                className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
              />
            </div>
          </div>

          {/* Approval notice */}
          {((paymentType === 'ATH' && settings?.ath_requires_approval) ||
            (paymentType === 'BTH' && settings?.bth_requires_approval)) && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0" />
              <span className="text-xs text-yellow-700">
                {paymentType} payments require approval before posting. This payment will be saved as pending.
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 sticky bottom-0 bg-white rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
            {settings?.auto_post && !((paymentType === 'ATH' && settings.ath_requires_approval) || (paymentType === 'BTH' && settings.bth_requires_approval))
              ? 'Create & Post'
              : 'Save Payment'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CreateVendorPaymentModal;
