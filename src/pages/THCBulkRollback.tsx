import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { FileX, AlertTriangle, Trash2, RefreshCw } from 'lucide-react';

interface UploadBatch {
  created_by: string;
  upload_date: string;
  record_count: number;
  first_record: string;
  last_record: string;
  user_email?: string;
}

export default function THCBulkRollback() {
  const [batches, setBatches] = useState<UploadBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_thc_upload_batches');

      if (error) throw error;

      if (data) {
        const batchesWithUsers = await Promise.all(
          data.map(async (batch: UploadBatch) => {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('email')
              .eq('id', batch.created_by)
              .maybeSingle();

            return {
              ...batch,
              user_email: profileData?.email || 'Unknown User'
            };
          })
        );
        setBatches(batchesWithUsers);
      }
    } catch (error: any) {
      console.error('Error fetching batches:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRollback = async (batch: UploadBatch) => {
    if (!confirm(
      `Are you sure you want to delete ${batch.record_count} THC records?\n\n` +
      `Upload Date: ${new Date(batch.upload_date).toLocaleDateString()}\n` +
      `Time: ${new Date(batch.first_record).toLocaleTimeString()} - ${new Date(batch.last_record).toLocaleTimeString()}\n\n` +
      `This action cannot be undone!`
    )) {
      return;
    }

    setDeleting(batch.first_record);
    try {
      const { error } = await supabase
        .from('thc_details')
        .delete()
        .eq('created_by', batch.created_by)
        .gte('created_at', batch.first_record)
        .lte('created_at', batch.last_record);

      if (error) throw error;

      alert(`Successfully deleted ${batch.record_count} THC records`);
      fetchBatches();
    } catch (error: any) {
      console.error('Error rolling back:', error);
      alert('Error rolling back upload: ' + error.message);
    } finally {
      setDeleting(null);
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">THC Bulk Upload Rollback</h1>
          <p className="mt-1 text-sm text-gray-600">
            Delete bulk uploaded THC records
          </p>
        </div>
        <button
          onClick={fetchBatches}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-yellow-900">Warning</h3>
            <p className="text-sm text-yellow-800 mt-1">
              Rollback will permanently delete THC records. This action cannot be undone.
              Only delete records if you are certain they need to be removed.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <RefreshCw className="h-8 w-8 text-blue-600 animate-spin" />
        </div>
      ) : batches.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <FileX className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No recent bulk uploads found in the last 7 days</p>
        </div>
      ) : (
        <div className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Upload Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Uploaded By
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time Range
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Records
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {batches.map((batch) => (
                <tr key={batch.first_record} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(batch.upload_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {batch.user_email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    <div className="flex flex-col">
                      <span>{formatDateTime(batch.first_record)}</span>
                      <span className="text-xs text-gray-500">to {formatDateTime(batch.last_record)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-3 py-1 text-sm font-medium text-blue-800 bg-blue-100 rounded-full">
                      {batch.record_count} records
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <button
                      onClick={() => handleRollback(batch)}
                      disabled={deleting !== null}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                    >
                      {deleting === batch.first_record ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4" />
                          Delete Batch
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
