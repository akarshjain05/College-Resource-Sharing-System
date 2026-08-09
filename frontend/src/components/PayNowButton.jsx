import { useState } from "react";
import toast from "react-hot-toast";
import { paymentApi } from "../api/endpoints";
import { loadRazorpayScript } from "../utils/loadRazorpay";
import { useAuth } from "../context/AuthContext";

export default function PayNowButton({ borrowRequest, onPaid, className = "" }) {
  const { user } = useAuth();
  const [processing, setProcessing] = useState(false);

  const handlePay = async () => {
    setProcessing(true);
    try {
      // Step 1: Attempt to pay directly from wallet
      await paymentApi.payFromWallet(borrowRequest.id);
      toast.success("Payment successful from Wallet! You can now arrange handover.");
      onPaid?.();
    } catch (err) {
      if (err.response?.data?.error_code === "INSUFFICIENT_BALANCE") {
        const requiredPaise = err.response.data.data?.required_paise;
        const currentBalance = user?.wallet_balance || 0;
        
        let deficitPaise = requiredPaise - currentBalance;
        if (deficitPaise < 10000) deficitPaise = 10000;
        
        if (deficitPaise > 1000000) {
            toast.error("Required top-up exceeds maximum single addition (₹10,000). Please add money in batches from your Wallet page.");
            setProcessing(false);
            return;
        }

        // Needs top-up
        toast("Insufficient wallet balance. Redirecting to top-up...", { icon: "💳" });
        await handleTopUpAndPay(deficitPaise);
      } else {
        toast.error(err.response?.data?.detail || "Could not complete payment. Please try again.");
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleTopUpAndPay = async (amountPaise) => {
    try {
      const scriptOk = await loadRazorpayScript();
      if (!scriptOk) {
        toast.error("Could not load payment gateway. Check your connection and try again.");
        return;
      }

      const { data: order } = await paymentApi.createTopupOrder(amountPaise);

      const options = {
        key: order.razorpay_key_id,
        amount: order.amount,
        currency: order.currency,
        order_id: order.razorpay_order_id,
        name: "CRSS Wallet Top-up",
        description: `Add ₹${order.amount / 100} to wallet`,
        prefill: {
          name: user?.full_name,
          email: user?.email,
        },
        theme: { color: "#4f46e5" },
        handler: async (response) => {
          try {
            toast.loading("Verifying top-up...", { id: "topup-verify" });
            await paymentApi.verifyTopup({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            toast.success("Wallet topped up successfully!", { id: "topup-verify" });
            
            // Re-attempt payment from wallet
            toast.loading("Processing item payment...", { id: "item-pay" });
            await paymentApi.payFromWallet(borrowRequest.id);
            toast.success("Payment successful from Wallet! You can now arrange handover.", { id: "item-pay" });
            onPaid?.();
          } catch (verifyErr) {
            toast.dismiss();
            toast.error(
              verifyErr.response?.data?.detail ||
              "Top-up completed but failed to pay for the item. Please click Pay Now again."
            );
          }
        },
        modal: {
          ondismiss: () => {
            toast("Top-up cancelled — you can try again anytime.", { icon: "ℹ️" });
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (resp) => {
        toast.error(resp.error?.description || "Top-up failed. Please try a different method.");
      });
      rzp.open();
    } catch (topupErr) {
      toast.error(topupErr.response?.data?.detail || "Could not start top-up. Please try again.");
    }
  };

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        handlePay();
      }}
      disabled={processing}
      className={`btn bg-primary-600 hover:bg-primary-700 text-white rounded-xl py-2 px-4 text-xs font-bold shadow-md disabled:opacity-50 ${className}`}
    >
      {processing ? "Processing…" : "Pay Now"}
    </button>
  );
}
