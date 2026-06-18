import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  X, ChevronRight, ChevronLeft, CheckCircle, Loader2, IndianRupee,
  Truck, Building2, AlertCircle, Receipt, Layers, Search, Clock,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CustomerOption {
  code: string;
  name: string;
}

interface CombinedBillRow {
  bill_id: string;
  bill_number: string;
  bill_type: 'lr' | 'warehouse';
  bill_amount: number;
  bill_date: string;
  bill_due_date: string | null;
}

interface AllocationRow extends CombinedBillRow {
  allocated_amount: string;
}

interface PaymentForm {
  total_amount: string;
  payment_date: string;
  payment_mode: string;
  reference_number: string;
  remarks: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const todayStr = new Date().toISOString().split('T')[0];

const fmt = (val: number | null | undefined) =>
  val != null
    ? `₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
    : '-';

const fmtDate = (val: string | null | undefined) =>
  val
    ? new Date(val).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '-';

const isOverdue = (dueDate: string | null) =>
  dueDate ? new Date(dueDate) < new Date() : false;

// ─── Step Indicator ───────────────────────────────────────────────────────────

const STEPS = [
  { label: 'Select Customer' },
  { label: 'Select Bills' },
  { label: 'Allocate Payment' },
  { label: 'Review & Confirm' },
];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((s, i) => {
        const stepNum = i + 1;
        const done = current > stepNum;
        const active = current === stepNum;
        return (
          <div key={s.label} className="flex items-center">
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                done ? 'bg-emerald-500 text-white' : active ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {done ? <CheckCircle className="w-4 h-4" /> : stepNum}
              </div>
              <span className={`text-xs font-semibold hidden sm:block ${active ? 'text-blue-700' : done ? 'text-emerald-600' : 'text-gray-400'}`}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-8 md:w-16 h-0.5 mx-2 ${current > stepNum ? 'bg-emerald-400' : 'bg-gray-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── CombinedPaymentModal ─────────────────────────────────────────────────────

export function CombinedPaymentModal({
  customers,
  onClose,
  onSuccess,
}: {
  customers: CustomerOption[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);

  // Step 1
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomerCode, setSelectedCustomerCode] = useState('');

  // Step 2
  const [availableBills, setAvailableBills] = useState<CombinedBillRow[]>([]);
  const [loadingBills, setLoadingBills] = useState(false);
  const [billsError, setBillsError] = useState('');
  const [selectedBillIds, setSelectedBillIds] = useState<Set<string>>(new Set());

  // Step 3
  const [paymentForm, setPaymentForm] = useState<PaymentForm>({
    total_amount: '',
    payment_date: todayStr,
    payment_mode: 'Bank Transfer',
    reference_number: '',
    remarks: '',
  });
  const [allocations, setAllocations] = useState<AllocationRow[]>([]);
  const [step3Error, setStep3Error] = useState('');

  // Step 4
  const [referenceId, setReferenceId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [successRefId, setSuccessRefId] = useState('');

  // Derived
  const selectedCustomer = customers.find(c => c.code === selectedCustomerCode);
  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.code.toLowerCase().includes(customerSearch.toLowerCase())
  );
  const selectedBills = availableBills.filter(b => selectedBillIds.has(b.bill_id));

  const totalReceived = parseFloat(paymentForm.total_amount) || 0;
  const totalAllocated = allocations.reduce((s, a) => s + (parseFloat(a.allocated_amount) || 0), 0);
  const unallocated = totalReceived - totalAllocated;
  const isBalanced = Math.abs(unallocated) < 0.005;

  // ── Fetch bills when customer selected ──────────────────────────────────────

  useEffect(() => {
    if (!selectedCustomerCode) return;
    const fetch = async () => {
      setLoadingBills(true);
      setBillsError('');
      setAvailableBills([]);
      setSelectedBillIds(new Set());
      try {
        const [lrRes, whRes] = await Promise.all([
          supabase
            .from('lr_bill')
            .select('bill_id, lr_bill_number, lr_bill_date, lr_bill_due_date, bill_amount')
            .eq('billing_party_code', selectedCustomerCode)
            .neq('bill_status', 'Cancelled')
            .neq('bill_status', 'Regenerated')
            .order('lr_bill_date', { ascending: false }),
          supabase
            .from('warehouse_bill')
            .select('bill_id, bill_number, bill_date, bill_due_date, total_amount')
            .eq('billing_party_code', selectedCustomerCode)
            .neq('bill_status', 'Cancelled')
            .order('bill_date', { ascending: false }),
        ]);

        if (lrRes.error) throw lrRes.error;
        if (whRes.error) throw whRes.error;

        const lrBills: CombinedBillRow[] = (lrRes.data || []).map((r: any) => ({
          bill_id: r.bill_id,
          bill_number: r.lr_bill_number || '-',
          bill_type: 'lr' as const,
          bill_amount: r.bill_amount ?? 0,
          bill_date: r.lr_bill_date,
          bill_due_date: r.lr_bill_due_date ?? null,
        }));

        const whBills: CombinedBillRow[] = (whRes.data || []).map((r: any) => ({
          bill_id: r.bill_id,
          bill_number: r.bill_number || '-',
          bill_type: 'warehouse' as const,
          bill_amount: r.total_amount ?? 0,
          bill_date: r.bill_date,
          bill_due_date: r.bill_due_date ?? null,
        }));

        const allBills = [...lrBills, ...whBills];

        if (allBills.length > 0) {
          const { data: prData } = await supabase
            .from('payment_receipts')
            .select('bill_id')
            .in('bill_id', allBills.map(b => b.bill_id))
            .eq('is_cancelled', false);

          const paidIds = new Set((prData || []).map((p: any) => p.bill_id));
          const unpaid = allBills.filter(b => !paidIds.has(b.bill_id));
          unpaid.sort((a, b) => (a.bill_date < b.bill_date ? 1 : -1));
          setAvailableBills(unpaid);
        }
      } catch (err: any) {
        setBillsError(err.message || 'Failed to load bills');
      } finally {
        setLoadingBills(false);
      }
    };
    fetch();
  }, [selectedCustomerCode]);

  // ── Step transitions ─────────────────────────────────────────────────────────

  const goToStep2 = () => {
    if (!selectedCustomerCode) return;
    setStep(2);
  };

  const goToStep3 = () => {
    if (selectedBillIds.size < 2) return;
    setAllocations(selectedBills.map(b => ({ ...b, allocated_amount: '' })));
    setPaymentForm(f => ({ ...f, total_amount: '' }));
    setStep3Error('');
    setStep(3);
  };

  const goToStep4 = async () => {
    setStep3Error('');
    if (!paymentForm.total_amount || totalReceived <= 0) {
      setStep3Error('Enter the total payment amount received.');
      return;
    }
    if (!paymentForm.payment_date) {
      setStep3Error('Select a payment date.');
      return;
    }
    for (const a of allocations) {
      const amt = parseFloat(a.allocated_amount) || 0;
      if (amt < 0) {
        setStep3Error(`Allocated amount for ${a.bill_number} cannot be negative.`);
        return;
      }
      if (amt > a.bill_amount) {
        setStep3Error(`Allocated amount for ${a.bill_number} exceeds bill amount (${fmt(a.bill_amount)}).`);
        return;
      }
    }
    if (!isBalanced) {
      setStep3Error(`Unallocated balance must be ₹0.00 before proceeding. Current: ${fmt(unallocated)}`);
      return;
    }
    // Generate reference ID
    try {
      const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const { data } = await supabase
        .from('combined_payments')
        .select('reference_id')
        .like('reference_id', `COMB-${dateStr}-%`)
        .order('reference_id', { ascending: false })
        .limit(1);
      const nextNum = data && data.length > 0
        ? parseInt((data[0] as any).reference_id.split('-')[2]) + 1
        : 1;
      setReferenceId(`COMB-${dateStr}-${String(nextNum).padStart(4, '0')}`);
    } catch {
      setReferenceId(`COMB-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-0001`);
    }
    setSubmitError('');
    setStep(4);
  };

  // ── Auto-allocate ────────────────────────────────────────────────────────────

  const handleAutoAllocate = () => {
    if (totalReceived <= 0) return;
    let remaining = totalReceived;
    setAllocations(prev =>
      prev.map(a => {
        const fill = parseFloat(Math.min(remaining, a.bill_amount).toFixed(2));
        remaining = parseFloat((remaining - fill).toFixed(2));
        return { ...a, allocated_amount: fill > 0 ? fill.toFixed(2) : '0.00' };
      })
    );
  };

  const updateAllocation = (billId: string, value: string) => {
    setAllocations(prev =>
      prev.map(a => a.bill_id === billId ? { ...a, allocated_amount: value } : a)
    );
  };

  // ── Toggle bill selection ────────────────────────────────────────────────────

  const toggleBill = (billId: string) => {
    setSelectedBillIds(prev => {
      const next = new Set(prev);
      next.has(billId) ? next.delete(billId) : next.add(billId);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedBillIds.size === availableBills.length) {
      setSelectedBillIds(new Set());
    } else {
      setSelectedBillIds(new Set(availableBills.map(b => b.bill_id)));
    }
  };

  // ── Submit ───────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError('');
    try {
      // 1. Insert parent combined_payments
      const { data: cpData, error: cpError } = await supabase
        .from('combined_payments')
        .insert({
          reference_id: referenceId,
          billing_party_code: selectedCustomerCode,
          billing_party_name: selectedCustomer?.name || '',
          total_amount: totalReceived,
          payment_date: paymentForm.payment_date,
          payment_mode: paymentForm.payment_mode,
          reference_number: paymentForm.reference_number || null,
          remarks: paymentForm.remarks || null,
          created_by: user?.id,
        })
        .select()
        .single();

      if (cpError) throw cpError;
      const cpId = (cpData as any).id;

      // 2. For each allocation: insert PR → update bill → insert child record
      for (const alloc of allocations) {
        const allocAmount = parseFloat(alloc.allocated_amount);

        const { data: prData, error: prError } = await supabase
          .from('payment_receipts')
          .insert({
            bill_id: alloc.bill_id,
            bill_type: alloc.bill_type,
            bill_number: alloc.bill_number,
            billing_party_code: selectedCustomerCode,
            billing_party_name: selectedCustomer?.name || '',
            bill_amount: alloc.bill_amount,
            payment_amount: allocAmount,
            payment_date: paymentForm.payment_date,
            payment_mode: paymentForm.payment_mode,
            reference_number: paymentForm.reference_number || null,
            remarks: paymentForm.remarks || null,
            is_cancelled: false,
            combined_payment_id: cpId,
            created_by: user?.id,
          })
          .select()
          .single();

        if (prError) throw prError;

        // Update source bill to Paid
        if (alloc.bill_type === 'lr') {
          await supabase
            .from('lr_bill')
            .update({
              lr_bill_mr_number: (prData as any).pr_number,
              lr_bill_mr_date: paymentForm.payment_date,
              lr_bill_status: 'Paid',
            })
            .eq('bill_id', alloc.bill_id);
        } else {
          await supabase
            .from('warehouse_bill')
            .update({
              mr_number: (prData as any).pr_number,
              mr_date: paymentForm.payment_date,
              bill_status: 'Paid',
            })
            .eq('bill_id', alloc.bill_id);
        }

        // Insert child combined_payment_bills
        await supabase.from('combined_payment_bills').insert({
          combined_payment_id: cpId,
          bill_id: alloc.bill_id,
          bill_type: alloc.bill_type,
          bill_number: alloc.bill_number,
          bill_amount: alloc.bill_amount,
          allocated_amount: allocAmount,
          pr_id: (prData as any).pr_id,
          created_by: user?.id,
        });
      }

      setSuccessRefId(referenceId);
      setSubmitted(true);
    } catch (err: any) {
      console.error(err);
      setSubmitError(err.message || 'Failed to save combined payment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 rounded-xl p-2">
              <Layers className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Combined Payment</h2>
              {!submitted && (
                <p className="text-xs text-gray-500 mt-0.5">
                  Allocate a single payment across multiple bills
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step indicator */}
        {!submitted && (
          <div className="px-6 py-3 border-b border-gray-100 bg-gray-50 flex-shrink-0">
            <StepIndicator current={step} />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Success Screen ─────────────────────────────────────────── */}
          {submitted && (
            <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
              <div className="bg-emerald-100 rounded-full p-5 mb-4">
                <CheckCircle className="w-10 h-10 text-emerald-600" />
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-2">Payment Recorded Successfully</h3>
              <p className="text-gray-500 text-sm mb-6">
                Combined payment for <span className="font-semibold text-gray-700">{selectedCustomer?.name}</span> has been saved.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-8 py-4 mb-8">
                <p className="text-xs text-blue-500 font-semibold uppercase tracking-wider mb-1">Combined Payment Reference</p>
                <p className="text-2xl font-black text-blue-800">{successRefId}</p>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 w-full max-w-sm mb-8 space-y-2">
                {allocations.map(a => (
                  <div key={a.bill_id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-semibold ${a.bill_type === 'lr' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                        {a.bill_type === 'lr' ? <Truck className="w-2.5 h-2.5" /> : <Building2 className="w-2.5 h-2.5" />}
                      </span>
                      <span className="font-medium text-gray-700">{a.bill_number}</span>
                    </div>
                    <span className="font-bold text-gray-800">{fmt(parseFloat(a.allocated_amount))}</span>
                  </div>
                ))}
                <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-gray-900">
                  <span>Total</span>
                  <span>{fmt(totalReceived)}</span>
                </div>
              </div>
              <button
                onClick={() => { onSuccess(); onClose(); }}
                className="px-8 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
              >
                Done
              </button>
            </div>
          )}

          {/* ── Step 1: Select Customer ─────────────────────────────────── */}
          {!submitted && step === 1 && (
            <div className="p-6 max-w-lg mx-auto">
              <h3 className="text-sm font-bold text-gray-800 mb-1">Select Customer Account</h3>
              <p className="text-xs text-gray-500 mb-5">All bills in this combined payment must belong to the same customer.</p>

              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search customer name or code..."
                    value={customerSearch}
                    onChange={e => setCustomerSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="border border-gray-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                  {filteredCustomers.length === 0 ? (
                    <div className="py-8 text-center text-gray-400 text-sm">No customers found</div>
                  ) : (
                    filteredCustomers.map(c => (
                      <button
                        key={c.code}
                        onClick={() => setSelectedCustomerCode(c.code)}
                        className={`w-full text-left px-4 py-3 flex items-center justify-between transition-colors border-b border-gray-50 last:border-0 ${
                          selectedCustomerCode === c.code
                            ? 'bg-blue-50 text-blue-800'
                            : 'hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        <div>
                          <p className="text-sm font-semibold">{c.name}</p>
                          <p className="text-xs text-gray-400">{c.code}</p>
                        </div>
                        {selectedCustomerCode === c.code && (
                          <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        )}
                      </button>
                    ))
                  )}
                </div>

                {selectedCustomerCode && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    <span className="text-sm font-semibold text-blue-800">{selectedCustomer?.name}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Step 2: Select Bills ─────────────────────────────────────── */}
          {!submitted && step === 2 && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-800">Select Bills to Combine</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Customer: <span className="font-semibold text-gray-700">{selectedCustomer?.name}</span>
                    {' · '}Select at least 2 unpaid bills
                  </p>
                </div>
                {selectedBillIds.size > 0 && (
                  <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-1.5">
                    <span className="text-xs font-bold text-blue-700">{selectedBillIds.size} selected</span>
                    <span className="text-xs text-blue-500 ml-1">
                      · {fmt(selectedBills.reduce((s, b) => s + b.bill_amount, 0))}
                    </span>
                  </div>
                )}
              </div>

              {loadingBills ? (
                <div className="py-16 flex flex-col items-center gap-3 text-gray-400">
                  <Loader2 className="w-7 h-7 animate-spin" />
                  <span className="text-sm">Loading bills...</span>
                </div>
              ) : billsError ? (
                <div className="py-8 text-center">
                  <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                  <p className="text-sm text-red-600">{billsError}</p>
                </div>
              ) : availableBills.length === 0 ? (
                <div className="py-16 text-center">
                  <Receipt className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No unpaid bills found</p>
                  <p className="text-sm text-gray-400 mt-1">All bills for this customer are paid or cancelled.</p>
                </div>
              ) : (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={selectedBillIds.size === availableBills.length && availableBills.length > 0}
                            onChange={toggleAll}
                            className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
                          />
                        </th>
                        {['Bill Number', 'Type', 'Bill Amount', 'Bill Date', 'Due Date'].map(col => (
                          <th key={col} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {availableBills.map(bill => {
                        const selected = selectedBillIds.has(bill.bill_id);
                        const overdue = isOverdue(bill.bill_due_date);
                        return (
                          <tr
                            key={bill.bill_id}
                            onClick={() => toggleBill(bill.bill_id)}
                            className={`cursor-pointer transition-colors ${selected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                          >
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => toggleBill(bill.bill_id)}
                                onClick={e => e.stopPropagation()}
                                className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
                              />
                            </td>
                            <td className="px-4 py-3 text-sm font-bold text-gray-800">{bill.bill_number}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                                bill.bill_type === 'lr' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                              }`}>
                                {bill.bill_type === 'lr' ? <Truck className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
                                {bill.bill_type === 'lr' ? 'Transport' : 'Warehouse'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-gray-800 text-right whitespace-nowrap">
                              {fmt(bill.bill_amount)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{fmtDate(bill.bill_date)}</td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {bill.bill_due_date ? (
                                <span className={`text-sm ${overdue ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                                  {fmtDate(bill.bill_due_date)}
                                  {overdue && (
                                    <span className="ml-1 inline-flex items-center gap-0.5 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-bold">
                                      <Clock className="w-2.5 h-2.5" />OVERDUE
                                    </span>
                                  )}
                                </span>
                              ) : (
                                <span className="text-gray-400 text-sm">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── Step 3: Allocate Payment ─────────────────────────────────── */}
          {!submitted && step === 3 && (
            <div className="p-6 space-y-5">
              <div>
                <h3 className="text-sm font-bold text-gray-800">Enter Payment Details & Allocate</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Customer: <span className="font-semibold text-gray-700">{selectedCustomer?.name}</span>
                  {' · '}{allocations.length} bills selected
                </p>
              </div>

              {/* Payment Fields */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-3">Payment Information</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                      Total Amount Received <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={paymentForm.total_amount}
                        onChange={e => setPaymentForm(f => ({ ...f, total_amount: e.target.value }))}
                        className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                      Payment Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={paymentForm.payment_date}
                      onChange={e => setPaymentForm(f => ({ ...f, payment_date: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Payment Mode</label>
                    <select
                      value={paymentForm.payment_mode}
                      onChange={e => setPaymentForm(f => ({ ...f, payment_mode: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    >
                      {['Cash', 'Cheque', 'Bank Transfer', 'UPI'].map(m => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Reference No.</label>
                    <input
                      type="text"
                      placeholder="UTR / Cheque No."
                      value={paymentForm.reference_number}
                      onChange={e => setPaymentForm(f => ({ ...f, reference_number: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    />
                  </div>
                  <div className="col-span-2 md:col-span-4">
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Remarks</label>
                    <input
                      type="text"
                      placeholder="Optional remarks"
                      value={paymentForm.remarks}
                      onChange={e => setPaymentForm(f => ({ ...f, remarks: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Allocation Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider">Allocate to Bills</h4>
                  <button
                    onClick={handleAutoAllocate}
                    disabled={totalReceived <= 0}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed bg-blue-50 hover:bg-blue-100 disabled:bg-gray-50 px-3 py-1 rounded-lg transition-colors"
                  >
                    Auto-allocate
                  </button>
                </div>

                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-gray-50">
                      <tr>
                        {['Bill Number', 'Type', 'Bill Amount', 'Allocated Amount', 'Remaining'].map(col => (
                          <th key={col} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {allocations.map(a => {
                        const alloc = parseFloat(a.allocated_amount) || 0;
                        const remaining = a.bill_amount - alloc;
                        const overAllocated = alloc > a.bill_amount;
                        return (
                          <tr key={a.bill_id} className="hover:bg-gray-50">
                            <td className="px-4 py-2.5 text-sm font-bold text-gray-800">{a.bill_number}</td>
                            <td className="px-4 py-2.5">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                                a.bill_type === 'lr' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                              }`}>
                                {a.bill_type === 'lr' ? <Truck className="w-2.5 h-2.5" /> : <Building2 className="w-2.5 h-2.5" />}
                                {a.bill_type === 'lr' ? 'Transport' : 'Warehouse'}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-sm font-semibold text-gray-700 text-right whitespace-nowrap">
                              {fmt(a.bill_amount)}
                            </td>
                            <td className="px-4 py-2.5">
                              <div className="relative max-w-[140px]">
                                <IndianRupee className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                <input
                                  type="number"
                                  step="0.01"
                                  placeholder="0.00"
                                  value={a.allocated_amount}
                                  onChange={e => updateAllocation(a.bill_id, e.target.value)}
                                  className={`w-full pl-7 pr-2 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right ${
                                    overAllocated ? 'border-red-400 bg-red-50' : 'border-gray-200'
                                  }`}
                                />
                              </div>
                              {overAllocated && (
                                <p className="text-xs text-red-500 mt-0.5">Exceeds bill amount</p>
                              )}
                            </td>
                            <td className={`px-4 py-2.5 text-sm font-semibold whitespace-nowrap ${remaining < 0 ? 'text-red-600' : remaining === 0 ? 'text-emerald-600' : 'text-gray-600'}`}>
                              {fmt(remaining)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Running Summary */}
              <div className={`rounded-xl p-4 border-2 ${isBalanced && totalReceived > 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Received</p>
                    <p className="text-base font-black text-gray-800">{totalReceived > 0 ? fmt(totalReceived) : '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Allocated</p>
                    <p className="text-base font-black text-gray-800">{totalAllocated > 0 ? fmt(totalAllocated) : '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Unallocated</p>
                    <p className={`text-base font-black ${isBalanced && totalReceived > 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {totalReceived > 0 ? fmt(unallocated) : '-'}
                    </p>
                  </div>
                </div>
                {totalReceived > 0 && isBalanced && (
                  <p className="text-center text-xs font-semibold text-emerald-600 mt-2 flex items-center justify-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> Fully allocated — ready to proceed
                  </p>
                )}
              </div>

              {step3Error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 font-medium">{step3Error}</p>
                </div>
              )}
            </div>
          )}

          {/* ── Step 4: Review & Confirm ─────────────────────────────────── */}
          {!submitted && step === 4 && (
            <div className="p-6 space-y-4 max-w-2xl mx-auto">
              <div>
                <h3 className="text-sm font-bold text-gray-800">Review & Confirm</h3>
                <p className="text-xs text-gray-500 mt-0.5">Please review before submitting. This action cannot be undone.</p>
              </div>

              {/* Reference ID */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-blue-500 uppercase tracking-wider">Combined Payment Reference</p>
                  <p className="text-xl font-black text-blue-800 mt-0.5">{referenceId}</p>
                </div>
                <Layers className="w-8 h-8 text-blue-300" />
              </div>

              {/* Payment Summary */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2.5">
                {[
                  ['Customer', selectedCustomer?.name || '-'],
                  ['Total Amount', fmt(totalReceived)],
                  ['Payment Date', fmtDate(paymentForm.payment_date)],
                  ['Payment Mode', paymentForm.payment_mode],
                  ...(paymentForm.reference_number ? [['Reference No.', paymentForm.reference_number]] : []),
                  ...(paymentForm.remarks ? [['Remarks', paymentForm.remarks]] : []),
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between items-baseline gap-4">
                    <span className="text-xs text-gray-500 font-medium flex-shrink-0">{label}</span>
                    <span className="text-sm font-semibold text-gray-800 text-right">{value}</span>
                  </div>
                ))}
              </div>

              {/* Allocation Table */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-100">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Bill Allocations ({allocations.length} bills)</p>
                </div>
                <table className="min-w-full">
                  <tbody className="divide-y divide-gray-100">
                    {allocations.map(a => (
                      <tr key={a.bill_id} className="bg-white">
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-semibold ${
                              a.bill_type === 'lr' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {a.bill_type === 'lr' ? <Truck className="w-2.5 h-2.5" /> : <Building2 className="w-2.5 h-2.5" />}
                            </span>
                            <span className="text-sm font-semibold text-gray-800">{a.bill_number}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-gray-500">Bill: {fmt(a.bill_amount)}</td>
                        <td className="px-4 py-2.5 text-right">
                          <span className="text-sm font-bold text-emerald-700">{fmt(parseFloat(a.allocated_amount))}</span>
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50 border-t-2 border-gray-200">
                      <td colSpan={2} className="px-4 py-2.5 text-sm font-bold text-gray-700">Total</td>
                      <td className="px-4 py-2.5 text-right text-sm font-black text-gray-900">{fmt(totalReceived)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {submitError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 font-medium">{submitError}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!submitted && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex-shrink-0">
            <button
              onClick={() => step > 1 && setStep(s => s - 1)}
              disabled={step === 1}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>

            <div className="flex items-center gap-3">
              <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors">
                Cancel
              </button>

              {step === 1 && (
                <button
                  onClick={goToStep2}
                  disabled={!selectedCustomerCode}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              )}

              {step === 2 && (
                <button
                  onClick={goToStep3}
                  disabled={selectedBillIds.size < 2}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next ({selectedBillIds.size} selected) <ChevronRight className="w-4 h-4" />
                </button>
              )}

              {step === 3 && (
                <button
                  onClick={goToStep4}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Review <ChevronRight className="w-4 h-4" />
                </button>
              )}

              {step === 4 && (
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex items-center gap-2 px-6 py-2 text-sm font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  {submitting ? 'Submitting...' : 'Confirm & Submit'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
