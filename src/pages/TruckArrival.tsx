import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Truck, Search, Filter, Calendar, Upload, CheckCircle, Loader2 } from 'lucide-react';
import { UploadPODModal } from '../components/modals/UploadPODModal';

interface BookingLR {
  tran_id: string;
  manual_lr_no: string;
  lr_date: string;
  booking_branch: string;
  from_city: string;
  to_city: string;
  vehicle_type: string;
  vehicle_number: string;
  driver_name: string;
  driver_mobile: string;
  consignor: string;
  consignee: string;
  billing_party_name: string;
  no_of_pkgs: number;
  chrg_wt: number;
  lr_total_amount: number;
  lr_status: string;
  est_del_date: string;
  act_del_date: string;
  pod_recd_date: string;
  pod_recd_type: string;
  pod_upload: string;
  dispatch_date: string;
  arrival_date: string;
}

export function TruckArrival() {
  const { profile } = useAuth();
  const [bookings, setBookings] = useState<BookingLR[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<BookingLR[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<BookingLR | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const [filters, setFilters] = useState({
    searchTerm: '',
    fromDate: '',
    toDate: '',
  });

  useEffect(() => {
    fetchBookings();
  }, [profile]);

  useEffect(() => {
    applyFilters();
  }, [bookings, filters]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('booking_lr')
        .select('*')
        .eq('lr_status', 'In Transit')
        .order('lr_date', { ascending: false });

      if (profile?.role === 'user' && profile?.branch_code) {
        query = query.eq('booking_branch', profile.branch_code);
      }

      const { data, error } = await query;

      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      alert('Failed to load truck arrivals. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...bookings];

    if (filters.fromDate) {
      filtered = filtered.filter(
        (item) => new Date(item.lr_date) >= new Date(filters.fromDate)
      );
    }

    if (filters.toDate) {
      filtered = filtered.filter(
        (item) => new Date(item.lr_date) <= new Date(filters.toDate)
      );
    }

    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.manual_lr_no?.toLowerCase().includes(searchLower) ||
          item.vehicle_number?.toLowerCase().includes(searchLower) ||
          item.driver_name?.toLowerCase().includes(searchLower) ||
          item.consignor?.toLowerCase().includes(searchLower) ||
          item.consignee?.toLowerCase().includes(searchLower) ||
          item.from_city?.toLowerCase().includes(searchLower) ||
          item.to_city?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredBookings(filtered);
  };

  const handleUploadPOD = (booking: BookingLR) => {
    setSelectedBooking(booking);
    setShowUploadModal(true);
  };

  const handlePODUploaded = () => {
    setShowUploadModal(false);
    setSelectedBooking(null);
    fetchBookings();
  };

  const isOverdue = (estDelDate: string) => {
    if (!estDelDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const estDate = new Date(estDelDate);
    estDate.setHours(0, 0, 0, 0);
    return estDate < today;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Truck className="w-8 h-8 text-red-600" />
          <h1 className="text-2xl font-bold text-gray-900">Truck Arrival</h1>
        </div>
        <div className="text-sm text-gray-600">
          {filteredBookings.length} trucks in transit
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
        <div className="flex items-center gap-2 text-gray-700 mb-4">
          <Filter className="w-5 h-5" />
          <h2 className="text-lg font-semibold">Filters</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              From Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={filters.fromDate}
                onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              To Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={filters.toDate}
                onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="LR No, Vehicle, Driver, City..."
                value={filters.searchTerm}
                onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <p className="text-sm text-gray-600">
            Showing {filteredBookings.length} of {bookings.length} records
          </p>
          <button
            onClick={() =>
              setFilters({
                searchTerm: '',
                fromDate: '',
                toDate: '',
              })
            }
            className="text-sm text-red-600 hover:text-red-700 font-medium"
          >
            Clear Filters
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {filteredBookings.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <Truck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No trucks in transit</p>
            <p className="text-gray-400 text-sm mt-2">
              All trucks have either been delivered or are yet to be dispatched
            </p>
          </div>
        ) : (
          filteredBookings.map((booking) => (
            <div
              key={booking.tran_id}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-900">
                        {booking.manual_lr_no}
                      </h3>
                      {booking.pod_upload ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                          <CheckCircle className="w-3 h-3" />
                          POD Uploaded
                        </span>
                      ) : isOverdue(booking.est_del_date) ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded-full">
                          Overdue
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                          In Transit
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      LR Date: {booking.lr_date ? new Date(booking.lr_date).toLocaleDateString('en-IN') : '-'}
                    </p>
                  </div>
                  <button
                    onClick={() => handleUploadPOD(booking)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    {booking.pod_upload ? 'Update POD' : 'Upload POD'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                      Route
                    </h4>
                    <p className="text-sm font-medium text-gray-900">
                      {booking.from_city} → {booking.to_city}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      Branch: {booking.booking_branch}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                      Vehicle Details
                    </h4>
                    <p className="text-sm font-medium text-gray-900">
                      {booking.vehicle_number || 'Not assigned'}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {booking.vehicle_type || '-'}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                      Driver
                    </h4>
                    <p className="text-sm font-medium text-gray-900">
                      {booking.driver_name || 'Not assigned'}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {booking.driver_mobile || '-'}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                      Delivery
                    </h4>
                    <p className="text-sm font-medium text-gray-900">
                      Expected: {booking.est_del_date ? new Date(booking.est_del_date).toLocaleDateString('en-IN') : '-'}
                    </p>
                    {booking.act_del_date && (
                      <p className="text-xs text-green-600 mt-1">
                        Actual: {new Date(booking.act_del_date).toLocaleDateString('en-IN')}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4 pt-4 border-t border-gray-200">
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">
                      Consignor
                    </h4>
                    <p className="text-sm text-gray-900">{booking.consignor || '-'}</p>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">
                      Consignee
                    </h4>
                    <p className="text-sm text-gray-900">{booking.consignee || '-'}</p>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">
                      Shipment Details
                    </h4>
                    <p className="text-sm text-gray-900">
                      {booking.no_of_pkgs || 0} Pkgs, {booking.chrg_wt || 0} Kg
                    </p>
                  </div>
                </div>

                {booking.pod_upload && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">
                          POD Details
                        </h4>
                        <p className="text-sm text-gray-900">
                          Received: {booking.pod_recd_date ? new Date(booking.pod_recd_date).toLocaleDateString('en-IN') : '-'}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          Type: {booking.pod_recd_type || '-'}
                        </p>
                      </div>
                      <a
                        href={booking.pod_upload}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-red-600 hover:text-red-700 font-medium"
                      >
                        View POD
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {showUploadModal && selectedBooking && (
        <UploadPODModal
          booking={selectedBooking}
          onClose={() => {
            setShowUploadModal(false);
            setSelectedBooking(null);
          }}
          onSuccess={handlePODUploaded}
        />
      )}
    </div>
  );
}
