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
  statusBreakdown: Array<{
    status: string;
    count: number;
  }>;
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

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthStart = firstDayOfMonth.toISOString().split('T')[0];

      const [lrResult, lrMonthResult, lrRecentResult, lrStatusResult, thcResult, thcMonthResult, thcRecentResult] = await Promise.all([
        supabase
          .from('booking_lr')
          .select('lr_total_amount', { count: 'exact' })
          .not('lr_status', 'eq', 'Draft'),

        supabase
          .from('booking_lr')
          .select('lr_total_amount', { count: 'exact' })
          .not('lr_status', 'eq', 'Draft')
          .gte('lr_date', monthStart),

        supabase
          .from('booking_lr')
          .select('manual_lr_no, lr_date, from_city, to_city, lr_total_amount, lr_status')
          .not('lr_status', 'eq', 'Draft')
          .order('created_at', { ascending: false })
          .limit(5),

        supabase
          .from('booking_lr')
          .select('lr_status')
          .not('lr_status', 'eq', 'Draft'),

        supabase
          .from('thc_details')
          .select('thc_amount', { count: 'exact' }),

        supabase
          .from('thc_details')
          .select('thc_amount', { count: 'exact' })
          .gte('thc_date', monthStart),

        supabase
          .from('thc_details')
          .select('thc_id_number, thc_date, vehicle_number, thc_amount, thc_advance_amount')
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      const totalFreightAmount = lrResult.data?.reduce((sum, lr) => sum + (lr.lr_total_amount || 0), 0) || 0;
      const totalFreightThisMonth = lrMonthResult.data?.reduce((sum, lr) => sum + (lr.lr_total_amount || 0), 0) || 0;
      const totalTHCAmount = thcResult.data?.reduce((sum, thc) => sum + (thc.thc_amount || 0), 0) || 0;
      const totalTHCAmountThisMonth = thcMonthResult.data?.reduce((sum, thc) => sum + (thc.thc_amount || 0), 0) || 0;

      const statusMap = new Map<string, number>();
      lrStatusResult.data?.forEach(lr => {
        let status = lr.lr_status || 'Unknown';

        if (status.toUpperCase().startsWith('DELIVERED')) {
          status = 'Delivered';
        }

        statusMap.set(status, (statusMap.get(status) || 0) + 1);
      });

      const statusBreakdown = Array.from(statusMap.entries()).map(([status, count]) => ({
        status,
        count,
      }));

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
        statusBreakdown,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {profile?.full_name}!
        </h1>
        <p className="text-gray-600 mt-1">
          Here's an overview of your transport operations.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-red-600 p-3 rounded-lg">
              <Package className="w-6 h-6 text-white" />
            </div>
            <span className="text-xs font-medium text-gray-500">THIS MONTH</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">{stats.totalLRsThisMonth}</h3>
          <p className="text-sm text-gray-600 mt-1">Total LRs</p>
          <p className="text-xs text-gray-500 mt-2">All time: {stats.totalLRs}</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-green-600 p-3 rounded-lg">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <span className="text-xs font-medium text-gray-500">THIS MONTH</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">
            {formatCurrency(stats.totalFreightThisMonth)}
          </h3>
          <p className="text-sm text-gray-600 mt-1">Freight Revenue</p>
          <p className="text-xs text-gray-500 mt-2">All time: {formatCurrency(stats.totalFreightAmount)}</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-orange-600 p-3 rounded-lg">
              <Truck className="w-6 h-6 text-white" />
            </div>
            <span className="text-xs font-medium text-gray-500">THIS MONTH</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">{stats.totalTHCsThisMonth}</h3>
          <p className="text-sm text-gray-600 mt-1">Total THCs</p>
          <p className="text-xs text-gray-500 mt-2">All time: {stats.totalTHCs}</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-purple-600 p-3 rounded-lg">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <span className="text-xs font-medium text-gray-500">THC EXPENSE</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">
            {formatCurrency(stats.totalTHCAmountThisMonth)}
          </h3>
          <p className="text-sm text-gray-600 mt-1">This Month</p>
          <p className="text-xs text-gray-500 mt-2">All time: {formatCurrency(stats.totalTHCAmount)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Recent LRs</h2>
            <Package className="w-5 h-5 text-red-600" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="text-xs text-gray-500 uppercase border-b">
                <tr>
                  <th className="pb-3 text-left font-medium">LR Number</th>
                  <th className="pb-3 text-left font-medium">Route</th>
                  <th className="pb-3 text-right font-medium">Amount</th>
                  <th className="pb-3 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stats.recentLRs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-gray-500 text-sm">
                      No LRs found
                    </td>
                  </tr>
                ) : (
                  stats.recentLRs.map((lr, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="py-3 text-sm font-medium text-gray-900">{lr.manual_lr_no}</td>
                      <td className="py-3 text-sm text-gray-600">
                        {lr.from_city} → {lr.to_city}
                      </td>
                      <td className="py-3 text-sm text-right font-medium text-gray-900">
                        {formatCurrency(lr.lr_total_amount || 0)}
                      </td>
                      <td className="py-3">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {lr.lr_status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Recent THCs</h2>
            <Truck className="w-5 h-5 text-orange-600" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="text-xs text-gray-500 uppercase border-b">
                <tr>
                  <th className="pb-3 text-left font-medium">THC ID</th>
                  <th className="pb-3 text-left font-medium">Vehicle</th>
                  <th className="pb-3 text-right font-medium">Amount</th>
                  <th className="pb-3 text-right font-medium">Advance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stats.recentTHCs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-gray-500 text-sm">
                      No THCs found
                    </td>
                  </tr>
                ) : (
                  stats.recentTHCs.map((thc, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="py-3 text-sm font-medium text-gray-900">{thc.thc_id_number}</td>
                      <td className="py-3 text-sm text-gray-600">{thc.vehicle_number || '-'}</td>
                      <td className="py-3 text-sm text-right font-medium text-gray-900">
                        {formatCurrency(thc.thc_amount || 0)}
                      </td>
                      <td className="py-3 text-sm text-right text-gray-600">
                        {formatCurrency(thc.thc_advance_amount || 0)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {stats.statusBreakdown.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">LR Status Overview</h2>
            <TrendingUp className="w-5 h-5 text-red-600" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {stats.statusBreakdown.map((item, index) => (
              <div
                key={index}
                className="p-4 border border-gray-200 rounded-lg hover:border-red-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-gray-400" />
                  <p className="text-xs text-gray-500 uppercase font-medium truncate">{item.status}</p>
                </div>
                <p className="text-2xl font-bold text-gray-900">{item.count}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-red-600 to-red-800 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-start gap-4">
            <Calendar className="w-6 h-6 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-bold mb-2">Monthly Summary</h3>
              <p className="text-red-100 text-sm mb-3">
                {stats.totalLRsThisMonth} LRs generated this month with total revenue of {formatCurrency(stats.totalFreightThisMonth)}
              </p>
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="w-4 h-4" />
                <span>Active operations</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-600 to-orange-800 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-start gap-4">
            <Truck className="w-6 h-6 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-bold mb-2">Transport Expense</h3>
              <p className="text-orange-100 text-sm mb-3">
                {stats.totalTHCsThisMonth} THCs processed this month with total expense of {formatCurrency(stats.totalTHCAmountThisMonth)}
              </p>
              <div className="flex items-center gap-2 text-sm">
                <TrendingDown className="w-4 h-4" />
                <span>Operational costs</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-start gap-4">
            <Clock className="w-6 h-6 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-bold mb-2">Pending Items</h3>
              <p className="text-purple-100 text-sm mb-3">
                {stats.pendingBills} LRs are pending for billing
              </p>
              <div className="flex items-center gap-2 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>Requires attention</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <AlertCircle className="w-6 h-6 flex-shrink-0 mt-1 text-blue-600" />
          <div>
            <h3 className="text-lg font-bold text-blue-900 mb-2">System Info</h3>
            <p className="text-blue-800 text-sm mb-2">
              {profile?.role === 'admin'
                ? 'You have full access to all modules including Masters, Bookings, Finance, Operations, and Reports.'
                : 'Use the sidebar to navigate through Bookings, Finance, Operations, and Reports sections.'
              }
            </p>
            <p className="text-sm text-blue-700">
              Your role: <span className="font-semibold capitalize">{profile?.role}</span>
              {profile?.branch_code && ` | Branch: ${profile.branch_code}`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
