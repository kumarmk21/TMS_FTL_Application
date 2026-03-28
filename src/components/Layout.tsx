import { useState, ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Database,
  FileText,
  DollarSign,
  CreditCard,
  Users,
  BarChart3,
  Menu,
  Truck,
  X,
  ChevronDown,
  Printer,
  Loader2,
  Home,
} from 'lucide-react';
import { UserProfile } from './UserProfile';
import { UserMaster } from '../pages/UserMaster';
import { BranchMaster } from '../pages/BranchMaster';
import { VehicleTypeMaster } from '../pages/VehicleTypeMaster';
import { CityMaster } from '../pages/CityMaster';
import { CustomerMaster } from '../pages/CustomerMaster';
import { VendorMaster } from '../pages/VendorMaster';
import { VendorBranchUpdate } from '../pages/VendorBranchUpdate';
import { CompanyMaster } from '../pages/CompanyMaster';
import { CustomerGSTMaster } from '../pages/CustomerGSTMaster';
import { DocTypeMaster } from '../pages/DocTypeMaster';
import StatusMaster from '../pages/StatusMaster';
import SACCodeMaster from '../pages/SACCodeMaster';
import CustomerRateMaster from '../pages/CustomerRateMaster';
import { OrderEnquiry } from '../pages/OrderEnquiry';
import { Dashboard } from '../pages/Dashboard';
import { LREntry } from '../pages/LREntry';
import { LRPrint } from '../pages/LRPrint';
import GenerateCustomerBill from '../pages/GenerateCustomerBill';
import LRFinancialEdit from '../pages/LRFinancialEdit';
import BillPrint from '../pages/BillPrint';
import { TruckDispatch } from '../pages/TruckDispatch';
import { TruckArrival } from '../pages/TruckArrival';
import { THCPrint } from '../pages/THCPrint';
import GenerateAdvanceBankFile from '../pages/GenerateAdvanceBankFile';
import RegenerateAdvanceBankFile from '../pages/RegenerateAdvanceBankFile';
import GenerateBalanceBankFile from '../pages/GenerateBalanceBankFile';
import SalesReport from '../pages/SalesReport';
import CustomerMISReport from '../pages/CustomerMISReport';
import { LRTracking } from '../pages/LRTracking';
import GenerateWarehouseBill from '../pages/GenerateWarehouseBill';
import WarehouseBillPrint from '../pages/WarehouseBillPrint';
import CustomerBillEdit from '../pages/CustomerBillEdit';
import IncomeExpenseReport from '../pages/IncomeExpenseReport';
import PODUpload from '../pages/PODUpload';
import { BillCancelRegenerate } from '../pages/BillCancelRegenerate';
import LRBulkUpload from '../pages/LRBulkUpload';
import THCBulkUpload from '../pages/THCBulkUpload';
import THCBulkRollback from '../pages/THCBulkRollback';
import AccountGroupMaster from '../pages/AccountGroupMaster';
import AccountsMaster from '../pages/AccountsMaster';
import ConsolidateBillGeneration from '../pages/ConsolidateBillGeneration';
import ConsolBillPrint from '../pages/ConsolBillPrint';
import BTHPaidReport from '../pages/BTHPaidReport';
import APReport from '../pages/APReport';
import AdminExpenses from '../pages/AdminExpenses';
import AdminPaymentBankFile from '../pages/AdminPaymentBankFile';

export interface MenuItem {
  id: string;
  label: string;
  icon: ReactNode;
  subItems?: { id: string; label: string }[];
}

