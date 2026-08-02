import React from "react";
import { CheckCircle2, IndianRupee, ShieldCheck } from "lucide-react";

export default function PaymentCard({ paymentData }) {
  if (!paymentData) return null;

  const isReceived = paymentData.action === "received";

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm transition-all hover:shadow-md">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 bg-emerald-50/50 dark:bg-emerald-950/20 px-4 py-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4" />
        </div>
        <div>
          <h4 className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400">
            {isReceived ? "Payment Received" : "Payment Successful"}
          </h4>
          <p className="text-[10px] font-semibold text-emerald-600/70 dark:text-emerald-500/70">
            Transaction officially verified
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Amount {isReceived ? "Received" : "Paid"}
          </span>
          <span className="flex items-center text-xl font-black text-slate-900 dark:text-white">
            <IndianRupee className="mr-0.5 h-4 w-4 text-emerald-500" />
            {paymentData.amount?.toFixed(2)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 p-3 text-xs">
          <div>
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Item
            </span>
            <span className="mt-0.5 block font-bold text-slate-700 dark:text-slate-300 truncate">
              {paymentData.item_title || "Resource"}
            </span>
          </div>
          <div>
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              {isReceived ? "Paid By" : "Payer Name"}
            </span>
            <span className="mt-0.5 block font-bold text-slate-700 dark:text-slate-300 truncate">
              {paymentData.payer_name || "User"}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-dashed border-slate-200 dark:border-slate-800 pt-3 text-[10px]">
          <div className="flex items-center gap-1.5 text-slate-500">
            <ShieldCheck className="h-3.5 w-3.5 text-primary-500" />
            <span className="font-semibold font-mono tracking-tight uppercase">
              TXN: {paymentData.transaction_id || "N/A"}
            </span>
          </div>
          <span className="font-semibold text-slate-400">
            {new Date(paymentData.timestamp).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </div>
    </div>
  );
}
