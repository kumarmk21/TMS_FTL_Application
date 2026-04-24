import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  TrendingUp,
  Package,
  Truck,
  DollarSign,
  FileText,
  AlertCircle,
  Loader2,
  Calendar,
  TrendingDown,
  CheckCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  CreditCard,
  BarChart2,
  Users,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DashboardStats {
  totalLRs: number;
  totalLRsThisMonth: number;
  totalTHCs: number;
  totalTHCsThisMonth: number;
  totalFreightAmount: number;
  totalFreightThisMonth: number;
  totalTHCAmount: number;
  totalTHCAmountThisMonth: number;
  pendingBills: number;
  recentLRs: Array<{
    manual_lr_no: string;
    lr_date: string;
    from_city: string;
    to_city: string;
    lr_total_amount: number;
    lr_status: string;
  }>;
  recentTHCs: Array<{
    thc_id_number: string;
    thc_date: string;
    vehicle_number: string;
    thc_amount: number;
    thc_advance_amount: number;
  }>;
  statusBreakdown: Array<{ status: string; count: number }>;
}

interface BillRecord {
  billing_party_name: string | null;
  bill_amount: number | null;
  lr_bill_date: string | null;
  lr_bill_status: string | null;
  lr_bill_mr_net_amount: number | null;
}

interface WarehouseBillRecord {
  billing_party_name: string | null;
  total_amount: number | null;
  bill_date: string | null;
  bill_status: string | null;
  net_amount: number | null;
}

interface PartyBillSummary {
  party: string;
  totalBilled: number;
  totalReceived: number;
  outstanding: number;
  billCount: number;
  transportCount: number;
  warehouseCount: number;
}

interface MonthBillSummary {
  month: string;
  monthKey: string;
  totalBilled: number;
  totalReceived: number;
  billCount: number;
  transportBilled: number;
  warehouseBilled: number;
}

type BillTab = 'party' | 'month';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  Booked:      { bg: 'bg-blue-100',   text: 'text-blue-800',   dot: 'bg-blue-500' },
  Delivered:   { bg: 'bg-green-100',  text: 'text-green-800',  dot: 'bg-green-500' },
  'In Transit':{ bg: 'bg-orange-100', text: 'text-orange-800', dot: 'bg-orange-500' },
  Billed:      { bg: 'bg-teal-100',   text: 'text-teal-800',   dot: 'bg-teal-500' },
  Paid:        { bg: 'bg-emerald-100',text: 'text-emerald-800',dot: 'bg-emerald-500' },
  Cancelled:   { bg: 'bg-gray-100',   text: 'text-gray-600',   dot: 'bg-gray-400' },
};

