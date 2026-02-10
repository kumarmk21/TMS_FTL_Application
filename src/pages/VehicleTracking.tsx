import { useState, useEffect } from 'react';
import { MapPin, RefreshCw, Plus, Navigation, Clock, Truck, Package } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface LRWithLocation {
  tran_id: string;
  manual_lr_no: string;
  lr_date: string;
  vehicle_number: string;
  driver_number: string;
  driver_name: string;
  from_city: string;
  to_city: string;
  booking_branch: string;
  lr_status: string;
  consignor: string;
  consignee: string;
  no_of_pkgs: number;
  latest_location?: {
    latitude: number;
    longitude: number;
    location_time: string;
    speed: number;
  };
  trip_id?: string;
  trip_status?: string;
}

export function VehicleTracking() {
  const { profile } = useAuth();
  const [lrEntries, setLrEntries] = useState<LRWithLocation[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<LRWithLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshingLR, setRefreshingLR] = useState<string | null>(null);
  const [addingTrip, setAddingTrip] = useState<string | null>(null);

  useEffect(() => {
    fetchLREntries();
  }, [profile]);

  useEffect(() => {
    filterEntries();
  }, [searchTerm, lrEntries]);

  const fetchLREntries = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('booking_lr')
        .select('*')
        .in('lr_status', ['In Transit', 'Dispatched', 'Out for Delivery'])
        .order('lr_date', { ascending: false });

      if (profile?.role === 'user' && profile?.branch_code) {
        query = query.eq('booking_branch', profile.branch_code);
      }

      const { data: lrs, error } = await query;

      if (error) throw error;

      const lrsWithLocations = await Promise.all(
        (lrs || []).map(async (lr) => {
          const { data: location } = await supabase
            .from('vehicle_locations')
            .select('latitude, longitude, location_time, speed')
            .eq('driver_number', lr.driver_number)
            .order('location_time', { ascending: false })
            .limit(1)
            .maybeSingle();

          const { data: trip } = await supabase
            .from('freight_tiger_trips')
            .select('trip_id, status')
            .eq('lr_id', lr.tran_id)
            .maybeSingle();

          return {
            ...lr,
            latest_location: location || undefined,
            trip_id: trip?.trip_id,
            trip_status: trip?.status,
          };
        })
      );

      setLrEntries(lrsWithLocations);
    } catch (error: any) {
      console.error('Error fetching LR entries:', error);
      alert(`Failed to fetch LR entries: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const filterEntries = () => {
    if (!searchTerm.trim()) {
      setFilteredEntries(lrEntries);
      return;
    }

    const filtered = lrEntries.filter((lr) =>
      lr.manual_lr_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lr.vehicle_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lr.driver_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lr.from_city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lr.to_city?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    setFilteredEntries(filtered);
  };

  const refreshLocation = async (lr: LRWithLocation) => {
    try {
      setRefreshingLR(lr.tran_id);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session. Please login again.');
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-location-by-trip-id?lr_id=${encodeURIComponent(lr.tran_id)}`;

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
      });

      console.log('Refresh Location Response Status:', response.status);

      const result = await response.json();
      console.log('Refresh Location Response:', result);

      if (!response.ok) {
        const errorMsg = result.details || result.error || 'Failed to refresh location';
        console.error('Refresh Location Error:', {
          status: response.status,
          error: errorMsg,
          fullResponse: result
        });
        throw new Error(`[${response.status}] ${errorMsg}`);
      }

      console.log('Full API Response:', result);
      console.log('Raw FreightTiger Data:', result.raw_data);

      if (result.errors && result.errors.length > 0) {
        console.error('DATABASE SAVE ERRORS:', result.errors);
        result.errors.forEach((err: any, idx: number) => {
          console.error(`Error ${idx + 1}:`, err);
        });
      }

      if (result.success) {
        const msg = `Location refreshed successfully!\n\nFT Trip ID: ${result.ft_trip_id || 'N/A'}\nTrips Found: ${result.trips_found || 0}\nTrips Saved: ${result.trips_saved || 0}\nLocations Saved: ${result.locations_saved || 0}\n\nPlease check browser console for detailed FreightTiger response.`;
        alert(msg);
        await fetchLREntries();
      } else {
        const errorMsg = result.message || result.error || 'Failed to refresh location';
        console.error('FreightTiger Response:', result.raw_response);
        alert(`${errorMsg}\n\nCheck browser console for full response details.`);
      }
    } catch (error: any) {
      console.error('Error refreshing location:', error);
      alert(`Failed to refresh location:\n\n${error.message}\n\nLR: ${lr.manual_lr_no || 'N/A'}`);
    } finally {
      setRefreshingLR(null);
    }
  };

  const addTripToFreightTiger = async (lr: LRWithLocation) => {
    try {
      setAddingTrip(lr.tran_id);

      if (!lr.driver_number || !lr.vehicle_number) {
        throw new Error('Driver number and vehicle number are required for trip tracking');
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session. Please login again.');
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/add-freight-tiger-trip`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lr_id: lr.tran_id,
          use_production: true,
        }),
      });

      const result = await response.json();

      console.log('FreightTiger API Response:', result);

      if (!response.ok) {
        console.error('FreightTiger API Error Response:', result);

        let errorMsg = 'Failed to add trip to FreightTiger';
        if (result.details) {
          errorMsg = result.details;
        } else if (result.error) {
          errorMsg = result.error;
        }

        if (result.raw_response) {
          console.error('Raw FreightTiger Response:', result.raw_response);
        }

        const fullError = `${errorMsg}\n\nStatus: ${result.status_code || response.status}\nLR: ${lr.manual_lr_no}\nDriver: ${lr.driver_number}\nVehicle: ${lr.vehicle_number}`;

        throw new Error(fullError);
      }

      if (result.success) {
        alert('Trip added to FreightTiger successfully!');
        await fetchLREntries();
      } else {
        console.error('FreightTiger Error:', result);

        let errorMsg = 'Failed to add trip to FreightTiger';
        if (result.details) {
          errorMsg = result.details;
        } else if (result.error) {
          errorMsg = result.error;
        }

        const fullError = `${errorMsg}\n\nLR: ${lr.manual_lr_no}\nDriver: ${lr.driver_number}\nVehicle: ${lr.vehicle_number}`;

        throw new Error(fullError);
      }
    } catch (error: any) {
      console.error('Error adding trip to FreightTiger:', error);
      console.error('LR Details:', {
        lr_number: lr.manual_lr_no,
        driver: lr.driver_number,
        vehicle: lr.vehicle_number,
        from: lr.from_city,
        to: lr.to_city
      });

      alert(`Failed to add trip to FreightTiger:\n\n${error.message}`);
    } finally {
      setAddingTrip(null);
    }
  };

  const openGoogleMaps = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  };

  const getTimeSinceUpdate = (locationTime: string) => {
    const now = new Date();
    const then = new Date(locationTime);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 60) {
      return `${diffMins} mins ago`;
    } else if (diffMins < 1440) {
      return `${Math.floor(diffMins / 60)} hours ago`;
    } else {
      return `${Math.floor(diffMins / 1440)} days ago`;
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Navigation className="h-6 w-6 text-blue-600" />
          Vehicle Tracking Control Tower
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Real-time vehicle location tracking powered by FreightTiger GPS
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6 p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by LR No, Vehicle No, Driver No, Origin, Destination..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={fetchLREntries}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh All
          </button>
        </div>
        <div className="mt-3 flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>Location Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
            <span>No Location Data</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span>FreightTiger Active</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading vehicle tracking data...</p>
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <Navigation className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No active shipments found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredEntries.map((lr) => (
            <div
              key={lr.tran_id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {lr.manual_lr_no}
                    </h3>
                    {lr.latest_location && (
                      <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    )}
                    {lr.trip_id && (
                      <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
                        FT Active
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    {new Date(lr.lr_date).toLocaleDateString()}
                  </p>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded ${
                  lr.lr_status === 'In Transit' ? 'bg-yellow-100 text-yellow-700' :
                  lr.lr_status === 'Dispatched' ? 'bg-blue-100 text-blue-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  {lr.lr_status}
                </span>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-3 text-sm">
                  <Truck className="h-4 w-4 text-gray-400" />
                  <div className="flex-1">
                    <span className="font-medium text-gray-900">{lr.vehicle_number}</span>
                    <span className="text-gray-500 ml-2">• {lr.driver_name || lr.driver_number}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <Package className="h-4 w-4 text-gray-400" />
                  <div className="flex-1">
                    <span className="text-gray-700">{lr.from_city}</span>
                    <span className="mx-2 text-gray-400">→</span>
                    <span className="text-gray-700">{lr.to_city}</span>
                  </div>
                </div>

                {lr.latest_location ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-green-600 mt-0.5" />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-green-900 mb-1">
                          Location Available
                        </div>
                        <div className="text-xs text-green-700 space-y-1">
                          <div>
                            Lat: {lr.latest_location.latitude.toFixed(6)},
                            Lng: {lr.latest_location.longitude.toFixed(6)}
                          </div>
                          {lr.latest_location.speed && (
                            <div>Speed: {lr.latest_location.speed} km/h</div>
                          )}
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {getTimeSinceUpdate(lr.latest_location.location_time)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="h-4 w-4" />
                      <span>No location data available</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-3 border-t border-gray-200">
                {lr.latest_location && (
                  <button
                    onClick={() => openGoogleMaps(lr.latest_location!.latitude, lr.latest_location!.longitude)}
                    className="flex-1 px-3 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 flex items-center justify-center gap-2"
                  >
                    <MapPin className="h-4 w-4" />
                    View on Map
                  </button>
                )}
                <button
                  onClick={() => refreshLocation(lr)}
                  disabled={refreshingLR === lr.tran_id}
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50 disabled:bg-gray-100 flex items-center justify-center gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshingLR === lr.tran_id ? 'animate-spin' : ''}`} />
                  {refreshingLR === lr.tran_id ? 'Refreshing...' : 'Refresh'}
                </button>
                {!lr.trip_id && (
                  <button
                    onClick={() => addTripToFreightTiger(lr)}
                    disabled={addingTrip === lr.tran_id}
                    className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-400 flex items-center justify-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    {addingTrip === lr.tran_id ? 'Adding...' : 'Add to FT'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