const menuItems: MenuItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: <Home className="w-5 h-5" />,
  },
  {
    id: 'masters',
    label: 'Masters',
    icon: <Database className="w-5 h-5" />,
    subItems: [
      { id: 'user-master', label: 'User Master' },
      { id: 'branch-master', label: 'Branch Master' },
      { id: 'vehicle-type-master', label: 'Vehicle Type Master' },
      { id: 'city-master', label: 'City Master' },
      { id: 'customer-master', label: 'Customer Master' },
      { id: 'customer-gst-master', label: 'Customer GST Master' },
      { id: 'customer-rate-master', label: 'Customer Rate Master' },
      { id: 'vendor-master', label: 'Vendor Master' },
      { id: 'vendor-branch-update', label: 'Vendor Branch Update' },
      { id: 'company-master', label: 'Company Master' },
      { id: 'doc-type-master', label: 'Doc Type Master' },
      { id: 'status-master', label: 'Status Master' },
      { id: 'sac-code-master', label: 'SAC Code Master' },
      { id: 'account-group-master', label: 'Account Group Master' },
      { id: 'accounts-master', label: 'Accounts Master' },
      { id: 'lr-master', label: 'LR Master' },
    ],
  },
  {
    id: 'booking',
    label: 'Booking/Transactions',
    icon: <FileText className="w-5 h-5" />,
    subItems: [
      { id: 'allot-lr', label: 'Allot LR Number' },
      { id: 'lr-entry', label: 'LR Entry' },
      { id: 'lr-bulk-upload', label: 'LR Bulk Upload' },
      { id: 'lr-financial-edit', label: 'LR Financial Edit' },
      { id: 'generate-bill', label: 'Generate Customer Bill' },
      { id: 'bill-cancel-regenerate', label: 'Bill Cancel/Regenerate' },
      { id: 'consolidate-bill', label: 'Consolidate Bill Generation' },
      { id: 'generate-warehouse-bill', label: 'Generate Warehouse Bill' },
      { id: 'bill-edit', label: 'Customer Bill Edit' },
      { id: 'bill-submission', label: 'Customer Bill Submission' },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    icon: <DollarSign className="w-5 h-5" />,
    subItems: [
      { id: 'truck-balance-payment', label: 'Truck Balance Payment' },
      { id: 'admin-expenses', label: 'Admin Expenses' },
      { id: 'generate-advance-bank-file', label: 'Generate Advance Bank File' },
      { id: 'regenerate-advance-bank-file', label: 'Advance Bank Payment File Regenerate' },
      { id: 'generate-balance-bank-file', label: 'BTH Payment' },
      { id: 'admin-payment-bank-file', label: 'Admin Payment Bank File' },
      { id: 'generate-debit-note', label: 'Generate Debit Note' },
      { id: 'generate-credit-note', label: 'Generate Credit Note' },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    icon: <Truck className="w-5 h-5" />,
    subItems: [
      { id: 'customer-enquiry', label: 'Customer Order/Enquiry' },
      { id: 'truck-dispatch', label: 'Truck Dispatch' },
      { id: 'truck-arrival', label: 'Truck Arrival' },
      { id: 'pod-upload', label: 'POD Upload' },
      { id: 'thc-bulk-upload', label: 'THC Bulk Upload' },
      { id: 'thc-bulk-rollback', label: 'THC Bulk Rollback' },
    ],
  },
  {
    id: 'view-print',
    label: 'View/Print',
    icon: <Printer className="w-5 h-5" />,
    subItems: [
      { id: 'lr-print', label: 'LR Print' },
      { id: 'bill-print', label: 'Transportation Bill Print' },
      { id: 'warehouse-bill-print', label: 'Warehouse Bill Print' },
      { id: 'thc-print', label: 'THC Print' },
      { id: 'lr-life-cycle', label: 'LR Life Cycle' },
      { id: 'lr-tracking', label: 'LR Tracking' },
      { id: 'consol-bill-print', label: 'Consol Bill Print' },
    ],
  },
  {
    id: 'mis-reports',
    label: 'MIS/Reports',
    icon: <BarChart3 className="w-5 h-5" />,
    subItems: [
      { id: 'income-expense-report', label: 'Income/Expense Report' },
      { id: 'sales-report', label: 'Sales Report' },
      { id: 'customer-mis-report', label: 'Customer MIS Report' },
      { id: 'pending-pod', label: 'Pending POD' },
      { id: 'ar-report', label: 'AR Report' },
      { id: 'ap-report', label: 'AP Report' },
      { id: 'bth-paid-report', label: 'BTH Payment' },
    ],
  },
];

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { profile, loading } = useAuth();

  const filteredMenuItems = menuItems.filter((item) => {
    if (item.id === 'masters') {
      return profile?.role === 'admin';
    }
    return true;
  });

  const defaultMenu = 'dashboard';
  const defaultSubItem = 'dashboard';

  const [expandedMenu, setExpandedMenu] = useState<string | null>(defaultMenu);
  const [activeSubItem, setActiveSubItem] = useState<string>(defaultSubItem);

  const toggleMenu = (menuId: string, hasSubItems: boolean) => {
    if (!hasSubItems) {
      setActiveSubItem(menuId);
      setExpandedMenu(null);
    } else {
      setExpandedMenu(expandedMenu === menuId ? null : menuId);
    }
  };

  const renderContent = () => {
    switch (activeSubItem) {
      case 'dashboard':
        return <Dashboard />;
      case 'user-master':
        return <UserMaster />;
      case 'branch-master':
        return <BranchMaster />;
      case 'vehicle-type-master':
        return <VehicleTypeMaster />;
      case 'city-master':
        return <CityMaster />;
      case 'customer-master':
        return <CustomerMaster />;
      case 'customer-gst-master':
        return <CustomerGSTMaster />;
      case 'customer-rate-master':
        return <CustomerRateMaster />;
      case 'vendor-master':
        return <VendorMaster />;
      case 'vendor-branch-update':
        return <VendorBranchUpdate />;
      case 'company-master':
        return <CompanyMaster />;
      case 'doc-type-master':
        return <DocTypeMaster />;
      case 'status-master':
        return <StatusMaster />;
      case 'sac-code-master':
        return <SACCodeMaster />;
      case 'account-group-master':
        return <AccountGroupMaster />;
      case 'accounts-master':
        return <AccountsMaster />;
      case 'customer-enquiry':
        return <OrderEnquiry />;
      case 'truck-dispatch':
        return <TruckDispatch />;
      case 'truck-arrival':
        return <TruckArrival />;
      case 'pod-upload':
        return <PODUpload />;
      case 'thc-bulk-upload':
        return <THCBulkUpload />;
      case 'thc-bulk-rollback':
        return <THCBulkRollback />;
      case 'lr-entry':
        return <LREntry />;
      case 'lr-bulk-upload':
        return <LRBulkUpload />;
      case 'lr-financial-edit':
        return <LRFinancialEdit />;
      case 'generate-bill':
        return <GenerateCustomerBill />;
      case 'bill-cancel-regenerate':
        return <BillCancelRegenerate />;
      case 'generate-warehouse-bill':
        return <GenerateWarehouseBill />;
      case 'consolidate-bill':
        return <ConsolidateBillGeneration />;
      case 'bill-edit':
        return <CustomerBillEdit />;
      case 'lr-print':
        return <LRPrint />;
      case 'bill-print':
        return <BillPrint />;
      case 'warehouse-bill-print':
        return <WarehouseBillPrint />;
      case 'thc-print':
        return <THCPrint />;
      case 'generate-advance-bank-file':
        return <GenerateAdvanceBankFile />;
      case 'regenerate-advance-bank-file':
        return <RegenerateAdvanceBankFile />;
      case 'generate-balance-bank-file':
        return <GenerateBalanceBankFile />;
      case 'admin-expenses':
        return <AdminExpenses />;
      case 'admin-payment-bank-file':
        return <AdminPaymentBankFile />;
      case 'income-expense-report':
        return <IncomeExpenseReport />;
      case 'sales-report':
        return <SalesReport />;
      case 'customer-mis-report':
        return <CustomerMISReport />;
      case 'lr-tracking':
        return <LRTracking />;
      case 'consol-bill-print':
        return <ConsolBillPrint />;
      case 'bth-paid-report':
        return <BTHPaidReport />;
      case 'ap-report':
        return <APReport />;
      default:
        return <Dashboard />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <aside
        className={`fixed left-0 top-0 h-full bg-slate-900 text-white transition-all duration-300 z-40 print:hidden ${
          sidebarOpen ? 'w-64' : 'w-0'
        } overflow-hidden`}
      >
        <div className="flex items-center justify-center p-4 border-b border-slate-800">
          <img
            src="/logo3.jpg"
            alt="DLS Logistics"
            className="h-12 w-auto object-contain"
          />
        </div>

        <nav className="p-4 space-y-2 overflow-y-auto h-[calc(100vh-88px)]">
          {filteredMenuItems.map((item) => (
            <div key={item.id}>
              <button
                onClick={() => toggleMenu(item.id, !!item.subItems)}
                className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-all ${
                  (expandedMenu === item.id || activeSubItem === item.id)
                    ? 'bg-red-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  {item.icon}
                  <span className="font-medium">{item.label}</span>
                </div>
                {item.subItems && (
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${
                      expandedMenu === item.id ? 'rotate-180' : ''
                    }`}
                  />
                )}
              </button>

              {item.subItems && expandedMenu === item.id && (
                <div className="mt-1 ml-4 space-y-1">
                  {item.subItems.map((subItem) => (
                    <button
                      key={subItem.id}
                      onClick={() => setActiveSubItem(subItem.id)}
                      className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-all ${
                        activeSubItem === subItem.id
                          ? 'bg-red-500 text-white'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      {subItem.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
      </aside>

      <div
        className={`transition-all duration-300 ${
          sidebarOpen ? 'ml-64' : 'ml-0'
        }`}
      >
        <header className="bg-white border-b border-gray-200 sticky top-0 z-30 print:hidden">
          <div className="flex items-center justify-between px-6 py-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {sidebarOpen ? (
                <X className="w-6 h-6 text-gray-600" />
              ) : (
                <Menu className="w-6 h-6 text-gray-600" />
              )}
            </button>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900">
                  {profile?.full_name}
                </p>
                <p className="text-xs text-gray-500 capitalize">{profile?.role}</p>
              </div>
              <UserProfile />
            </div>
          </div>
        </header>

        <main className="p-6">{renderContent()}</main>
      </div>
    </div>
  );
}
