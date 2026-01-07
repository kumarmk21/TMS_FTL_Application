import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Search, RefreshCw, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AddOrderEnquiryModal } from '../components/modals/AddOrderEnquiryModal';
import { EditOrderEnquiryModal } from '../components/modals/EditOrderEnquiryModal';
import { UpdateOrderEnquiryModal } from '../components/modals/UpdateOrderEnquiryModal';
import { ViewOrderEnquiryModal } from '../components/modals/ViewOrderEnquiryModal';
import { useAuth } from '../contexts/AuthContext';

interface OrderEnquiry {
  id: string;
  enq_id: string;
  entry_date: string;
  loading_date: string;
  customer_id: string;
  origin_id: string;
  destination_id: string;
  vehicle_type_id: string;
  weight_mt: number;
  expected_rate: number | null;
  status: string;
  created_by: string;
  vendor_id: string | null;
  vehicle_number: string | null;
  driver_number: string | null;
  truck_hire: number | null;
  cancellation_reason: string | null;
  customer_master: { customer_name: string };
  origin: { city_name: string };
  destination: { city_name: string };
  vehicle_master: { vehicle_type: string };
  vendor_master: { vendor_name: string } | null;
}

export function OrderEnquiry() {
  const { profile } = useAuth();
  const [enquiries, setEnquiries] = useState<OrderEnquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Open' | 'Confirmed' | 'Cancelled'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedEnquiry, setSelectedEnquiry] = useState<OrderEnquiry | null>(null);

  useEffect(() => {
    fetchEnquiries();
  }, []);

  const fetchEnquiries = async () => {
    try {
      const { data, error } = await supabase
        .from('order_enquiry')
        .select(`
          *,
          customer_master(customer_name),
          origin:city_master!origin_id(city_name),
          destination:city_master!destination_id(city_name),
          vehicle_master(vehicle_type),
          vendor_master(vendor_name)
        `)
        .order('entry_date', { ascending: false });

      if (error) throw error;
      setEnquiries(data || []);
    } catch (error: any) {
      console.error('Error fetching enquiries:', error);
      alert('Failed to fetch enquiries');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, enqId: string) => {
    if (!confirm(`Are you sure you want to delete enquiry "${enqId}"?`)) return;

    try {
      const { error } = await supabase
        .from('order_enquiry')
        .delete()
        .eq('id', id);

      if (error) throw error;

      alert('Enquiry deleted successfully!');
      fetchEnquiries();
    } catch (error: any) {
      console.error('Error deleting enquiry:', error);
      alert(error.message || 'Failed to delete enquiry');
    }
  };

  const handleEdit = (enquiry: OrderEnquiry) => {
    setSelectedEnquiry(enquiry);
    setShowEditModal(true);
  };

  const handleUpdate = (enquiry: OrderEnquiry) => {
    setSelectedEnquiry(enquiry);
    setShowUpdateModal(true);
  };

  const handleView = (enquiry: OrderEnquiry) => {
    setSelectedEnquiry(enquiry);
    setShowViewModal(true);
  };

  const filteredEnquiries = enquiries.filter((enquiry) => {
    const matchesSearch =
      enquiry.enq_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      enquiry.customer_master?.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      enquiry.origin?.city_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      enquiry.destination?.city_name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' || enquiry.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Customer Order/Enquiry</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          New Enquiry
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by enquiry ID, customer, origin, or destination..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="Open">Open</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Enquiry ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Entry Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Loading Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Origin
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Destination
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vehicle Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Weight (MT)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expected Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEnquiries.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-6 py-8 text-center text-gray-500">
                    No enquiries found
                  </td>
                </tr>
              ) : (
                filteredEnquiries.map((enquiry) => (
                  <tr key={enquiry.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {enquiry.enq_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(enquiry.entry_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(enquiry.loading_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {enquiry.customer_master?.customer_name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {enquiry.origin?.city_name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {enquiry.destination?.city_name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {enquiry.vehicle_master?.vehicle_type || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {enquiry.weight_mt}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {enquiry.expected_rate ? `₹${enquiry.expected_rate}` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          enquiry.status === 'Open'
                            ? 'bg-blue-100 text-blue-800'
                            : enquiry.status === 'Confirmed'
                            ? 'bg-green-100 text-green-800'
                            : enquiry.status === 'Cancelled'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {enquiry.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <div className="flex gap-2">
                        {enquiry.status === 'Confirmed' && (
                          <button
                            onClick={() => handleView(enquiry)}
                            className="text-purple-600 hover:text-purple-800 transition-colors"
                            title="View Details"
                          >
                            <Eye size={18} />
                          </button>
                        )}
                        <button
                          onClick={() => handleEdit(enquiry)}
                          className="text-blue-600 hover:text-blue-800 transition-colors"
                          title="Edit"
                        >
                          <Pencil size={18} />
                        </button>
                        {enquiry.status === 'Open' && (
                          <button
                            onClick={() => handleUpdate(enquiry)}
                            className="text-green-600 hover:text-green-800 transition-colors"
                            title="Update Status"
                          >
                            <RefreshCw size={18} />
                          </button>
                        )}
                        {profile?.role === 'admin' && (
                          <button
                            onClick={() => handleDelete(enquiry.id, enquiry.enq_id)}
                            className="text-red-600 hover:text-red-800 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 text-sm text-gray-600">
          Total: {filteredEnquiries.length} enquir{filteredEnquiries.length === 1 ? 'y' : 'ies'}
        </div>
      </div>

      {showAddModal && (
        <AddOrderEnquiryModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            fetchEnquiries();
            setShowAddModal(false);
          }}
        />
      )}

      {showEditModal && selectedEnquiry && (
        <EditOrderEnquiryModal
          enquiry={selectedEnquiry}
          onClose={() => {
            setShowEditModal(false);
            setSelectedEnquiry(null);
          }}
          onSuccess={() => {
            fetchEnquiries();
            setShowEditModal(false);
            setSelectedEnquiry(null);
          }}
        />
      )}

      {showUpdateModal && selectedEnquiry && (
        <UpdateOrderEnquiryModal
          enquiry={selectedEnquiry}
          onClose={() => {
            setShowUpdateModal(false);
            setSelectedEnquiry(null);
          }}
          onSuccess={() => {
            fetchEnquiries();
            setShowUpdateModal(false);
            setSelectedEnquiry(null);
          }}
        />
      )}

      {showViewModal && selectedEnquiry && (
        <ViewOrderEnquiryModal
          enquiry={selectedEnquiry}
          onClose={() => {
            setShowViewModal(false);
            setSelectedEnquiry(null);
          }}
        />
      )}
    </div>
  );
}
