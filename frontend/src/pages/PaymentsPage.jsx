import React, { useEffect, useState, useMemo } from 'react';
import { paymentApi } from '../api/endpoints';
import { format } from 'date-fns';
import { CreditCard, CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('PENDING'); // PENDING, COMPLETED, CANCELLED, FAILED

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const { data } = await paymentApi.myPayments();
      setPayments(data);
    } catch (err) {
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const filteredPayments = useMemo(() => {
    return payments.filter(p => p.status === activeTab);
  }, [payments, activeTab]);

  const handleSimulatePay = async (paymentId) => {
    try {
      await paymentApi.simulatePay(paymentId);
      toast.success('Payment completed successfully!');
      fetchPayments();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to complete payment');
    }
  };

  const handleSimulateFail = async (paymentId) => {
    try {
      await paymentApi.simulateFail(paymentId);
      toast.error('Payment failed.');
      fetchPayments();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update payment');
    }
  };

  const handleCancel = async (paymentId) => {
    if (!window.confirm('Are you sure you want to cancel this payment?')) return;
    try {
      await paymentApi.cancel(paymentId);
      toast.success('Payment cancelled.');
      fetchPayments();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to cancel payment');
    }
  };

  const tabs = [
    { id: 'PENDING', label: 'Yet to Pay' },
    { id: 'COMPLETED', label: 'Completed' },
    { id: 'FAILED', label: 'Failed' },
    { id: 'CANCELLED', label: 'Cancelled' },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-primary-500" />
          My Payments
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Track your fines, fees, and transactions.</p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-6 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 min-w-[120px] py-2.5 px-4 text-sm font-medium rounded-lg transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-white dark:bg-slate-900 text-primary-600 dark:text-primary-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
            }`}
          >
            {tab.label}
            <span className="ml-2 text-xs opacity-70">
              ({payments.filter(p => p.status === tab.id).length})
            </span>
          </button>
        ))}
      </div>

      {/* Payment List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
            <CreditCard className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-1">No payments found</h3>
            <p className="text-slate-500 dark:text-slate-400">You don't have any {activeTab.toLowerCase()} payments.</p>
          </div>
        ) : (
          filteredPayments.map(payment => (
            <div key={payment.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col sm:flex-row gap-6 items-center shadow-sm hover:shadow-md transition-shadow">
              
              <div className="flex-1 w-full">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{payment.reason}</h3>
                  {payment.status === 'PENDING' && <span className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 text-xs font-bold px-2.5 py-0.5 rounded-full">Pending</span>}
                  {payment.status === 'COMPLETED' && <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Paid</span>}
                  {payment.status === 'FAILED' && <span className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Failed</span>}
                  {payment.status === 'CANCELLED' && <span className="bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1"><XCircle className="w-3 h-3"/> Cancelled</span>}
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400 flex flex-col sm:flex-row sm:gap-6">
                  <span>Created: {format(new Date(payment.created_at), 'PPP')}</span>
                  {payment.borrow_request_id && (
                    <span>Request ID: {payment.borrow_request_id.split('-')[0]}...</span>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-end gap-3 w-full sm:w-auto border-t sm:border-t-0 sm:border-l border-slate-100 dark:border-slate-800 pt-4 sm:pt-0 sm:pl-6">
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  ${payment.amount.toFixed(2)}
                </div>
                
                {payment.status === 'PENDING' && (
                  <div className="flex flex-wrap gap-2 w-full justify-end">
                    <button
                      onClick={() => handleSimulatePay(payment.id)}
                      className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold rounded-xl transition-all shadow-sm active:scale-95"
                    >
                      Pay Now
                    </button>
                    <button
                      onClick={() => handleSimulateFail(payment.id)}
                      className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-300 text-sm font-bold rounded-xl transition-all active:scale-95"
                    >
                      Simulate Fail
                    </button>
                    <button
                      onClick={() => handleCancel(payment.id)}
                      className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-bold rounded-xl transition-all active:scale-95"
                    >
                      Cancel
                    </button>
                  </div>
                )}
                {payment.status === 'FAILED' && (
                  <div className="flex flex-wrap gap-2 w-full justify-end">
                    <button
                      onClick={() => handleSimulatePay(payment.id)}
                      className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold rounded-xl transition-all shadow-sm active:scale-95"
                    >
                      Retry Payment
                    </button>
                  </div>
                )}
              </div>

            </div>
          ))
        )}
      </div>
    </div>
  );
}