function getStatusStyle(status: string) {
  const s = Object.keys(STATUS_COLORS).find(k => status?.toLowerCase().includes(k.toLowerCase()));
  return s ? STATUS_COLORS[s] : { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-400' };
}

export function Dashboard() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalLRs: 0,
    totalLRsThisMonth: 0,
    totalTHCs: 0,
    totalTHCsThisMonth: 0,
    totalFreightAmount: 0,
    totalFreightThisMonth: 0,
    totalTHCAmount: 0,
    totalTHCAmountThisMonth: 0,
    pendingBills: 0,
    recentLRs: [],
    recentTHCs: [],
    statusBreakdown: [],
  });

  const [partyBills, setPartyBills] = useState<PartyBillSummary[]>([]);
  const [monthBills, setMonthBills] = useState<MonthBillSummary[]>([]);
  const [billTab, setBillTab] = useState<BillTab>('party');
  const [partyExpanded, setPartyExpanded] = useState(false);
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>('all');
  const [totalBilled, setTotalBilled] = useState(0);
  const [totalOutstanding, setTotalOutstanding] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchDashboardData(), fetchBillsData()]);
    setLastRefreshed(new Date());
    setLoading(false);
  };

  const fetchDashboardData = async () => {
    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

      const [lrResult, lrMonthResult, lrRecentResult, lrStatusResult, thcResult, thcMonthResult, thcRecentResult] =
        await Promise.all([
          supabase.from('booking_lr').select('lr_total_amount', { count: 'exact' }).not('lr_status', 'eq', 'Draft'),
          supabase.from('booking_lr').select('lr_total_amount', { count: 'exact' }).not('lr_status', 'eq', 'Draft').gte('lr_date', monthStart),
          supabase.from('booking_lr').select('manual_lr_no, lr_date, from_city, to_city, lr_total_amount, lr_status').not('lr_status', 'eq', 'Draft').order('created_at', { ascending: false }).limit(5),
          supabase.from('booking_lr').select('lr_status').not('lr_status', 'eq', 'Draft'),
          supabase.from('thc_details').select('thc_amount', { count: 'exact' }),
          supabase.from('thc_details').select('thc_amount', { count: 'exact' }).gte('thc_date', monthStart),
          supabase.from('thc_details').select('thc_id_number, thc_date, vehicle_number, thc_amount, thc_advance_amount').order('created_at', { ascending: false }).limit(5),
        ]);

      const totalFreightAmount = lrResult.data?.reduce((s, lr) => s + (lr.lr_total_amount || 0), 0) || 0;
      const totalFreightThisMonth = lrMonthResult.data?.reduce((s, lr) => s + (lr.lr_total_amount || 0), 0) || 0;
      const totalTHCAmount = thcResult.data?.reduce((s, t) => s + (t.thc_amount || 0), 0) || 0;
      const totalTHCAmountThisMonth = thcMonthResult.data?.reduce((s, t) => s + (t.thc_amount || 0), 0) || 0;

      const statusMap = new Map<string, number>();
      lrStatusResult.data?.forEach(lr => {
        let status = lr.lr_status || 'Unknown';
        if (status.toUpperCase().startsWith('DELIVERED')) status = 'Delivered';
        statusMap.set(status, (statusMap.get(status) || 0) + 1);
      });

      const { count: pendingBillsCount } = await supabase
        .from('booking_lr')
        .select('*', { count: 'exact', head: true })
        .is('lr_financial_status', null);

      setStats({
        totalLRs: lrResult.count || 0,
        totalLRsThisMonth: lrMonthResult.count || 0,
        totalTHCs: thcResult.count || 0,
        totalTHCsThisMonth: thcMonthResult.count || 0,
        totalFreightAmount,
        totalFreightThisMonth,
        totalTHCAmount,
        totalTHCAmountThisMonth,
        pendingBills: pendingBillsCount || 0,
        recentLRs: lrRecentResult.data || [],
        recentTHCs: thcRecentResult.data || [],
        statusBreakdown: Array.from(statusMap.entries()).map(([status, count]) => ({ status, count })),
      });
    } catch (e) {
      console.error('Error fetching dashboard data:', e);
    }
  };

  const fetchBillsData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      const [lrBillResult, whBillResult, overdueResult] = await Promise.all([
        supabase
          .from('lr_bill')
          .select('billing_party_name, bill_amount, lr_bill_date, lr_bill_status, lr_bill_mr_net_amount')
          .not('bill_status', 'eq', 'Cancelled'),
        supabase
          .from('warehouse_bill')
          .select('billing_party_name, total_amount, bill_date, bill_status, net_amount')
          .not('bill_status', 'eq', 'Cancelled'),
        supabase
          .from('lr_bill')
          .select('bill_id', { count: 'exact', head: true })
          .not('lr_bill_status', 'in', '("Paid","Cancelled")')
          .lt('lr_bill_due_date', today),
      ]);

      const lrBills: BillRecord[] = lrBillResult.data || [];
      const whBills: WarehouseBillRecord[] = whBillResult.data || [];

      // --- party-wise aggregation ---
      const partyMap = new Map<string, PartyBillSummary>();

      const processBill = (
        party: string | null,
        amount: number | null,
        received: number | null,
        status: string | null,
        type: 'transport' | 'warehouse'
      ) => {
        const key = party || 'Unknown';
        const isPaid = status?.toLowerCase() === 'paid';
        const paidAmt = isPaid ? (received && received > 0 ? received : amount || 0) : 0;
        if (!partyMap.has(key)) {
          partyMap.set(key, { party: key, totalBilled: 0, totalReceived: 0, outstanding: 0, billCount: 0, transportCount: 0, warehouseCount: 0 });
        }
        const entry = partyMap.get(key)!;
        entry.totalBilled += amount || 0;
        entry.totalReceived += paidAmt;
        entry.outstanding = entry.totalBilled - entry.totalReceived;
        entry.billCount += 1;
        if (type === 'transport') entry.transportCount += 1;
        else entry.warehouseCount += 1;
      };

      lrBills.forEach(b => processBill(b.billing_party_name, b.bill_amount, b.lr_bill_mr_net_amount, b.lr_bill_status, 'transport'));
      whBills.forEach(b => processBill(b.billing_party_name, b.total_amount, b.net_amount, b.bill_status, 'warehouse'));

      const partyList = Array.from(partyMap.values()).sort((a, b) => b.totalBilled - a.totalBilled);
      setPartyBills(partyList);

      // --- month-wise aggregation ---
      const monthMap = new Map<string, MonthBillSummary>();

      const processMonthBill = (
        date: string | null,
        amount: number | null,
        received: number | null,
        status: string | null,
        type: 'transport' | 'warehouse'
      ) => {
        if (!date) return;
        const d = new Date(date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
        const isPaid = status?.toLowerCase() === 'paid';
        const paidAmt = isPaid ? (received && received > 0 ? received : amount || 0) : 0;
        if (!monthMap.has(key)) {
          monthMap.set(key, { month: label, monthKey: key, totalBilled: 0, totalReceived: 0, billCount: 0, transportBilled: 0, warehouseBilled: 0 });
        }
        const entry = monthMap.get(key)!;
        entry.totalBilled += amount || 0;
        entry.totalReceived += paidAmt;
        entry.billCount += 1;
        if (type === 'transport') entry.transportBilled += amount || 0;
        else entry.warehouseBilled += amount || 0;
      };

      lrBills.forEach(b => processMonthBill(b.lr_bill_date, b.bill_amount, b.lr_bill_mr_net_amount, b.lr_bill_status, 'transport'));
      whBills.forEach(b => processMonthBill(b.bill_date, b.total_amount, b.net_amount, b.bill_status, 'warehouse'));

      const monthList = Array.from(monthMap.values()).sort((a, b) => b.monthKey.localeCompare(a.monthKey));
      setMonthBills(monthList);

      // totals
      const allBilled = partyList.reduce((s, p) => s + p.totalBilled, 0);
      const allOutstanding = partyList.reduce((s, p) => s + p.outstanding, 0);
      setTotalBilled(allBilled);
      setTotalOutstanding(allOutstanding);
      setOverdueCount(overdueResult.count || 0);
    } catch (e) {
      console.error('Error fetching bills data:', e);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const displayedParties = partyExpanded ? partyBills : partyBills.slice(0, 8);

  const filteredMonths =
    selectedMonthFilter === 'all'
      ? monthBills
      : monthBills.filter(m => m.monthKey.startsWith(selectedMonthFilter));

  const availableYears = [...new Set(monthBills.map(m => m.monthKey.slice(0, 4)))].sort((a, b) => b.localeCompare(a));

  // bar chart max for visual bars
  const maxMonthBilled = Math.max(...monthBills.map(m => m.totalBilled), 1);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome back, {profile?.full_name}!</h1>
          <p className="text-gray-500 mt-1 text-sm">Transport operations overview</p>
        </div>
        <button
          onClick={fetchAll}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-600 transition-colors px-3 py-2 border border-gray-200 rounded-lg hover:border-red-300 bg-white"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
          <span className="text-xs text-gray-400">
            {lastRefreshed.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </button>
      </div>

      {/* KPI Cards — row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-red-600 p-2.5 rounded-lg">
              <Package className="w-5 h-5 text-white" />
            </div>
            <span className="text-[11px] font-semibold text-gray-400 tracking-wide uppercase">This Month</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.totalLRsThisMonth}</p>
          <p className="text-sm text-gray-600 mt-0.5">LRs Booked</p>
          <p className="text-xs text-gray-400 mt-2">All time: {stats.totalLRs.toLocaleString('en-IN')}</p>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-emerald-600 p-2.5 rounded-lg">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <span className="text-[11px] font-semibold text-gray-400 tracking-wide uppercase">This Month</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalFreightThisMonth)}</p>
          <p className="text-sm text-gray-600 mt-0.5">Freight Revenue</p>
          <p className="text-xs text-gray-400 mt-2">All time: {formatCurrency(stats.totalFreightAmount)}</p>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-orange-500 p-2.5 rounded-lg">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <span className="text-[11px] font-semibold text-gray-400 tracking-wide uppercase">This Month</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalTHCAmountThisMonth)}</p>
          <p className="text-sm text-gray-600 mt-0.5">THC Expense</p>
          <p className="text-xs text-gray-400 mt-2">{stats.totalTHCsThisMonth} THCs · All time: {formatCurrency(stats.totalTHCAmount)}</p>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className={`p-2.5 rounded-lg ${stats.pendingBills > 0 ? 'bg-amber-500' : 'bg-gray-400'}`}>
              <Clock className="w-5 h-5 text-white" />
            </div>
            <span className="text-[11px] font-semibold text-gray-400 tracking-wide uppercase">Attention</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.pendingBills}</p>
          <p className="text-sm text-gray-600 mt-0.5">LRs Pending Billing</p>
          <p className="text-xs text-gray-400 mt-2">
            {overdueCount > 0
              ? <span className="text-red-500 font-medium">{overdueCount} bills overdue</span>
              : 'No overdue bills'}
          </p>
        </div>
      </div>

      {/* Bills summary banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-5 text-white shadow-lg">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-white/10 p-2 rounded-lg">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm font-medium text-slate-300">Total Billed (All Time)</span>
          </div>
          <p className="text-3xl font-bold">{formatCurrency(totalBilled)}</p>
          <p className="text-xs text-slate-400 mt-1">{partyBills.length} billing parties</p>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-amber-700 rounded-xl p-5 text-white shadow-lg">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm font-medium text-amber-100">Outstanding Amount</span>
          </div>
          <p className="text-3xl font-bold">{formatCurrency(totalOutstanding)}</p>
          <p className="text-xs text-amber-200 mt-1">
            {totalBilled > 0 ? ((totalOutstanding / totalBilled) * 100).toFixed(1) : '0'}% of total billed pending
          </p>
        </div>

        <div className="bg-gradient-to-br from-red-600 to-red-800 rounded-xl p-5 text-white shadow-lg">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm font-medium text-red-100">This Month Revenue</span>
          </div>
          <p className="text-3xl font-bold">{formatCurrency(stats.totalFreightThisMonth)}</p>
          <p className="text-xs text-red-200 mt-1">
            {stats.totalLRsThisMonth} LRs · {stats.totalTHCsThisMonth} THCs dispatched
          </p>
        </div>
      </div>

      {/* Party-wise / Month-wise Bills Panel */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {/* Tab header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-0 border-b border-gray-100">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setBillTab('party')}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                billTab === 'party'
                  ? 'border-red-600 text-red-700 bg-red-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Users className="w-4 h-4" />
              Party-wise Bills
            </button>
            <button
              onClick={() => setBillTab('month')}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                billTab === 'month'
                  ? 'border-red-600 text-red-700 bg-red-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <BarChart2 className="w-4 h-4" />
              Month-wise Bills
            </button>
          </div>
          {billTab === 'month' && availableYears.length > 0 && (
            <div className="flex items-center gap-2 mb-1">
              <label className="text-xs text-gray-500">Year:</label>
              <select
                value={selectedMonthFilter}
                onChange={e => setSelectedMonthFilter(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="all">All Years</option>
                {availableYears.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Party-wise tab */}
        {billTab === 'party' && (
          <div>
            {partyBills.length === 0 ? (
              <div className="py-16 text-center text-gray-400">
                <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No billing data available</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">#</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Billing Party</th>
                        <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Transport</th>
                        <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Warehouse</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Billed</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Received</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Outstanding</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-40">Recovery %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {displayedParties.map((p, i) => {
                        const recoveryPct = p.totalBilled > 0 ? (p.totalReceived / p.totalBilled) * 100 : 0;
                        const isHighOutstanding = p.outstanding > 500000;
                        return (
                          <tr key={p.party} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-3.5 text-sm text-gray-400">{i + 1}</td>
                            <td className="px-6 py-3.5">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                                  <span className="text-xs font-bold text-red-700">{p.party[0]?.toUpperCase()}</span>
                                </div>
                                <span className="text-sm font-medium text-gray-900">{p.party}</span>
                              </div>
                            </td>
                            <td className="px-6 py-3.5 text-center">
                              {p.transportCount > 0 ? (
                                <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">{p.transportCount}</span>
                              ) : <span className="text-gray-300 text-xs">—</span>}
                            </td>
                            <td className="px-6 py-3.5 text-center">
                              {p.warehouseCount > 0 ? (
                                <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-700">{p.warehouseCount}</span>
                              ) : <span className="text-gray-300 text-xs">—</span>}
                            </td>
                            <td className="px-6 py-3.5 text-sm font-semibold text-gray-900 text-right">
                              {formatCurrency(p.totalBilled)}
                            </td>
                            <td className="px-6 py-3.5 text-sm text-emerald-700 font-medium text-right">
                              {formatCurrency(p.totalReceived)}
                            </td>
                            <td className="px-6 py-3.5 text-right">
                              <span className={`text-sm font-semibold ${isHighOutstanding ? 'text-red-600' : 'text-amber-600'}`}>
                                {formatCurrency(p.outstanding)}
                              </span>
                            </td>
                            <td className="px-6 py-3.5">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                                  <div
                                    className={`h-2 rounded-full transition-all ${recoveryPct >= 80 ? 'bg-emerald-500' : recoveryPct >= 50 ? 'bg-amber-400' : 'bg-red-500'}`}
                                    style={{ width: `${Math.min(recoveryPct, 100)}%` }}
                                  />
                                </div>
                                <span className="text-xs text-gray-500 w-10 text-right">{recoveryPct.toFixed(0)}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Footer totals + show more */}
                <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-6 text-sm">
                    <span className="text-gray-500">
                      Total Billed: <span className="font-bold text-gray-900">{formatCurrency(totalBilled)}</span>
                    </span>
                    <span className="text-gray-500">
                      Outstanding: <span className="font-bold text-amber-600">{formatCurrency(totalOutstanding)}</span>
                    </span>
                    <span className="text-gray-500">
                      Collected: <span className="font-bold text-emerald-600">{formatCurrency(totalBilled - totalOutstanding)}</span>
                    </span>
                  </div>
                  {partyBills.length > 8 && (
                    <button
                      onClick={() => setPartyExpanded(!partyExpanded)}
                      className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700 font-medium"
                    >
                      {partyExpanded ? (
                        <><ChevronUp className="w-4 h-4" /> Show Less</>
                      ) : (
                        <><ChevronDown className="w-4 h-4" /> Show all {partyBills.length} parties</>
                      )}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Month-wise tab */}
        {billTab === 'month' && (
          <div>
            {filteredMonths.length === 0 ? (
              <div className="py-16 text-center text-gray-400">
                <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No billing data for selected period</p>
              </div>
            ) : (
              <>
                {/* Bar chart visual */}
                <div className="px-6 pt-5 pb-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Billed Amount by Month</p>
                  <div className="flex items-end gap-2 h-28 overflow-x-auto pb-1">
                    {[...filteredMonths].reverse().map(m => {
                      const heightPct = (m.totalBilled / maxMonthBilled) * 100;
                      return (
                        <div key={m.monthKey} className="flex flex-col items-center gap-1 flex-shrink-0 group" style={{ minWidth: '52px' }}>
                          <span className="text-[10px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            {formatCurrency(m.totalBilled)}
                          </span>
                          <div
                            className="w-9 rounded-t-md bg-red-500 hover:bg-red-600 transition-colors cursor-default"
                            style={{ height: `${Math.max(heightPct, 4)}%` }}
                            title={`${m.month}: ${formatCurrency(m.totalBilled)}`}
                          />
                          <span className="text-[10px] text-gray-500 whitespace-nowrap">{m.month.split(' ')[0]}</span>
                          <span className="text-[10px] text-gray-400">{m.month.split(' ')[1]}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="overflow-x-auto border-t border-gray-100">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Month</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Bills</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-blue-500 uppercase tracking-wider">Transport</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-teal-500 uppercase tracking-wider">Warehouse</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Billed</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Received</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Outstanding</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-36">Collection %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredMonths.map((m) => {
                        const outstanding = m.totalBilled - m.totalReceived;
                        const pct = m.totalBilled > 0 ? (m.totalReceived / m.totalBilled) * 100 : 0;
                        const isCurrentMonth = m.monthKey === `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
                        return (
                          <tr key={m.monthKey} className={`hover:bg-gray-50 transition-colors ${isCurrentMonth ? 'bg-red-50/40' : ''}`}>
                            <td className="px-6 py-3.5">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-gray-900">{m.month}</span>
                                {isCurrentMonth && (
                                  <span className="text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full">Current</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-3.5 text-sm text-gray-600 text-right">
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-xs font-semibold">{m.billCount}</span>
                            </td>
                            <td className="px-6 py-3.5 text-sm font-medium text-blue-700 text-right">
                              {m.transportBilled > 0 ? formatCurrency(m.transportBilled) : <span className="text-gray-300">—</span>}
                            </td>
                            <td className="px-6 py-3.5 text-sm font-medium text-teal-700 text-right">
                              {m.warehouseBilled > 0 ? formatCurrency(m.warehouseBilled) : <span className="text-gray-300">—</span>}
                            </td>
                            <td className="px-6 py-3.5 text-sm font-semibold text-gray-900 text-right">
                              {formatCurrency(m.totalBilled)}
                            </td>
                            <td className="px-6 py-3.5 text-sm text-emerald-700 font-medium text-right">
                              {formatCurrency(m.totalReceived)}
                            </td>
                            <td className="px-6 py-3.5 text-right">
                              <span className={`text-sm font-semibold ${outstanding > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                {formatCurrency(outstanding)}
                              </span>
                            </td>
                            <td className="px-6 py-3.5">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                                  <div
                                    className={`h-2 rounded-full ${pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-500'}`}
                                    style={{ width: `${Math.min(pct, 100)}%` }}
                                  />
                                </div>
                                <span className="text-xs text-gray-500 w-10 text-right">{pct.toFixed(0)}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Month footer totals */}
                <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center gap-6 text-sm flex-wrap">
                  <span className="text-gray-500">
                    Period Total: <span className="font-bold text-gray-900">{formatCurrency(filteredMonths.reduce((s, m) => s + m.totalBilled, 0))}</span>
                  </span>
                  <span className="text-gray-500">
                    Received: <span className="font-bold text-emerald-600">{formatCurrency(filteredMonths.reduce((s, m) => s + m.totalReceived, 0))}</span>
                  </span>
                  <span className="text-gray-500">
                    Outstanding: <span className="font-bold text-amber-600">{formatCurrency(filteredMonths.reduce((s, m) => s + (m.totalBilled - m.totalReceived), 0))}</span>
                  </span>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Recent LRs + Recent THCs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-gray-900">Recent LRs</h2>
            <Package className="w-5 h-5 text-red-500" />
          </div>
          <table className="w-full">
            <thead className="text-xs text-gray-400 uppercase border-b border-gray-100">
              <tr>
                <th className="pb-2.5 text-left font-semibold">LR No.</th>
                <th className="pb-2.5 text-left font-semibold">Route</th>
                <th className="pb-2.5 text-right font-semibold">Amount</th>
                <th className="pb-2.5 text-left font-semibold pl-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {stats.recentLRs.length === 0 ? (
                <tr><td colSpan={4} className="py-8 text-center text-sm text-gray-400">No LRs found</td></tr>
              ) : (
                stats.recentLRs.map((lr, i) => {
                  const style = getStatusStyle(lr.lr_status);
                  return (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="py-3 text-sm font-semibold text-gray-900">{lr.manual_lr_no}</td>
                      <td className="py-3 text-sm text-gray-500">{lr.from_city} → {lr.to_city}</td>
                      <td className="py-3 text-sm font-medium text-right text-gray-900">{formatCurrency(lr.lr_total_amount || 0)}</td>
                      <td className="py-3 pl-4">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                          {lr.lr_status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-gray-900">Recent THCs</h2>
            <Truck className="w-5 h-5 text-orange-500" />
          </div>
          <table className="w-full">
            <thead className="text-xs text-gray-400 uppercase border-b border-gray-100">
              <tr>
                <th className="pb-2.5 text-left font-semibold">THC ID</th>
                <th className="pb-2.5 text-left font-semibold">Vehicle</th>
                <th className="pb-2.5 text-right font-semibold">Amount</th>
                <th className="pb-2.5 text-right font-semibold">Advance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {stats.recentTHCs.length === 0 ? (
                <tr><td colSpan={4} className="py-8 text-center text-sm text-gray-400">No THCs found</td></tr>
              ) : (
                stats.recentTHCs.map((thc, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="py-3 text-sm font-semibold text-gray-900">{thc.thc_id_number}</td>
                    <td className="py-3 text-sm text-gray-500">{thc.vehicle_number || '-'}</td>
                    <td className="py-3 text-sm font-medium text-right text-gray-900">{formatCurrency(thc.thc_amount || 0)}</td>
                    <td className="py-3 text-sm text-right text-gray-500">{formatCurrency(thc.thc_advance_amount || 0)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* LR Status Overview */}
      {stats.statusBreakdown.length > 0 && (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-gray-900">LR Status Overview</h2>
            <TrendingUp className="w-5 h-5 text-red-500" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {stats.statusBreakdown.map((item, i) => {
              const style = getStatusStyle(item.status);
              return (
                <div key={i} className={`p-4 rounded-xl border ${style.bg} border-transparent hover:shadow-sm transition-all`}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                    <p className={`text-[11px] font-semibold uppercase tracking-wide truncate ${style.text}`}>{item.status}</p>
                  </div>
                  <p className={`text-2xl font-bold ${style.text}`}>{item.count}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom alert strip */}
      {(stats.pendingBills > 0 || overdueCount > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {stats.pendingBills > 0 && (
            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Billing Pending</p>
                <p className="text-sm text-amber-700 mt-0.5">
                  {stats.pendingBills} LRs have not been billed yet. Generate customer bills to clear the queue.
                </p>
              </div>
            </div>
          )}
          {overdueCount > 0 && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
              <Clock className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-800">Overdue Bills</p>
                <p className="text-sm text-red-700 mt-0.5">
                  {overdueCount} bill{overdueCount > 1 ? 's are' : ' is'} past the due date. Follow up on collections immediately.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
