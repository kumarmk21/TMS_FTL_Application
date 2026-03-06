import { useState, useEffect } from 'react';
import { Search, Plus, CreditCard as Edit2, Trash2, X, Upload, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import * as XLSX from 'xlsx';

interface Branch {
  id: string;
  branch_name: string;
  branch_code: string;
}

interface City {
  id: string;
  city_name: string;
  state: string;
}

interface VehicleType {
  id: string;
  vehicle_type: string;
  vehicle_code: string;
}

interface Customer {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_email: string;
  lr_mail_id: string;
  group_id: string;
}

interface OrderEnquiry {
  id: string;
  enq_id: string;
  entry_date: string;
  customer_id: string;
  origin_id: string;
  destination_id: string;
  vehicle_type_id: string;
  vehicle_number: string;
  driver_number: string;
  lr_number: string | null;
  customer_master: {
    customer_name: string;
  };
  origin: {
    city_name: string;
  };
  destination: {
    city_name: string;
  };
  vehicle_type: {
    vehicle_type: string;
  };
}

interface LREntry {
  tran_id: string;
  lr_no_type: 'system_generated' | 'pre_printed';
  manual_lr_no: string;
  lr_date: string;
  booking_branch: string;
  from_city: string;
  to_city: string;
  est_del_date: string;
  pay_basis: string;
  booking_type: string;
  product: string;
  consignor: string;
  consignee: string;
  no_of_pkgs: number;
  act_wt: number;
  chrg_wt: number;
  invoice_number: string;
  invoice_date: string;
  invoice_value: number;
  eway_bill_number: string;
  eway_bill_exp_date: string;
  vehicle_number: string;
  driver_number: string;
  driver_name: string;
  vehicle_type: string;
  seal_no: string;
  billing_party_id: string;
  billing_party_name: string;
  lr_email_id: string;
  customer_email_id: string;
  group_id: string;
  created_at: string;
}

export function LREntry() {
  const { profile } = useAuth();
  const [lrEntries, setLrEntries] = useState<LREntry[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orderEnquiries, setOrderEnquiries] = useState<OrderEnquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingLR, setEditingLR] = useState<LREntry | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [enquirySearchTerm, setEnquirySearchTerm] = useState('');
  const [showEnquiryDropdown, setShowEnquiryDropdown] = useState(false);
  const [nextLRNumber, setNextLRNumber] = useState<string>('');


  const [formData, setFormData] = useState({
    lr_no_type: 'system_generated' as 'system_generated' | 'pre_printed',
    manual_lr_no: '',
    enquiry_id: '',
    enquiry_date: '',
    lr_date: new Date().toISOString().split('T')[0],
    booking_branch: '',
    origin_id: '',
    destination_id: '',
    from_city: '',
    to_city: '',
    est_del_date: '',
    pay_basis: '',
    booking_type: '',
    product: '',
    consignor: '',
    consignee: '',
    no_of_pkgs: 0,
    act_wt: 0,
    chrg_wt: 0,
    invoice_number: '',
    invoice_date: '',
    invoice_value: 0,
    eway_bill_number: '',
    eway_bill_exp_date: '',
    vehicle_number: '',
    driver_number: '',
    driver_name: '',
    vehicle_type: '',
    seal_no: '',
    billing_party_id: '',
    lr_email_id: '',
    customer_email_id: '',
    group_id: '',
  });

  useEffect(() => {
    fetchLREntries();
    fetchBranches();
    fetchCities();
    fetchVehicleTypes();
    fetchCustomers();
    fetchOrderEnquiries();
  }, [profile?.branch_code]);

  const fetchLREntries = async () => {
    try {
      const query = supabase
        .from('booking_lr')
        .select('*')
        .order('created_at', { ascending: false });

      if (profile?.role === 'user' && profile?.branch_code) {
        query.eq('booking_branch', profile.branch_code);
      }

      const { data, error } = await query;
      if (error) throw error;
      setLrEntries(data || []);
    } catch (error) {
      console.error('Error fetching LR entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const { data, error } = await supabase
        .from('branch_master')
        .select('*')
        .eq('is_active', true)
        .order('branch_name');

      if (error) throw error;
      setBranches(data || []);
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  const fetchCities = async () => {
    try {
      const { data, error } = await supabase
        .from('city_master')
        .select('*')
        .order('city_name');

      if (error) throw error;
      setCities(data || []);
    } catch (error) {
      console.error('Error fetching cities:', error);
    }
  };

  const fetchVehicleTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('vehicle_master')
        .select('*')
        .eq('is_active', true)
        .order('vehicle_type');

      if (error) throw error;
      setVehicleTypes(data || []);
    } catch (error) {
      console.error('Error fetching vehicle types:', error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customer_master')
        .select('*')
        .eq('is_active', true)
        .order('customer_name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchNextLRNumber = async () => {
    try {
      const { data, error } = await supabase.rpc('generate_lr_number');

      if (error) throw error;
      setNextLRNumber(data || '');
    } catch (error) {
      console.error('Error fetching next LR number:', error);
      setNextLRNumber('');
    }
  };

  const fetchOrderEnquiries = async () => {
    try {
      const { data, error } = await supabase
        .from('order_enquiry')
        .select(`
          *,
          customer_master:customer_id (customer_name),
          origin:origin_id (city_name),
          destination:destination_id (city_name),
          vehicle_type:vehicle_type_id (vehicle_type)
        `)
        .is('lr_number', null)
        .eq('status', 'Confirmed')
        .order('entry_date', { ascending: false });

      if (error) throw error;
      setOrderEnquiries(data || []);
    } catch (error) {
      console.error('Error fetching order enquiries:', error);
    }
  };

  const handleEnquirySelect = (enquiryId: string) => {
    const enquiry = orderEnquiries.find((e) => e.id === enquiryId);
    if (enquiry) {
      const customer = customers.find((c) => c.id === enquiry.customer_id);
      setFormData({
        ...formData,
        enquiry_id: enquiryId,
        enquiry_date: enquiry.entry_date ? new Date(enquiry.entry_date).toISOString().split('T')[0] : '',
        billing_party_id: enquiry.customer_id,
        origin_id: enquiry.origin_id,
        destination_id: enquiry.destination_id,
        from_city: enquiry.origin.city_name,
        to_city: enquiry.destination.city_name,
        vehicle_type: enquiry.vehicle_type.vehicle_type,
        vehicle_number: enquiry.vehicle_number || '',
        driver_number: enquiry.driver_number || '',
        lr_email_id: customer?.lr_mail_id || '',
        customer_email_id: customer?.customer_email || '',
        group_id: customer?.group_id || '',
      });
      setEnquirySearchTerm(enquiry.enq_id);
      setShowEnquiryDropdown(false);
    }
  };

  const handleCustomerSelect = (customerId: string) => {
    const customer = customers.find((c) => c.id === customerId);
    if (customer) {
      setFormData({
        ...formData,
        billing_party_id: customer.id,
        lr_email_id: customer.lr_mail_id || '',
        customer_email_id: customer.customer_email || '',
        group_id: customer.group_id || '',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const billingCustomer = customers.find((c) => c.id === formData.billing_party_id);

      // Fetch statuses from status_master table
      const { data: statusData, error: statusError } = await supabase
        .from('status_master')
        .select('status_name')
        .in('status_name', ['In Transit', 'Booked']);

      if (statusError) {
        console.error('Error fetching statuses:', statusError);
      }

      const inTransitStatus = statusData?.find(s => s.status_name === 'In Transit')?.status_name || 'In Transit';
      const bookedStatus = statusData?.find(s => s.status_name === 'Booked')?.status_name || 'Booked';

      const lrData: any = {
        lr_no_type: formData.lr_no_type,
        enquiry_id: formData.enquiry_id || null,
        enquiry_date: formData.enquiry_date || null,
        entry_datetime: new Date().toISOString(),
        lr_date: formData.lr_date,
        booking_branch: formData.booking_branch,
        origin_id: formData.origin_id || null,
        destination_id: formData.destination_id || null,
        from_city: formData.from_city,
        to_city: formData.to_city,
        est_del_date: formData.est_del_date,
        pay_basis: formData.pay_basis,
        booking_type: formData.booking_type,
        product: formData.product,
        consignor: formData.consignor,
        consignee: formData.consignee,
        no_of_pkgs: formData.no_of_pkgs,
        act_wt: formData.act_wt,
        chrg_wt: formData.chrg_wt,
        invoice_number: formData.invoice_number,
        invoice_date: formData.invoice_date,
        invoice_value: formData.invoice_value,
        eway_bill_number: formData.eway_bill_number,
        eway_bill_exp_date: formData.eway_bill_exp_date,
        vehicle_number: formData.vehicle_number.toUpperCase().replace(/\s/g, ''),
        driver_number: formData.driver_number,
        driver_name: formData.driver_name,
        vehicle_type: formData.vehicle_type,
        seal_no: formData.seal_no,
        billing_party_id: formData.billing_party_id,
        billing_party_code: billingCustomer?.customer_id || null,
        billing_party_name: billingCustomer?.customer_name || null,
        lr_email_id: formData.lr_email_id,
        customer_email_id: formData.customer_email_id,
        group_id: formData.group_id,
        lr_status: inTransitStatus,
        lr_financial_status: bookedStatus,
        created_by: profile?.id || null,
      };

      if (formData.lr_no_type === 'pre_printed') {
        lrData.manual_lr_no = formData.manual_lr_no;
      }

      if (editingLR) {
        const { error } = await supabase
          .from('booking_lr')
          .update(lrData)
          .eq('tran_id', editingLR.tran_id);

        if (error) throw error;
        alert('LR Entry updated successfully!');
      } else {
        const { data: insertedLR, error } = await supabase
          .from('booking_lr')
          .insert([lrData])
          .select('manual_lr_no')
          .single();

        if (error) throw error;

        if (formData.enquiry_id && insertedLR) {
          const { error: updateError } = await supabase
            .from('order_enquiry')
            .update({ lr_number: insertedLR.manual_lr_no })
            .eq('id', formData.enquiry_id);

          if (updateError) {
            console.error('Error updating enquiry with LR number:', updateError);
          }
        }

        alert('LR Entry created successfully!');
      }

      await fetchLREntries();
      await fetchOrderEnquiries();
      resetForm();
      setShowForm(false);
    } catch (error: any) {
      console.error('Error saving LR entry:', error);
      alert(`Failed to save LR entry: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (lr: LREntry) => {
    setEditingLR(lr);
    setFormData({
      lr_no_type: lr.lr_no_type,
      manual_lr_no: lr.manual_lr_no,
      enquiry_id: '',
      lr_date: lr.lr_date,
      booking_branch: lr.booking_branch,
      origin_id: '',
      destination_id: '',
      from_city: lr.from_city,
      est_del_date: lr.est_del_date,
      pay_basis: lr.pay_basis,
      booking_type: lr.booking_type,
      product: lr.product,
      consignor: lr.consignor,
      consignee: lr.consignee,
      no_of_pkgs: lr.no_of_pkgs,
      act_wt: lr.act_wt,
      chrg_wt: lr.chrg_wt,
      invoice_number: lr.invoice_number,
      invoice_date: lr.invoice_date,
      invoice_value: lr.invoice_value,
      eway_bill_number: lr.eway_bill_number,
      eway_bill_exp_date: lr.eway_bill_exp_date,
      vehicle_number: lr.vehicle_number || '',
      driver_number: lr.driver_number || '',
      driver_name: lr.driver_name || '',
      vehicle_type: lr.vehicle_type,
      seal_no: lr.seal_no || '',
      billing_party_id: lr.billing_party_id,
      lr_email_id: lr.lr_email_id || '',
      customer_email_id: lr.customer_email_id || '',
      group_id: lr.group_id || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this LR entry?')) return;

    try {
      const { error } = await supabase
        .from('booking_lr')
        .delete()
        .eq('tran_id', id);

      if (error) throw error;
      await fetchLREntries();
      alert('LR Entry deleted successfully!');
    } catch (error: any) {
      console.error('Error deleting LR entry:', error);
      alert(`Failed to delete LR entry: ${error.message}`);
    }
  };

  const resetForm = async () => {
    setFormData({
      lr_no_type: 'system_generated',
      manual_lr_no: '',
      enquiry_id: '',
      enquiry_date: '',
      lr_date: new Date().toISOString().split('T')[0],
      booking_branch: '',
      origin_id: '',
      destination_id: '',
      from_city: '',
      to_city: '',
      est_del_date: '',
      pay_basis: '',
      booking_type: '',
      product: '',
      consignor: '',
      consignee: '',
      no_of_pkgs: 0,
      act_wt: 0,
      chrg_wt: 0,
      invoice_number: '',
      invoice_date: '',
      invoice_value: 0,
      eway_bill_number: '',
      eway_bill_exp_date: '',
      vehicle_number: '',
      driver_number: '',
      driver_name: '',
      vehicle_type: '',
      seal_no: '',
      billing_party_id: '',
      lr_email_id: '',
      customer_email_id: '',
      group_id: '',
    });
    setEditingLR(null);
    setEnquirySearchTerm('');
    setShowEnquiryDropdown(false);
    await fetchNextLRNumber();
  };

  const filteredLREntries = lrEntries.filter(
    (lr) =>
      lr.manual_lr_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lr.billing_party_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lr.vehicle_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lr.vehicle_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lr.from_city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lr.to_city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const downloadTemplate = () => {
    const template = [
      {
        'LR No Type': 'system_generated',
        'Manual LR No': '',
        'Enquiry ID': '',
        'LR Date': '2026-03-06',
        'Booking Branch': 'BRANCH001',
        'Origin City': 'Mumbai',
        'Destination City': 'Delhi',
        'From City': 'Mumbai',
        'To City': 'Delhi',
        'EDD (Estimated Delivery Date)': '2026-03-10',
        'Pay Basis': 'To Pay',
        'Booking Type': 'Full Truck Load',
        'Product': 'Electronics',
        'Consignor': 'ABC Company',
        'Consignee': 'XYZ Company',
        'No of Packages': '100',
        'Actual Weight': '5000',
        'Chargeable Weight': '5000',
        'Invoice Number': 'INV-2026-001',
        'Invoice Date': '2026-03-05',
        'Invoice Value': '500000',
        'E-way Bill Number': 'EWB123456789012',
        'E-way Bill Expiry Date': '2026-03-08',
        'Vehicle Number': 'MH01AB1234',
        'Driver Number': '9876543210',
        'Driver Name': 'John Doe',
        'Vehicle Type': 'Container 20ft',
        'Seal No': 'SEAL12345',
        'Billing Party Customer ID': 'CUST001',
        'LR Email ID': 'lr@example.com',
        'Customer Email ID': 'customer@example.com',
        'Group ID': 'GROUP001',
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'LR Template');

    const colWidths = [
      { wch: 18 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 15 },
      { wch: 15 }, { wch: 18 }, { wch: 15 }, { wch: 15 }, { wch: 25 },
      { wch: 12 }, { wch: 18 }, { wch: 15 }, { wch: 20 }, { wch: 20 },
      { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 18 }, { wch: 12 },
      { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 15 },
      { wch: 15 }, { wch: 18 }, { wch: 15 }, { wch: 25 }, { wch: 20 },
      { wch: 20 }, { wch: 15 }
    ];
    ws['!cols'] = colWidths;

    XLSX.writeFile(wb, 'LR_Bulk_Upload_Template.xlsx');
  };

  const excelDateToString = (serial: any): string | null => {
    if (!serial) return null;
    if (typeof serial === 'string') {
      if (serial.match(/^\d{4}-\d{2}-\d{2}$/)) return serial;
      return serial;
    }
    if (typeof serial === 'number') {
      const utc_days = Math.floor(serial - 25569);
      const utc_value = utc_days * 86400;
      const date_info = new Date(utc_value * 1000);
      const year = date_info.getUTCFullYear();
      const month = String(date_info.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date_info.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return null;
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;

    const file = e.target.files[0];
    setLoading(true);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      let successCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

      for (let i = 0; i < jsonData.length; i++) {
        const row: any = jsonData[i];
        const rowNumber = i + 2;

        try {
          const branchCode = row['Booking Branch'];
          const originCity = row['Origin City'];
          const destCity = row['Destination City'];
          const billingPartyCustomerId = row['Billing Party Customer ID'];

          const { data: branchData, error: branchError } = await supabase
            .from('branch_master')
            .select('id, branch_code')
            .eq('branch_code', branchCode)
            .maybeSingle();

          if (branchError || !branchData) {
            throw new Error(`Invalid Branch Code: ${branchCode}`);
          }

          const { data: originData, error: originError } = await supabase
            .from('city_master')
            .select('id, city_name')
            .eq('city_name', originCity)
            .maybeSingle();

          if (originError || !originData) {
            throw new Error(`Invalid Origin City: ${originCity}`);
          }

          const { data: destData, error: destError } = await supabase
            .from('city_master')
            .select('id, city_name')
            .eq('city_name', destCity)
            .maybeSingle();

          if (destError || !destData) {
            throw new Error(`Invalid Destination City: ${destCity}`);
          }

          const { data: customerData, error: customerError } = await supabase
            .from('customer_master')
            .select('id, customer_id, customer_name')
            .eq('customer_id', billingPartyCustomerId)
            .maybeSingle();

          if (customerError || !customerData) {
            throw new Error(`Invalid Billing Party Customer ID: ${billingPartyCustomerId}`);
          }

          const { data: statusData, error: statusError } = await supabase
            .from('status_master')
            .select('status_name')
            .in('status_name', ['In Transit', 'Booked']);

          if (statusError) {
            console.error('Error fetching statuses:', statusError);
          }

          const inTransitStatus = statusData?.find(s => s.status_name === 'In Transit')?.status_name || 'In Transit';
          const bookedStatus = statusData?.find(s => s.status_name === 'Booked')?.status_name || 'Booked';

          const lrData: any = {
            lr_no_type: row['LR No Type'] || 'system_generated',
            enquiry_id: row['Enquiry ID'] || null,
            entry_datetime: new Date().toISOString(),
            lr_date: excelDateToString(row['LR Date']),
            booking_branch: branchCode,
            origin_id: originData.id,
            destination_id: destData.id,
            from_city: row['From City'] || originCity,
            to_city: row['To City'] || destCity,
            est_del_date: excelDateToString(row['EDD (Estimated Delivery Date)']),
            pay_basis: row['Pay Basis'] || '',
            booking_type: row['Booking Type'] || '',
            product: row['Product'] || '',
            consignor: row['Consignor'] || '',
            consignee: row['Consignee'] || '',
            no_of_pkgs: row['No of Packages'] ? parseInt(row['No of Packages']) : 0,
            act_wt: row['Actual Weight'] ? parseFloat(row['Actual Weight']) : 0,
            chrg_wt: row['Chargeable Weight'] ? parseFloat(row['Chargeable Weight']) : 0,
            invoice_number: row['Invoice Number'] || '',
            invoice_date: excelDateToString(row['Invoice Date']),
            invoice_value: row['Invoice Value'] ? parseFloat(row['Invoice Value']) : 0,
            eway_bill_number: row['E-way Bill Number'] || '',
            eway_bill_exp_date: excelDateToString(row['E-way Bill Expiry Date']),
            vehicle_number: row['Vehicle Number'] ? row['Vehicle Number'].toUpperCase().replace(/\s/g, '') : '',
            driver_number: row['Driver Number'] || '',
            driver_name: row['Driver Name'] || '',
            vehicle_type: row['Vehicle Type'] || '',
            seal_no: row['Seal No'] || '',
            billing_party_id: customerData.id,
            billing_party_code: customerData.customer_id,
            billing_party_name: customerData.customer_name,
            lr_email_id: row['LR Email ID'] || '',
            customer_email_id: row['Customer Email ID'] || '',
            group_id: row['Group ID'] || '',
            lr_status: inTransitStatus,
            lr_financial_status: bookedStatus,
            created_by: profile?.id || null,
          };

          if (row['LR No Type'] === 'pre_printed' && row['Manual LR No']) {
            lrData.manual_lr_no = row['Manual LR No'];
          }

          const { error: insertError } = await supabase
            .from('booking_lr')
            .insert([lrData]);

          if (insertError) {
            throw new Error(insertError.message);
          }

          successCount++;
        } catch (error: any) {
          failedCount++;
          errors.push(`Row ${rowNumber}: ${error.message}`);
        }
      }

      let message = `Upload Complete!\nSuccess: ${successCount}\nFailed: ${failedCount}`;
      if (errors.length > 0) {
        message += '\n\nErrors:\n' + errors.slice(0, 10).join('\n');
        if (errors.length > 10) {
          message += `\n... and ${errors.length - 10} more errors`;
        }
      }
      alert(message);

      await fetchLREntries();
      e.target.value = '';
    } catch (error: any) {
      console.error('Error processing file:', error);
      alert(`Failed to process file: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">LR Entry</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Download Template
          </button>
          <label className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer">
            <Upload className="w-4 h-4" />
            Bulk Upload
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleBulkUpload}
              className="hidden"
              disabled={loading}
            />
          </label>
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add LR Entry
          </button>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 w-full max-w-6xl my-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                {editingLR ? 'Edit LR Entry' : 'Add LR Entry'}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">LR Number Type</h3>
                <div className="flex gap-8">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="lr_no_type"
                      value="system_generated"
                      checked={formData.lr_no_type === 'system_generated'}
                      onChange={async (e) => {
                        setFormData({
                          ...formData,
                          lr_no_type: e.target.value as 'system_generated' | 'pre_printed',
                          manual_lr_no: '',
                        });
                        await fetchNextLRNumber();
                      }}
                      style={{ accentColor: '#dc2626' }}
                      className="w-5 h-5 cursor-pointer"
                      disabled={!!editingLR}
                    />
                    <span className="text-base font-medium text-gray-800">System Generated</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="lr_no_type"
                      value="pre_printed"
                      checked={formData.lr_no_type === 'pre_printed'}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          lr_no_type: e.target.value as 'system_generated' | 'pre_printed',
                        });
                        setNextLRNumber('');
                      }}
                      style={{ accentColor: '#dc2626' }}
                      className="w-5 h-5 cursor-pointer"
                      disabled={!!editingLR}
                    />
                    <span className="text-base font-medium text-gray-800">Pre-Printed</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {formData.lr_no_type === 'pre_printed' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      LR Number *
                    </label>
                    <input
                      type="text"
                      value={formData.manual_lr_no}
                      onChange={(e) =>
                        setFormData({ ...formData, manual_lr_no: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      required={formData.lr_no_type === 'pre_printed'}
                      disabled={!!editingLR}
                    />
                  </div>
                )}

                {formData.lr_no_type === 'system_generated' && !editingLR && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Next LR Number (Auto-Generated)
                    </label>
                    <input
                      type="text"
                      value={nextLRNumber}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-green-50 text-green-700 font-semibold"
                      disabled
                    />
                  </div>
                )}

                {formData.lr_no_type === 'system_generated' && editingLR && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      LR Number
                    </label>
                    <input
                      type="text"
                      value={editingLR.manual_lr_no}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
                      disabled
                    />
                  </div>
                )}

                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Enquiry ID (Optional)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={enquirySearchTerm}
                      onChange={(e) => {
                        setEnquirySearchTerm(e.target.value);
                        setShowEnquiryDropdown(true);
                        if (!e.target.value) {
                          setFormData({
                            ...formData,
                            enquiry_id: '',
                            enquiry_date: '',
                            origin_id: '',
                            destination_id: '',
                            from_city: '',
                            to_city: '',
                            vehicle_type: '',
                            vehicle_number: '',
                            driver_number: '',
                          });
                        }
                      }}
                      onFocus={() => {
                        if (!formData.enquiry_id) {
                          setEnquirySearchTerm('');
                        }
                        setShowEnquiryDropdown(true);
                      }}
                      onBlur={() => {
                        setTimeout(() => setShowEnquiryDropdown(false), 200);
                      }}
                      placeholder="Search by Enquiry ID..."
                      className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      disabled={!!editingLR}
                    />
                    {formData.enquiry_id && !editingLR && (
                      <button
                        type="button"
                        onClick={() => {
                          setEnquirySearchTerm('');
                          setShowEnquiryDropdown(false);
                          setFormData({
                            ...formData,
                            enquiry_id: '',
                            enquiry_date: '',
                            origin_id: '',
                            destination_id: '',
                            from_city: '',
                            to_city: '',
                            vehicle_type: '',
                            vehicle_number: '',
                            driver_number: '',
                            lr_email_id: '',
                            customer_email_id: '',
                            group_id: '',
                            billing_party_id: '',
                          });
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                  {enquirySearchTerm && showEnquiryDropdown && !editingLR && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {orderEnquiries
                        .filter((enquiry) =>
                          enquiry.enq_id.toLowerCase().includes(enquirySearchTerm.toLowerCase())
                        )
                        .map((enquiry) => (
                          <div
                            key={enquiry.id}
                            onClick={() => handleEnquirySelect(enquiry.id)}
                            className="px-4 py-3 hover:bg-gray-100 cursor-pointer border-b border-gray-200 last:border-b-0"
                          >
                            <div className="font-semibold text-gray-900">{enquiry.enq_id}</div>
                            <div className="text-sm text-gray-600">
                              {enquiry.customer_master.customer_name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {enquiry.origin.city_name} → {enquiry.destination.city_name}
                            </div>
                          </div>
                        ))}
                      {orderEnquiries.filter((enquiry) =>
                        enquiry.enq_id.toLowerCase().includes(enquirySearchTerm.toLowerCase())
                      ).length === 0 && (
                        <div className="px-4 py-3 text-gray-500 text-sm">No matching enquiries found</div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    LR Date *
                  </label>
                  <input
                    type="date"
                    value={formData.lr_date}
                    onChange={(e) =>
                      setFormData({ ...formData, lr_date: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Branch *
                  </label>
                  <select
                    value={formData.booking_branch}
                    onChange={(e) =>
                      setFormData({ ...formData, booking_branch: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select Branch</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.branch_code}>
                        {branch.branch_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Origin * {formData.enquiry_id && <span className="text-xs text-gray-500">(Auto-filled from Enquiry)</span>}
                  </label>
                  <select
                    value={formData.origin_id}
                    onChange={(e) => {
                      const selectedCity = cities.find(c => c.id === e.target.value);
                      setFormData({
                        ...formData,
                        origin_id: e.target.value,
                        from_city: selectedCity?.city_name || ''
                      });
                    }}
                    disabled={!!formData.enquiry_id}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                    required
                  >
                    <option value="">Select Origin City</option>
                    {cities.map((city) => (
                      <option key={city.id} value={city.id}>
                        {city.city_name}, {city.state}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Destination * {formData.enquiry_id && <span className="text-xs text-gray-500">(Auto-filled from Enquiry)</span>}
                  </label>
                  <select
                    value={formData.destination_id}
                    onChange={(e) => {
                      const selectedCity = cities.find(c => c.id === e.target.value);
                      setFormData({
                        ...formData,
                        destination_id: e.target.value,
                        to_city: selectedCity?.city_name || ''
                      });
                    }}
                    disabled={!!formData.enquiry_id}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                    required
                  >
                    <option value="">Select Destination City</option>
                    {cities.map((city) => (
                      <option key={city.id} value={city.id}>
                        {city.city_name}, {city.state}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    EDD (Estimated Delivery Date) *
                  </label>
                  <input
                    type="date"
                    value={formData.est_del_date}
                    onChange={(e) =>
                      setFormData({ ...formData, est_del_date: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pay Basis *
                  </label>
                  <select
                    value={formData.pay_basis}
                    onChange={(e) =>
                      setFormData({ ...formData, pay_basis: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select Pay Basis</option>
                    <option value="TBB">TBB</option>
                    <option value="PAID">PAID</option>
                    <option value="TOPAY">TOPAY</option>
                    <option value="FOC">FOC</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Load Type *
                  </label>
                  <select
                    value={formData.booking_type}
                    onChange={(e) =>
                      setFormData({ ...formData, booking_type: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select Load Type</option>
                    <option value="FTL">FTL</option>
                    <option value="LTL">LTL</option>
                  </select>
                </div>

                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contents *
                  </label>
                  <input
                    type="text"
                    value={formData.product}
                    onChange={(e) =>
                      setFormData({ ...formData, product: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Enter contents description"
                    required
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Consignor Details *
                  </label>
                  <textarea
                    value={formData.consignor}
                    onChange={(e) =>
                      setFormData({ ...formData, consignor: e.target.value })
                    }
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Enter consignor details"
                    required
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Consignee Details *
                  </label>
                  <textarea
                    value={formData.consignee}
                    onChange={(e) =>
                      setFormData({ ...formData, consignee: e.target.value })
                    }
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Enter consignee details"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Packages Qty *
                  </label>
                  <input
                    type="text"
                    value={formData.no_of_pkgs}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        no_of_pkgs: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Actual Weight in Kgs *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.act_wt}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        act_wt: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Charge Weight in Kgs *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.chrg_wt}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        chrg_wt: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Invoice Number *
                  </label>
                  <input
                    type="text"
                    value={formData.invoice_number}
                    onChange={(e) =>
                      setFormData({ ...formData, invoice_number: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Invoice Date *
                  </label>
                  <input
                    type="date"
                    value={formData.invoice_date}
                    onChange={(e) =>
                      setFormData({ ...formData, invoice_date: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Invoice Value *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.invoice_value}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        invoice_value: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    EwayBill Number *
                  </label>
                  <input
                    type="text"
                    value={formData.eway_bill_number}
                    onChange={(e) =>
                      setFormData({ ...formData, eway_bill_number: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    EwayBill Validity *
                  </label>
                  <input
                    type="date"
                    value={formData.eway_bill_exp_date}
                    onChange={(e) =>
                      setFormData({ ...formData, eway_bill_exp_date: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vehicle Number *
                  </label>
                  <input
                    type="text"
                    value={formData.vehicle_number}
                    onChange={(e) =>
                      setFormData({ ...formData, vehicle_number: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent uppercase"
                    placeholder="MH01AB1234"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Driver Number *
                  </label>
                  <input
                    type="text"
                    value={formData.driver_number}
                    onChange={(e) =>
                      setFormData({ ...formData, driver_number: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="10-digit mobile number"
                    minLength={10}
                    maxLength={10}
                    pattern="[0-9]{10}"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Driver Name
                  </label>
                  <input
                    type="text"
                    value={formData.driver_name}
                    onChange={(e) =>
                      setFormData({ ...formData, driver_name: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vehicle Type *
                  </label>
                  <select
                    value={formData.vehicle_type}
                    onChange={(e) =>
                      setFormData({ ...formData, vehicle_type: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select Vehicle Type</option>
                    {vehicleTypes.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.vehicle_type}>
                        {vehicle.vehicle_type}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Seal Number
                  </label>
                  <input
                    type="text"
                    value={formData.seal_no}
                    onChange={(e) =>
                      setFormData({ ...formData, seal_no: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Party Name *
                  </label>
                  <select
                    value={formData.billing_party_id}
                    onChange={(e) => handleCustomerSelect(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select Customer</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.customer_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    LR Email ID <span className="text-xs text-gray-500">(Auto-filled from Customer)</span>
                  </label>
                  <input
                    type="email"
                    value={formData.lr_email_id}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
                    disabled
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Customer Email ID <span className="text-xs text-gray-500">(Auto-filled from Customer)</span>
                  </label>
                  <input
                    type="email"
                    value={formData.customer_email_id}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
                    disabled
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Customer Group <span className="text-xs text-gray-500">(Auto-filled from Customer)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.group_id}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
                    disabled
                  />
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-6 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Saving...' : editingLR ? 'Update LR Entry' : 'Save LR Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by LR number, billing party, origin, destination, vehicle type, or vehicle number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  LR Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  LR Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Branch
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Origin
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Destination
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Billing Party
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vehicle Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vehicle No.
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLREntries.map((lr) => (
                <tr key={lr.tran_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{lr.manual_lr_no}</div>
                    <div className="text-xs text-gray-500 capitalize">
                      {lr.lr_no_type.replace('_', ' ')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {lr.lr_date ? new Date(lr.lr_date).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {lr.booking_branch || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {lr.from_city || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {lr.to_city || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {lr.billing_party_name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {lr.vehicle_type || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {lr.vehicle_number || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(lr)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {profile?.role === 'admin' && (
                        <button
                          onClick={() => handleDelete(lr.tran_id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredLREntries.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No LR entries found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
