import { useAuth } from '../contexts/AuthContext';
import {
  TrendingUp,
  Package,
  Truck,
  DollarSign,
  Users,
  AlertCircle,
} from 'lucide-react';

const stats = [
  {
    label: 'Total Bookings',
    value: '1,234',
    change: '+12.5%',
    icon: Package,
    color: 'bg-red-600',
  },
  {
    label: 'Active Trips',
    value: '89',
    change: '+5.2%',
    icon: Truck,
    color: 'bg-green-500',
  },
  {
    label: 'Revenue',
    value: '₹12.5L',
    change: '+18.3%',
    icon: DollarSign,
    color: 'bg-orange-500',
  },
  {
    label: 'Total Customers',
    value: '456',
    change: '+8.1%',
    icon: Users,
    color: 'bg-purple-500',
  },
];

const recentActivities = [
  { id: 1, action: 'New booking created', time: '5 minutes ago', type: 'booking' },
  { id: 2, action: 'Trip #1234 completed', time: '15 minutes ago', type: 'trip' },
  { id: 3, action: 'Invoice #INV-001 generated', time: '1 hour ago', type: 'billing' },
  { id: 4, action: 'New customer registered', time: '2 hours ago', type: 'customer' },
  { id: 5, action: 'Payment received ₹50,000', time: '3 hours ago', type: 'payment' },
];

export function Dashboard() {
  const { profile } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {profile?.full_name}!
        </h1>
        <p className="text-gray-600 mt-1">
          Here's what's happening with your transport operations today.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-sm font-semibold text-green-600">{stat.change}</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
              <p className="text-sm text-gray-600 mt-1">{stat.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Recent Activities</h2>
            <TrendingUp className="w-5 h-5 text-red-600" />
          </div>
          <div className="space-y-4">
            {recentActivities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <div className="w-2 h-2 rounded-full bg-red-600 mt-2" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Quick Actions</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-red-500 hover:bg-red-50 transition-all text-left">
              <Package className="w-8 h-8 text-red-600 mb-2" />
              <p className="font-semibold text-gray-900">New Booking</p>
              <p className="text-xs text-gray-600 mt-1">Create booking</p>
            </button>
            <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all text-left">
              <DollarSign className="w-8 h-8 text-green-600 mb-2" />
              <p className="font-semibold text-gray-900">Generate Invoice</p>
              <p className="text-xs text-gray-600 mt-1">Create invoice</p>
            </button>
            <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-all text-left">
              <Truck className="w-8 h-8 text-orange-600 mb-2" />
              <p className="font-semibold text-gray-900">Track Vehicle</p>
              <p className="text-xs text-gray-600 mt-1">View location</p>
            </button>
            <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all text-left">
              <Users className="w-8 h-8 text-purple-600 mb-2" />
              <p className="font-semibold text-gray-900">Add Customer</p>
              <p className="text-xs text-gray-600 mt-1">New customer</p>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-red-600 to-red-800 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-start gap-4">
          <AlertCircle className="w-6 h-6 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-bold mb-2">Getting Started</h3>
            <p className="text-red-100 mb-4">
              {profile?.role === 'admin'
                ? 'Welcome to DLS Transport Management System. As an admin, you have full access to all modules including Masters, Bookings, Billing, Payments, CRM, and Reports.'
                : 'Welcome to DLS Transport Management System. Use the sidebar to navigate through Bookings, Billing, Payments, CRM, and Reports sections.'
              }
            </p>
            <p className="text-sm text-red-200">
              Your role: <span className="font-semibold capitalize">{profile?.role}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
