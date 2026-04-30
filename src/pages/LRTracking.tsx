import { useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  Search, Calendar, FileText, Loader2, Eye, Download,
  MapPin, Truck, User, IndianRupee, ArrowRight, Package,
  Receipt, CheckCircle, Clock, AlertCircle, XCircle,
  CreditCard, Banknote, ClipboardCheck, Image, FileMinus,
  Building2
} from 'lucide-react';

interface LRTrackingData {
  manual_lr_no: string;
  lr_date: string;
  from_city: string;
  to_city: string;
  vehicle_type: string;
  vehicle_number: string;
  billing_party_name: string;
  est_del_date: string;
  act_del_date: string;
  lr_sla_status: string;
  lr_status: string;
  lr_ops_status: string;
  lr_financial_status: string;
  pod_upload: string;
}

interface LROpsDetailData {
  id: string;
  manual_lr_no: string;
  lr_date: string;
  billing_party_name: string;
  from_city: string;
  to_city: string;
  vehicle_type: string;
  vehicle_number: string;
  lr_ops_status: string;
  thc_amount: number | null;
  thc_advance_amount: number | null;
  thc_balance_amount: number | null;
  ven_act_name: string | null;
}

interface LRFinDetailData {
  tran_id: string;
  manual_lr_no: string;
  lr_date: string;
  billing_party_name: string;
  from_city: string;
  to_city: string;
  vehicle_type: string;
  vehicle_number: string;
  lr_financial_status: string;
  pod_upload: string | null;
  bill_amount: number | null;
  bill_date: string | null;
  bill_due_date: string | null;
  lr_bill_number: string | null;
  lr_bill_date: string | null;
  lr_bill_due_date: string | null;
  lr_bill_status: string | null;
  lr_bill_mr_date: string | null;
  lr_bill_mr_number: string | null;
  lr_bill_tds_applicable: boolean | null;
  lr_bill_tds_amount: number | null;
  lr_bill_deduction_amount: number | null;
  lr_bill_mr_net_amount: number | null;
  sub_total: number | null;
  lr_bill_amount: number | null;
  consol_bill_number: string | null;
  consol_bill_date: string | null;
  consol_bill_sub_date: string | null;
  consol_bill_sub_to: string | null;
  bill_generation_branch_name: string | null;
  credit_days: number | null;
  lr_bill_sub_date: string | null;
  lr_bill_sub_type: string | null;
}

