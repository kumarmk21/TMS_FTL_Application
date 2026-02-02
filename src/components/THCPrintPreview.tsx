import { useState, useEffect } from 'react';
import { X, Printer, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface THCPrintPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  thcId: string;
}

interface THCDetails {
  thc_id_number: string;
  thc_number: string;
  thc_date: string;
  thc_entry_date: string;
  vehicle_number: string;
  driver_number: string;
  lr_number: string;
  ft_trip_id: string;
  thc_amount: number;
  thc_loading_charges: number;
  thc_detention_charges: number;
  thc_gross_amount: number;
  thc_advance_amount: number;
  thc_tds_amount: number;
  thc_net_payable_amount: number;
  thc_balance_amount: number;
  ven_act_name: string;
  ven_act_number: string;
  ven_act_bank: string;
  ven_act_ifsc: string;
  ven_act_branch: string;
  ath_voucher_no: string;
  origin: string;
  destination: string;
  vehicle_type: string;
  vendor_master?: {
    vendor_name: string;
    vendor_code: string;
    tds_applicable: string;
    tds_rate: number;
  };
  booking_lr?: {
    manual_lr_no: string;
    from_city: string;
    to_city: string;
    consignor: string;
    consignee: string;
    no_of_pkgs: number;
    act_wt: number;
  };
}

