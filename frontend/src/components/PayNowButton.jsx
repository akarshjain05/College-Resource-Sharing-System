import { useState } from "react";
import toast from "react-hot-toast";
import { paymentApi } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import ConfirmModal from "./ConfirmModal";

export default function PayNowButton({ borrowRequest, onPaid, className = "" }) {
  const { user } = useAuth();
  const [processing, setProcessing] = useState(false);
  const [showPayConfirm, setShowPayConfirm] = useState(false);

  const onClickPayNow = (e) => {
    e.stopPropagation();
    setShowPayConfirm(true);
  };

  const handlePay = async () => {
    setProcessing(true);
    try {
      await paymentApi.payFromWallet(borrowRequest.id);
      toast.success("Payment successful from Wallet! You can now arrange handover.");
      onPaid?.();
    } catch (err) {
      if (err.response?.data?.error_code === "INSUFFICIENT_BALANCE") {
        const requiredPaise = err.response.data.data?.required_paise;
        const currentBalance = user?.wallet_balance || 0;
        
        let deficitPaise = requiredPaise - currentBalance;
        if (deficitPaise < 10000) deficitPaise = 10000;
        
        toast.error(`Insufficient wallet balance. Please top up at least ₹${deficitPaise / 100} in your wallet to proceed.`, { duration: 4000 });
      } else {
        toast.error(err.response?.data?.detail || "Could not complete payment. Please try again.");
      }
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      <button
        onClick={onClickPayNow}
        disabled={processing}
        className={`btn bg-primary-600 hover:bg-primary-700 text-white rounded-xl py-2 px-4 text-xs font-bold shadow-md disabled:opacity-50 ${className}`}
      >
        {processing ? "Processing…" : "Pay Now"}
      </button>

      <ConfirmModal
        isOpen={showPayConfirm}
        onClose={() => setShowPayConfirm(false)}
        onConfirm={handlePay}
        title="Confirm Payment"
        message={`Are you sure you want to pay ₹${borrowRequest.total_amount || 0} for ${borrowRequest.resource?.title || "this booking"} from your Campus Wallet?`}
        confirmText="Pay Now"
        cancelText="Cancel"
      />
    </>
  );
}
