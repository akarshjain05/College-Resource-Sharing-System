import { useState } from "react";
import toast from "react-hot-toast";
import { paymentApi } from "../api/endpoints";
import { loadRazorpayScript } from "../utils/loadRazorpay";
import { useAuth } from "../context/AuthContext";

export default function PayNowButton({ borrowRequest, onPaid }) {
  const { user } = useAuth();
  const [processing, setProcessing] = useState(false);

  const handlePay = async () => {
    setProcessing(true);
    try {
      const scriptOk = await loadRazorpayScript();
      if (!scriptOk) {
        toast.error("Could not load payment gateway. Check your connection and try again.");
        return;
      }

      const { data: order } = await paymentApi.createOrder(borrowRequest.id);

      const options = {
        key: order.razorpay_key_id,
        amount: order.amount,
        currency: order.currency,
        order_id: order.razorpay_order_id,
        name: "CRSS — Campus Resource Sharing",
        description: `Rent + deposit for "${borrowRequest.resource?.title || 'Resource'}"`,
        prefill: {
          name: user?.full_name,
          email: user?.email,
        },
        theme: { color: "#4f46e5" },
        handler: async (response) => {
          try {
            await paymentApi.verify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            toast.success("Payment successful! You can now arrange handover.");
            onPaid?.();
          } catch (err) {
            // Signature check failed server-side, or the webhook hasn't landed yet on a slow network.
            toast.error(
              err.response?.data?.detail ||
              "We received your payment but couldn't confirm it yet. It will update automatically shortly."
            );
          }
        },
        modal: {
          ondismiss: () => {
            toast("Payment cancelled — you can try again anytime before handover.", { icon: "ℹ️" });
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (resp) => {
        toast.error(resp.error?.description || "Payment failed. Please try a different method.");
      });
      rzp.open();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not start payment. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <button
      onClick={handlePay}
      disabled={processing}
      className="w-full btn bg-primary-600 hover:bg-primary-700 text-white rounded-xl py-3 text-xs font-bold shadow-md disabled:opacity-50 mt-2"
    >
      {processing ? "Opening secure checkout…" : "Pay Now"}
    </button>
  );
}