export function LRTracking() {
  const [searchType, setSearchType] = useState<'dateRange' | 'lrNumber'>('dateRange');
  const [statusType, setStatusType] = useState<'lr_status' | 'lr_ops_status' | 'lr_financial_status'>('lr_status');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<LRTrackingData[]>([]);
  const [opsDetailResults, setOpsDetailResults] = useState<LROpsDetailData[]>([]);
  const [finDetailResults, setFinDetailResults] = useState<LRFinDetailData[]>([]);
  const [searched, setSearched] = useState(false);

  const clearResults = () => {
    setResults([]);
    setOpsDetailResults([]);
    setFinDetailResults([]);
    setSearched(false);
  };

  const [formData, setFormData] = useState({
    fromDate: '',
    toDate: '',
    lrNumber: '',
  });

  const [selectedPOD, setSelectedPOD] = useState<string | null>(null);

  const handleSearch = async () => {
    if (searchType === 'dateRange' && (!formData.fromDate || !formData.toDate)) {
      alert('Please select both From Date and To Date');
      return;
    }
    if (searchType === 'lrNumber' && !formData.lrNumber.trim()) {
      alert('Please enter LR Number');
      return;
    }

    try {
      setLoading(true);
      setResults([]);
      setOpsDetailResults([]);
      setFinDetailResults([]);
      setSearched(false);

      if (searchType === 'lrNumber' && statusType === 'lr_ops_status') {
        const { data: lrData, error: lrError } = await supabase
          .from('booking_lr')
          .select('tran_id, manual_lr_no, lr_date, billing_party_name, from_city, to_city, vehicle_type, vehicle_number, lr_ops_status')
          .ilike('manual_lr_no', `%${formData.lrNumber.trim()}%`)
          .order('manual_lr_no', { ascending: false });

        if (lrError) throw lrError;

        if (lrData && lrData.length > 0) {
          const lrIds = lrData.map((lr) => lr.tran_id);
          const { data: thcData, error: thcError } = await supabase
            .from('thc_details')
            .select('tran_id, thc_amount, thc_advance_amount, thc_balance_amount, ven_act_name')
            .in('tran_id', lrIds);

          if (thcError) throw thcError;

          const thcMap: Record<string, { thc_amount: number | null; thc_advance_amount: number | null; thc_balance_amount: number | null; ven_act_name: string | null }> = {};
          (thcData || []).forEach((t) => {
            thcMap[t.tran_id] = {
              thc_amount: t.thc_amount,
              thc_advance_amount: t.thc_advance_amount,
              thc_balance_amount: t.thc_balance_amount,
              ven_act_name: t.ven_act_name,
            };
          });

          const combined: LROpsDetailData[] = lrData.map((lr) => ({
            id: lr.tran_id,
            manual_lr_no: lr.manual_lr_no,
            lr_date: lr.lr_date,
            billing_party_name: lr.billing_party_name,
            from_city: lr.from_city,
            to_city: lr.to_city,
            vehicle_type: lr.vehicle_type,
            vehicle_number: lr.vehicle_number,
            lr_ops_status: lr.lr_ops_status,
            ...(thcMap[lr.tran_id] || { thc_amount: null, thc_advance_amount: null, thc_balance_amount: null, ven_act_name: null }),
          }));

          setOpsDetailResults(combined);
        }
        setSearched(true);
        return;
      }

      if (searchType === 'lrNumber' && statusType === 'lr_financial_status') {
        const { data: lrData, error: lrError } = await supabase
          .from('booking_lr')
          .select('tran_id, manual_lr_no, lr_date, billing_party_name, from_city, to_city, vehicle_type, vehicle_number, lr_financial_status, pod_upload, bill_amount, bill_date, bill_due_date')
          .ilike('manual_lr_no', `%${formData.lrNumber.trim()}%`)
          .order('manual_lr_no', { ascending: false });

        if (lrError) throw lrError;

        if (lrData && lrData.length > 0) {
          const lrIds = lrData.map((lr) => lr.tran_id);

          const { data: billData, error: billError } = await supabase
            .from('lr_bill')
            .select(`
              tran_id, lr_bill_number, lr_bill_date, lr_bill_due_date, lr_bill_status,
              lr_bill_mr_date, lr_bill_mr_number, lr_bill_tds_applicable, lr_bill_tds_amount,
              lr_bill_deduction_amount, lr_bill_mr_net_amount, sub_total, bill_amount,
              consol_bill_number, consol_bill_date, consol_bill_sub_date, consol_bill_sub_to,
              bill_generation_branch, credit_days, lr_bill_sub_date, lr_bill_sub_type, bill_status
            `)
            .in('tran_id', lrIds)
            .is('cancelled_at', null);

          if (billError) throw billError;

          const billMap: Record<string, typeof billData[0]> = {};
          (billData || []).forEach((b) => {
            if (!billMap[b.tran_id]) billMap[b.tran_id] = b;
          });

          const branchIds = [...new Set(
            (billData || [])
              .map((b) => b.bill_generation_branch)
              .filter(Boolean)
          )];

          const branchMap: Record<string, string> = {};
          if (branchIds.length > 0) {
            const { data: branchData } = await supabase
              .from('branch_master')
              .select('branch_id, branch_name')
              .in('branch_id', branchIds);
            (branchData || []).forEach((br) => {
              branchMap[br.branch_id] = br.branch_name;
            });
          }

          const combined: LRFinDetailData[] = lrData.map((lr) => {
            const bill = billMap[lr.tran_id];
            return {
              tran_id: lr.tran_id,
              manual_lr_no: lr.manual_lr_no,
              lr_date: lr.lr_date,
              billing_party_name: lr.billing_party_name,
              from_city: lr.from_city,
              to_city: lr.to_city,
              vehicle_type: lr.vehicle_type,
              vehicle_number: lr.vehicle_number,
              lr_financial_status: lr.lr_financial_status,
              pod_upload: lr.pod_upload,
              bill_amount: lr.bill_amount,
              bill_date: lr.bill_date,
              bill_due_date: lr.bill_due_date,
              lr_bill_number: bill?.lr_bill_number ?? null,
              lr_bill_date: bill?.lr_bill_date ?? null,
              lr_bill_due_date: bill?.lr_bill_due_date ?? null,
              lr_bill_status: bill?.lr_bill_status ?? null,
              lr_bill_mr_date: bill?.lr_bill_mr_date ?? null,
              lr_bill_mr_number: bill?.lr_bill_mr_number ?? null,
              lr_bill_tds_applicable: bill?.lr_bill_tds_applicable ?? null,
              lr_bill_tds_amount: bill?.lr_bill_tds_amount ?? null,
              lr_bill_deduction_amount: bill?.lr_bill_deduction_amount ?? null,
              lr_bill_mr_net_amount: bill?.lr_bill_mr_net_amount ?? null,
              sub_total: bill?.sub_total ?? null,
              lr_bill_amount: bill?.bill_amount ?? null,
              consol_bill_number: bill?.consol_bill_number ?? null,
              consol_bill_date: bill?.consol_bill_date ?? null,
              consol_bill_sub_date: bill?.consol_bill_sub_date ?? null,
              consol_bill_sub_to: bill?.consol_bill_sub_to ?? null,
              bill_generation_branch_name: bill?.bill_generation_branch ? (branchMap[bill.bill_generation_branch] ?? null) : null,
              credit_days: bill?.credit_days ?? null,
              lr_bill_sub_date: bill?.lr_bill_sub_date ?? null,
              lr_bill_sub_type: bill?.lr_bill_sub_type ?? null,
            };
          });

          setFinDetailResults(combined);
        }
        setSearched(true);
        return;
      }

      let query = supabase
        .from('booking_lr')
        .select('manual_lr_no, lr_date, from_city, to_city, vehicle_type, vehicle_number, billing_party_name, est_del_date, act_del_date, lr_sla_status, lr_status, lr_ops_status, lr_financial_status, pod_upload');

      if (searchType === 'dateRange') {
        query = query.gte('lr_date', formData.fromDate).lte('lr_date', formData.toDate);
      } else {
        query = query.ilike('manual_lr_no', `%${formData.lrNumber.trim()}%`);
      }

      const { data, error } = await query.order('manual_lr_no', { ascending: false });
      if (error) throw error;
      setResults(data || []);
      setSearched(true);
    } catch (error: any) {
      console.error('Error searching LR:', error);
      alert(error.message || 'Failed to search LR records');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    if (!status) return 'bg-gray-100 text-gray-700';
    const s = status.toLowerCase();
    if (s.includes('delivered')) return 'bg-emerald-100 text-emerald-800';
    if (s.includes('dispatch')) return 'bg-blue-100 text-blue-800';
    if (s.includes('pending')) return 'bg-amber-100 text-amber-800';
    if (s.includes('transit')) return 'bg-sky-100 text-sky-800';
    if (s.includes('paid') || s.includes('collected')) return 'bg-emerald-100 text-emerald-800';
    if (s.includes('partial')) return 'bg-orange-100 text-orange-800';
    if (s.includes('overdue')) return 'bg-red-100 text-red-800';
    if (s.includes('cancel')) return 'bg-red-100 text-red-800';
    if (s.includes('generated') || s.includes('billed')) return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-700';
  };

  const getSLABadgeColor = (status: string) => {
    if (status === 'ON TIME') return 'bg-emerald-100 text-emerald-800';
    if (status === 'LATE') return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-700';
  };

  const fmt = (val: number | null | undefined) =>
    val != null ? `₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-';

  const fmtDate = (val: string | null | undefined) =>
    val ? new Date(val).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

  const getFinStatusIcon = (status: string | null) => {
    if (!status) return <Clock className="w-4 h-4 text-gray-400" />;
    const s = status.toLowerCase();
    if (s.includes('paid') || s.includes('collected')) return <CheckCircle className="w-4 h-4 text-emerald-500" />;
    if (s.includes('partial')) return <AlertCircle className="w-4 h-4 text-orange-500" />;
    if (s.includes('overdue')) return <XCircle className="w-4 h-4 text-red-500" />;
    if (s.includes('pending')) return <Clock className="w-4 h-4 text-amber-500" />;
    return <Clock className="w-4 h-4 text-gray-400" />;
  };

  const isDueDateOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const renderOpsDetailView = () => (
    <div className="space-y-6">
      {opsDetailResults.map((lr, index) => (
        <div key={index} className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/10 rounded-lg p-2">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-slate-300 font-medium uppercase tracking-wider">LR Number</p>
                <p className="text-lg font-bold text-white">{lr.manual_lr_no || '-'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs text-slate-300 uppercase tracking-wider">LR Date</p>
                <p className="text-sm font-semibold text-white">{fmtDate(lr.lr_date)}</p>
              </div>
              {lr.lr_ops_status && (
                <span className={`ml-4 px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeColor(lr.lr_ops_status)}`}>
                  {lr.lr_ops_status}
                </span>
              )}
            </div>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-2">Shipment Details</h3>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 bg-blue-50 rounded-lg p-2">
                  <User className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium">Billing Party</p>
                  <p className="text-sm font-semibold text-gray-800">{lr.billing_party_name || '-'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 bg-emerald-50 rounded-lg p-2">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-400 font-medium mb-1">Route</p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-800">{lr.from_city || '-'}</span>
                    <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-sm font-semibold text-gray-800">{lr.to_city || '-'}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 bg-amber-50 rounded-lg p-2">
                  <Truck className="w-4 h-4 text-amber-600" />
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 flex-1">
                  <div>
                    <p className="text-xs text-gray-400 font-medium">Vehicle Type</p>
                    <p className="text-sm font-semibold text-gray-800">{lr.vehicle_type || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-medium">Vehicle Number</p>
                    <p className="text-sm font-semibold text-gray-800 uppercase">{lr.vehicle_number || '-'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-2">THC Financial Details</h3>
              {lr.ven_act_name && (
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 bg-slate-50 rounded-lg p-2">
                    <Package className="w-4 h-4 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-medium">Vendor Account</p>
                    <p className="text-sm font-semibold text-gray-800">{lr.ven_act_name}</p>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-3 gap-3 mt-2">
                <div className="bg-blue-50 rounded-xl p-4 text-center border border-blue-100">
                  <div className="flex items-center justify-center mb-1">
                    <IndianRupee className="w-3.5 h-3.5 text-blue-500 mr-0.5" />
                    <p className="text-xs font-medium text-blue-500 uppercase tracking-wide">THC Amount</p>
                  </div>
                  <p className="text-base font-bold text-blue-800">{fmt(lr.thc_amount)}</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-4 text-center border border-amber-100">
                  <div className="flex items-center justify-center mb-1">
                    <IndianRupee className="w-3.5 h-3.5 text-amber-500 mr-0.5" />
                    <p className="text-xs font-medium text-amber-500 uppercase tracking-wide">Advance</p>
                  </div>
                  <p className="text-base font-bold text-amber-800">{fmt(lr.thc_advance_amount)}</p>
                </div>
                <div className={`rounded-xl p-4 text-center border ${(lr.thc_balance_amount ?? 0) > 0 ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'}`}>
                  <div className="flex items-center justify-center mb-1">
                    <IndianRupee className={`w-3.5 h-3.5 mr-0.5 ${(lr.thc_balance_amount ?? 0) > 0 ? 'text-red-500' : 'text-emerald-500'}`} />
                    <p className={`text-xs font-medium uppercase tracking-wide ${(lr.thc_balance_amount ?? 0) > 0 ? 'text-red-500' : 'text-emerald-500'}`}>Balance</p>
                  </div>
                  <p className={`text-base font-bold ${(lr.thc_balance_amount ?? 0) > 0 ? 'text-red-800' : 'text-emerald-800'}`}>{fmt(lr.thc_balance_amount)}</p>
                </div>
              </div>
              {lr.thc_amount == null && lr.thc_advance_amount == null && (
                <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-4 py-3 border border-gray-200">
                  <Package className="w-4 h-4 text-gray-400" />
                  <p className="text-sm text-gray-500">No THC record linked to this LR</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderFinDetailView = () => (
    <div className="space-y-8">
      {finDetailResults.map((lr, index) => (
        <div key={index} className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">

          <div className="bg-gradient-to-r from-teal-800 via-teal-700 to-teal-600 px-6 py-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-white/15 rounded-xl p-2.5">
                  <Receipt className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-xs text-teal-200 font-medium uppercase tracking-widest mb-0.5">LR Number</p>
                  <p className="text-2xl font-bold text-white tracking-tight">{lr.manual_lr_no || '-'}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs text-teal-200 uppercase tracking-wider mb-0.5">LR Date</p>
                  <p className="text-sm font-semibold text-white">{fmtDate(lr.lr_date)}</p>
                </div>
                {lr.lr_financial_status && (
                  <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm border border-white/20 rounded-full px-3 py-1.5">
                    {getFinStatusIcon(lr.lr_financial_status)}
                    <span className="text-xs font-bold text-white uppercase tracking-wide">{lr.lr_financial_status}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-6 pt-4 border-t border-white/20">
              <div className="flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-teal-300" />
                <span className="text-xs text-teal-200">Billing Party:</span>
                <span className="text-xs font-semibold text-white">{lr.billing_party_name || '-'}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-teal-300" />
                <span className="text-xs font-semibold text-white">{lr.from_city || '-'}</span>
                <ArrowRight className="w-3 h-3 text-teal-300" />
                <span className="text-xs font-semibold text-white">{lr.to_city || '-'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="w-3.5 h-3.5 text-teal-300" />
                <span className="text-xs text-teal-200">Vehicle:</span>
                <span className="text-xs font-semibold text-white uppercase">{lr.vehicle_number || lr.vehicle_type || '-'}</span>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className={`rounded-xl p-4 border ${lr.lr_bill_number ? 'bg-teal-50 border-teal-100' : 'bg-gray-50 border-gray-200'}`}>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5" /> Bill Amount
                </p>
                <p className={`text-xl font-bold ${lr.lr_bill_number ? 'text-teal-800' : 'text-gray-400'}`}>
                  {fmt(lr.lr_bill_amount ?? lr.bill_amount)}
                </p>
              </div>
              <div className={`rounded-xl p-4 border ${lr.lr_bill_mr_net_amount != null ? 'bg-emerald-50 border-emerald-100' : 'bg-gray-50 border-gray-200'}`}>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Banknote className="w-3.5 h-3.5" /> Amount Received
                </p>
                <p className={`text-xl font-bold ${lr.lr_bill_mr_net_amount != null ? 'text-emerald-700' : 'text-gray-400'}`}>
                  {fmt(lr.lr_bill_mr_net_amount)}
                </p>
              </div>
              <div className={`rounded-xl p-4 border ${lr.lr_bill_tds_amount != null && lr.lr_bill_tds_applicable ? 'bg-orange-50 border-orange-100' : 'bg-gray-50 border-gray-200'}`}>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <FileMinus className="w-3.5 h-3.5" /> TDS Deducted
                </p>
                <p className={`text-xl font-bold ${lr.lr_bill_tds_applicable ? 'text-orange-700' : 'text-gray-400'}`}>
                  {lr.lr_bill_tds_applicable ? fmt(lr.lr_bill_tds_amount) : 'N/A'}
                </p>
              </div>
              <div className={`rounded-xl p-4 border ${lr.lr_bill_deduction_amount != null && (lr.lr_bill_deduction_amount ?? 0) > 0 ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-200'}`}>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <FileMinus className="w-3.5 h-3.5" /> Other Deductions
                </p>
                <p className={`text-xl font-bold ${(lr.lr_bill_deduction_amount ?? 0) > 0 ? 'text-red-700' : 'text-gray-400'}`}>
                  {(lr.lr_bill_deduction_amount ?? 0) > 0 ? fmt(lr.lr_bill_deduction_amount) : 'Nil'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

              <div className="md:col-span-2 space-y-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 border-b border-gray-100 pb-2">
                  <CreditCard className="w-3.5 h-3.5" /> Bill Details
                </h3>

                {lr.lr_bill_number ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-50 rounded-lg px-4 py-3 border border-gray-100">
                        <p className="text-xs text-gray-400 font-medium mb-0.5">Bill Number</p>
                        <p className="text-sm font-bold text-gray-800">{lr.lr_bill_number}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg px-4 py-3 border border-gray-100">
                        <p className="text-xs text-gray-400 font-medium mb-0.5">Bill Date</p>
                        <p className="text-sm font-semibold text-gray-800">{fmtDate(lr.lr_bill_date)}</p>
                      </div>
                      <div className={`rounded-lg px-4 py-3 border ${isDueDateOverdue(lr.lr_bill_due_date) && !lr.lr_bill_mr_number ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-100'}`}>
                        <p className={`text-xs font-medium mb-0.5 ${isDueDateOverdue(lr.lr_bill_due_date) && !lr.lr_bill_mr_number ? 'text-red-500' : 'text-gray-400'}`}>Due Date</p>
                        <p className={`text-sm font-semibold ${isDueDateOverdue(lr.lr_bill_due_date) && !lr.lr_bill_mr_number ? 'text-red-700' : 'text-gray-800'}`}>
                          {fmtDate(lr.lr_bill_due_date)}
                          {isDueDateOverdue(lr.lr_bill_due_date) && !lr.lr_bill_mr_number && (
                            <span className="ml-2 text-xs font-bold text-red-600">OVERDUE</span>
                          )}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg px-4 py-3 border border-gray-100">
                        <p className="text-xs text-gray-400 font-medium mb-0.5">Credit Days</p>
                        <p className="text-sm font-semibold text-gray-800">{lr.credit_days != null ? `${lr.credit_days} days` : '-'}</p>
                      </div>
                    </div>

                    {(lr.lr_bill_sub_date || lr.lr_bill_sub_type) && (
                      <div className="bg-blue-50 rounded-lg px-4 py-3 border border-blue-100">
                        <p className="text-xs font-semibold text-blue-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <ClipboardCheck className="w-3.5 h-3.5" /> Bill Submission
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-blue-400 font-medium">Submitted On</p>
                            <p className="text-sm font-semibold text-blue-800">{fmtDate(lr.lr_bill_sub_date)}</p>
                          </div>
                          {lr.lr_bill_sub_type && (
                            <div>
                              <p className="text-xs text-blue-400 font-medium">Mode</p>
                              <p className="text-sm font-semibold text-blue-800">{lr.lr_bill_sub_type}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {lr.lr_bill_mr_number && (
                      <div className="bg-emerald-50 rounded-lg px-4 py-3 border border-emerald-100">
                        <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5" /> Money Receipt / Payment Received
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-emerald-500 font-medium">MR Number</p>
                            <p className="text-sm font-bold text-emerald-800">{lr.lr_bill_mr_number}</p>
                          </div>
                          <div>
                            <p className="text-xs text-emerald-500 font-medium">MR Date</p>
                            <p className="text-sm font-semibold text-emerald-800">{fmtDate(lr.lr_bill_mr_date)}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {!lr.lr_bill_mr_number && (
                      <div className="flex items-center gap-2 bg-amber-50 rounded-lg px-4 py-3 border border-amber-100">
                        <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
                        <p className="text-sm text-amber-700 font-medium">Payment not yet received against this bill</p>
                      </div>
                    )}

                    {lr.lr_bill_status && (
                      <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3 border border-gray-100">
                        <p className="text-xs text-gray-400 font-medium">Bill Status</p>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusBadgeColor(lr.lr_bill_status)}`}>
                          {lr.lr_bill_status}
                        </span>
                      </div>
                    )}

                    {lr.bill_generation_branch_name && (
                      <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-3 border border-gray-100">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-400 font-medium">Billing Branch</p>
                          <p className="text-sm font-semibold text-gray-800">{lr.bill_generation_branch_name}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    <Receipt className="w-10 h-10 text-gray-300 mb-3" />
                    <p className="text-sm font-semibold text-gray-500">Bill Not Generated</p>
                    <p className="text-xs text-gray-400 mt-1">No customer bill has been raised for this LR yet</p>
                  </div>
                )}
              </div>

              <div className="space-y-4">

                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 border-b border-gray-100 pb-2">
                  <Image className="w-3.5 h-3.5" /> POD Status
                </h3>
                {lr.pod_upload ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle className="w-5 h-5 text-emerald-600" />
                      <p className="text-sm font-bold text-emerald-800">POD Uploaded</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedPOD(lr.pod_upload!)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-white border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-700 hover:bg-emerald-50 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" /> View
                      </button>
                      <a
                        href={lr.pod_upload}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-600 rounded-lg text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" /> Download
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-4 text-center">
                    <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-gray-500">POD Not Uploaded</p>
                    <p className="text-xs text-gray-400 mt-0.5">Proof of delivery pending</p>
                  </div>
                )}

                {lr.consol_bill_number && (
                  <>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 border-b border-gray-100 pb-2 mt-4">
                      <FileText className="w-3.5 h-3.5" /> Consol Bill
                    </h3>
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-blue-400 font-medium">Consol Bill No.</p>
                        <p className="text-sm font-bold text-blue-800">{lr.consol_bill_number}</p>
                      </div>
                      {lr.consol_bill_date && (
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-blue-400 font-medium">Bill Date</p>
                          <p className="text-xs font-semibold text-blue-800">{fmtDate(lr.consol_bill_date)}</p>
                        </div>
                      )}
                      {lr.consol_bill_sub_date && (
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-blue-400 font-medium">Submitted On</p>
                          <p className="text-xs font-semibold text-blue-800">{fmtDate(lr.consol_bill_sub_date)}</p>
                        </div>
                      )}
                      {lr.consol_bill_sub_to && (
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-blue-400 font-medium">Submitted To</p>
                          <p className="text-xs font-semibold text-blue-800">{lr.consol_bill_sub_to}</p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

          </div>

          <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-4 text-xs text-gray-400">
              {lr.bill_date && (
                <span>Bill Created: <span className="font-semibold text-gray-600">{fmtDate(lr.bill_date)}</span></span>
              )}
              {lr.bill_due_date && (
                <span>Payment Due: <span className={`font-semibold ${isDueDateOverdue(lr.bill_due_date) && !lr.lr_bill_mr_number ? 'text-red-600' : 'text-gray-600'}`}>{fmtDate(lr.bill_due_date)}</span></span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {getFinStatusIcon(lr.lr_financial_status)}
              <span className={`text-xs font-bold ${getStatusBadgeColor(lr.lr_financial_status || '')} px-2 py-0.5 rounded-full`}>
                {lr.lr_financial_status || 'Status Unknown'}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderLRStatusView = () => (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">LR Number</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">LR Date</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">From City</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">To City</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle Type</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Billing Party</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Est. Delivery</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Act. Delivery</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SLA Status</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">LR Status</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">POD</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {results.map((lr, index) => (
            <tr key={index} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm font-medium text-gray-900">{lr.manual_lr_no}</td>
              <td className="px-4 py-3 text-sm text-gray-900">{fmtDate(lr.lr_date)}</td>
              <td className="px-4 py-3 text-sm text-gray-700">{lr.from_city}</td>
              <td className="px-4 py-3 text-sm text-gray-700">{lr.to_city}</td>
              <td className="px-4 py-3 text-sm text-gray-700">{lr.vehicle_type || '-'}</td>
              <td className="px-4 py-3 text-sm text-gray-700">{lr.billing_party_name || '-'}</td>
              <td className="px-4 py-3 text-sm text-gray-700">{fmtDate(lr.est_del_date)}</td>
              <td className="px-4 py-3 text-sm text-gray-700">{fmtDate(lr.act_del_date)}</td>
              <td className="px-4 py-3 text-sm">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSLABadgeColor(lr.lr_sla_status)}`}>{lr.lr_sla_status || '-'}</span>
              </td>
              <td className="px-4 py-3 text-sm">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(lr.lr_status)}`}>{lr.lr_status || '-'}</span>
              </td>
              <td className="px-4 py-3 text-sm">
                {lr.pod_upload ? (
                  <div className="flex items-center gap-2">
                    <button onClick={() => setSelectedPOD(lr.pod_upload)} className="text-blue-600 hover:text-blue-700" title="View POD">
                      <Eye className="w-5 h-5" />
                    </button>
                    <a href={lr.pod_upload} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:text-emerald-700" title="Download POD">
                      <Download className="w-5 h-5" />
                    </a>
                  </div>
                ) : (
                  <span className="text-gray-400 text-xs">No POD</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderOpsStatusView = () => (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">LR Number</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">LR Date</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">From City</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">To City</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle Type</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Billing Party</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ops Status</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {results.map((lr, index) => (
            <tr key={index} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm font-medium text-gray-900">{lr.manual_lr_no}</td>
              <td className="px-4 py-3 text-sm text-gray-900">{fmtDate(lr.lr_date)}</td>
              <td className="px-4 py-3 text-sm text-gray-700">{lr.from_city}</td>
              <td className="px-4 py-3 text-sm text-gray-700">{lr.to_city}</td>
              <td className="px-4 py-3 text-sm text-gray-700">{lr.vehicle_type || '-'}</td>
              <td className="px-4 py-3 text-sm text-gray-700">{lr.billing_party_name || '-'}</td>
              <td className="px-4 py-3 text-sm">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(lr.lr_ops_status)}`}>{lr.lr_ops_status || '-'}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderFinStatusView = () => (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">LR Number</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">LR Date</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">From City</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">To City</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle Type</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Billing Party</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fin Status</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {results.map((lr, index) => (
            <tr key={index} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm font-medium text-gray-900">{lr.manual_lr_no}</td>
              <td className="px-4 py-3 text-sm text-gray-900">{fmtDate(lr.lr_date)}</td>
              <td className="px-4 py-3 text-sm text-gray-700">{lr.from_city}</td>
              <td className="px-4 py-3 text-sm text-gray-700">{lr.to_city}</td>
              <td className="px-4 py-3 text-sm text-gray-700">{lr.vehicle_type || '-'}</td>
              <td className="px-4 py-3 text-sm text-gray-700">{lr.billing_party_name || '-'}</td>
              <td className="px-4 py-3 text-sm">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(lr.lr_financial_status)}`}>{lr.lr_financial_status || '-'}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const isOpsDetailMode = searchType === 'lrNumber' && statusType === 'lr_ops_status';
  const isFinDetailMode = searchType === 'lrNumber' && statusType === 'lr_financial_status';

  const activeResults = isOpsDetailMode
    ? opsDetailResults.length
    : isFinDetailMode
    ? finDetailResults.length
    : results.length;

  const hasResults = activeResults > 0;
  const resultCount = activeResults;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">LR Tracking</h1>
          <p className="mt-1 text-sm text-gray-600">Track your LR shipments by date range or LR number</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Search By</label>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="dateRange"
                  checked={searchType === 'dateRange'}
                  onChange={(e) => { setSearchType(e.target.value as 'dateRange' | 'lrNumber'); clearResults(); }}
                  className="w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500"
                />
                <span className="text-sm font-medium text-gray-700">Date Range</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="lrNumber"
                  checked={searchType === 'lrNumber'}
                  onChange={(e) => { setSearchType(e.target.value as 'dateRange' | 'lrNumber'); clearResults(); }}
                  className="w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500"
                />
                <span className="text-sm font-medium text-gray-700">LR Number</span>
              </label>
            </div>
          </div>

          {searchType === 'dateRange' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">From Date <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="date"
                    value={formData.fromDate}
                    onChange={(e) => setFormData({ ...formData, fromDate: e.target.value })}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">To Date <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="date"
                    value={formData.toDate}
                    onChange={(e) => setFormData({ ...formData, toDate: e.target.value })}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">LR Number <span className="text-red-500">*</span></label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={formData.lrNumber}
                  onChange={(e) => setFormData({ ...formData, lrNumber: e.target.value })}
                  placeholder="Enter LR Number"
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Status Type</label>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="lr_status"
                  checked={statusType === 'lr_status'}
                  onChange={(e) => { setStatusType(e.target.value as any); clearResults(); }}
                  className="w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500"
                />
                <span className="text-sm font-medium text-gray-700">LR Status</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="lr_ops_status"
                  checked={statusType === 'lr_ops_status'}
                  onChange={(e) => { setStatusType(e.target.value as any); clearResults(); }}
                  className="w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500"
                />
                <span className="text-sm font-medium text-gray-700">LR Ops Status</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="lr_financial_status"
                  checked={statusType === 'lr_financial_status'}
                  onChange={(e) => { setStatusType(e.target.value as any); clearResults(); }}
                  className="w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500"
                />
                <span className="text-sm font-medium text-gray-700">LR Fin Status</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSearch}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  Search
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {hasResults && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Search Results
              <span className="ml-2 text-sm font-normal text-gray-500">({resultCount} record{resultCount !== 1 ? 's' : ''} found)</span>
            </h2>
            {isFinDetailMode && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 rounded-full px-3 py-1">
                <Receipt className="w-3.5 h-3.5" /> Financial Detail View
              </span>
            )}
          </div>
          <div className="p-6">
            {isOpsDetailMode && renderOpsDetailView()}
            {isFinDetailMode && renderFinDetailView()}
            {!isOpsDetailMode && !isFinDetailMode && statusType === 'lr_status' && renderLRStatusView()}
            {!isOpsDetailMode && !isFinDetailMode && statusType === 'lr_ops_status' && renderOpsStatusView()}
            {!isOpsDetailMode && !isFinDetailMode && statusType === 'lr_financial_status' && renderFinStatusView()}
          </div>
        </div>
      )}

      {!loading && searched && !hasResults && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No LR records found</p>
          <p className="text-gray-400 text-sm mt-2">Try adjusting your search criteria</p>
        </div>
      )}

      {selectedPOD && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">POD Document</h3>
              <button onClick={() => setSelectedPOD(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <span className="text-2xl">&times;</span>
              </button>
            </div>
            <div className="p-6">
              {selectedPOD.endsWith('.pdf') ? (
                <iframe src={selectedPOD} className="w-full h-[600px] border border-gray-200 rounded" title="POD Document" />
              ) : (
                <img src={selectedPOD} alt="POD Document" className="w-full h-auto rounded border border-gray-200" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