export function THCPrintPreview({ isOpen, onClose, thcId }: THCPrintPreviewProps) {
  const [loading, setLoading] = useState(true);
  const [thcDetails, setThcDetails] = useState<THCDetails | null>(null);

  useEffect(() => {
    if (isOpen && thcId) {
      fetchTHCDetails();
    }
  }, [isOpen, thcId]);

  const fetchTHCDetails = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('thc_details')
        .select(`
          *,
          vendor_master:thc_vendor (
            vendor_name,
            vendor_code,
            tds_applicable,
            tds_rate
          ),
          booking_lr:tran_id (
            manual_lr_no,
            from_city,
            to_city,
            consignor,
            consignee,
            no_of_pkgs,
            act_wt
          )
        `)
        .eq('thc_id', thcId)
        .single();

      if (error) throw error;
      setThcDetails(data);
    } catch (error: any) {
      console.error('Error fetching THC details:', error);
      alert(error.message || 'Failed to fetch THC details');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const originalTitle = document.title;
    if (thcDetails?.vendor_master?.vendor_code && thcDetails?.thc_number) {
      document.title = `${thcDetails.vendor_master.vendor_code}_${thcDetails.thc_number}`;
    }
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 100);
  };

  if (!isOpen) return null;

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-IN');
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return '₹0.00';
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between print:hidden">
          <h2 className="text-xl font-bold text-gray-900">THC Print Preview</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
          </div>
        ) : thcDetails ? (
          <div className="p-8 print:p-6">
            <div className="border-2 border-gray-800 p-6">
              <div className="text-center mb-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">TRUCK HIRE CHALLAN</h1>
                <p className="text-sm text-gray-600">THC ID: {thcDetails.thc_id_number}</p>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="space-y-3">
                  <div className="flex border-b border-gray-300 pb-2">
                    <span className="font-semibold text-gray-700 w-40">THC Number:</span>
                    <span className="text-gray-900">{thcDetails.thc_number}</span>
                  </div>
                  <div className="flex border-b border-gray-300 pb-2">
                    <span className="font-semibold text-gray-700 w-40">THC Date:</span>
                    <span className="text-gray-900">{formatDate(thcDetails.thc_date)}</span>
                  </div>
                  <div className="flex border-b border-gray-300 pb-2">
                    <span className="font-semibold text-gray-700 w-40">LR Number:</span>
                    <span className="text-gray-900">{thcDetails.lr_number || '-'}</span>
                  </div>
                  <div className="flex border-b border-gray-300 pb-2">
                    <span className="font-semibold text-gray-700 w-40">Vehicle Number:</span>
                    <span className="text-gray-900 font-medium">{thcDetails.vehicle_number}</span>
                  </div>
                  <div className="flex border-b border-gray-300 pb-2">
                    <span className="font-semibold text-gray-700 w-40">Driver Number:</span>
                    <span className="text-gray-900">{thcDetails.driver_number || '-'}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex border-b border-gray-300 pb-2">
                    <span className="font-semibold text-gray-700 w-40">Vendor Name:</span>
                    <span className="text-gray-900">{thcDetails.vendor_master?.vendor_name || '-'}</span>
                  </div>
                  <div className="flex border-b border-gray-300 pb-2">
                    <span className="font-semibold text-gray-700 w-40">Vendor Code:</span>
                    <span className="text-gray-900">{thcDetails.vendor_master?.vendor_code || '-'}</span>
                  </div>
                  <div className="flex border-b border-gray-300 pb-2">
                    <span className="font-semibold text-gray-700 w-40">FT Trip ID:</span>
                    <span className="text-gray-900">{thcDetails.ft_trip_id || '-'}</span>
                  </div>
                  <div className="flex border-b border-gray-300 pb-2">
                    <span className="font-semibold text-gray-700 w-40">Origin:</span>
                    <span className="text-gray-900">{thcDetails.booking_lr?.from_city || '-'}</span>
                  </div>
                  <div className="flex border-b border-gray-300 pb-2">
                    <span className="font-semibold text-gray-700 w-40">Destination:</span>
                    <span className="text-gray-900">{thcDetails.booking_lr?.to_city || '-'}</span>
                  </div>
                </div>
              </div>

              {thcDetails.booking_lr && (
                <div className="mb-6 border-t border-gray-300 pt-4">
                  <h3 className="font-bold text-gray-900 mb-3">Consignment Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex">
                      <span className="font-semibold text-gray-700 w-40">Consignor:</span>
                      <span className="text-gray-900">{thcDetails.booking_lr.consignor || '-'}</span>
                    </div>
                    <div className="flex">
                      <span className="font-semibold text-gray-700 w-40">Consignee:</span>
                      <span className="text-gray-900">{thcDetails.booking_lr.consignee || '-'}</span>
                    </div>
                    <div className="flex">
                      <span className="font-semibold text-gray-700 w-40">No. of Packages:</span>
                      <span className="text-gray-900">{thcDetails.booking_lr.no_of_pkgs || 0}</span>
                    </div>
                    <div className="flex">
                      <span className="font-semibold text-gray-700 w-40">Actual Weight:</span>
                      <span className="text-gray-900">{thcDetails.booking_lr.act_wt || 0} kg</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="mb-6 border-t border-gray-300 pt-4">
                <h3 className="font-bold text-gray-900 mb-3">Amount Details</h3>
                <table className="w-full border-collapse">
                  <tbody>
                    <tr className="border-b border-gray-300">
                      <td className="py-2 font-semibold text-gray-700">THC Amount</td>
                      <td className="py-2 text-right text-gray-900">{formatCurrency(thcDetails.thc_amount)}</td>
                    </tr>
                    <tr className="border-b border-gray-300">
                      <td className="py-2 font-semibold text-gray-700">Loading Charges</td>
                      <td className="py-2 text-right text-gray-900">{formatCurrency(thcDetails.thc_loading_charges)}</td>
                    </tr>
                    <tr className="border-b border-gray-300">
                      <td className="py-2 font-semibold text-gray-700">Detention Charges</td>
                      <td className="py-2 text-right text-gray-900">{formatCurrency(thcDetails.thc_detention_charges)}</td>
                    </tr>
                    <tr className="border-b-2 border-gray-800">
                      <td className="py-2 font-bold text-gray-900">Gross Amount</td>
                      <td className="py-2 text-right font-bold text-gray-900">{formatCurrency(thcDetails.thc_gross_amount)}</td>
                    </tr>
                    <tr className="border-b border-gray-300">
                      <td className="py-2 font-semibold text-gray-700">Advance Amount</td>
                      <td className="py-2 text-right text-gray-900">{formatCurrency(thcDetails.thc_advance_amount)}</td>
                    </tr>
                    <tr className="border-b border-gray-300">
                      <td className="py-2 font-semibold text-gray-700">
                        TDS Amount
                        {thcDetails.vendor_master?.tds_applicable === 'Y' && (
                          <span className="text-xs text-gray-600 ml-2">
                            @ {thcDetails.vendor_master.tds_rate}%
                          </span>
                        )}
                      </td>
                      <td className="py-2 text-right text-gray-900">{formatCurrency(thcDetails.thc_tds_amount)}</td>
                    </tr>
                    <tr className="border-b-2 border-gray-800 bg-green-50">
                      <td className="py-2 font-bold text-green-700">Net Payable Amount</td>
                      <td className="py-2 text-right font-bold text-green-700 text-lg">
                        {formatCurrency(thcDetails.thc_net_payable_amount)}
                      </td>
                    </tr>
                    <tr className="bg-red-50">
                      <td className="py-2 font-bold text-red-700">Balance Amount</td>
                      <td className="py-2 text-right font-bold text-red-700 text-lg">
                        {formatCurrency(thcDetails.thc_balance_amount)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {thcDetails.ven_act_name && (
                <div className="border-t border-gray-300 pt-4">
                  <h3 className="font-bold text-gray-900 mb-3">Bank Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex">
                      <span className="font-semibold text-gray-700 w-40">Account Name:</span>
                      <span className="text-gray-900">{thcDetails.ven_act_name}</span>
                    </div>
                    <div className="flex">
                      <span className="font-semibold text-gray-700 w-40">Account Number:</span>
                      <span className="text-gray-900">{thcDetails.ven_act_number || '-'}</span>
                    </div>
                    <div className="flex">
                      <span className="font-semibold text-gray-700 w-40">Bank Name:</span>
                      <span className="text-gray-900">{thcDetails.ven_act_bank || '-'}</span>
                    </div>
                    <div className="flex">
                      <span className="font-semibold text-gray-700 w-40">IFSC Code:</span>
                      <span className="text-gray-900">{thcDetails.ven_act_ifsc || '-'}</span>
                    </div>
                    <div className="flex">
                      <span className="font-semibold text-gray-700 w-40">Branch:</span>
                      <span className="text-gray-900">{thcDetails.ven_act_branch || '-'}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-12 pt-6 border-t border-gray-300">
                <div className="grid grid-cols-3 gap-8">
                  <div className="text-center">
                    <div className="border-t border-gray-800 pt-2 mt-12">
                      <p className="font-semibold text-gray-700">Prepared By</p>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="border-t border-gray-800 pt-2 mt-12">
                      <p className="font-semibold text-gray-700">Verified By</p>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="border-t border-gray-800 pt-2 mt-12">
                      <p className="font-semibold text-gray-700">Authorized Signature</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 text-center text-xs text-gray-500 print:block">
              Generated on {new Date().toLocaleDateString('en-IN')} at {new Date().toLocaleTimeString('en-IN')}
            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-gray-500">
            No THC details found
          </div>
        )}
      </div>
    </div>
  );
}
