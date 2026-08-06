import { useState, useEffect } from "react";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Clock,
  Info,
  ChevronDown,
  ChevronUp,
  FileText,
  CreditCard,
  RefreshCw,
  ExternalLink,
  Search,
  IndianRupee,
  X,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { paymentApi, getImageUrl } from "../../api/endpoints";
import PayNowButton from "../../components/PayNowButton";

export default function TransactionsPage() {
  const [data, setData] = useState({
    summary: {
      total_spent_paise: 0,
      total_earned_paise: 0,
      active_deposits_paise: 0,
      pending_to_be_paid_paise: 0,
    },
    transactions: [],
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all"); // "all", "credit", "debit", "pending"
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showTerms, setShowTerms] = useState(false);
  const navigate = useNavigate();

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await paymentApi.getMyTransactions();
      setData(res.data || {
        summary: {
          total_spent_paise: 0,
          total_earned_paise: 0,
          active_deposits_paise: 0,
          pending_to_be_paid_paise: 0,
        },
        transactions: [],
      });
    } catch (err) {
      console.error("Failed to load transactions", err);
      toast.error("Failed to load your transaction history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const formatRupees = (paise) => {
    return (paise / 100).toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    });
  };

  const filteredTransactions = (data.transactions || []).filter((tx) => {
    // Filter by tab
    if (activeTab === "credit" && tx.transaction_type !== "CREDIT") return false;
    if (activeTab === "debit" && (tx.transaction_type !== "DEBIT" || tx.is_to_be_paid)) return false;
    if (activeTab === "pending" && !tx.is_to_be_paid) return false;

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = (tx.item_title || "").toLowerCase().includes(q);
      const matchParty = (tx.other_party_name || "").toLowerCase().includes(q);
      const matchTxId = (tx.razorpay_payment_id || "").toLowerCase().includes(q);
      return matchTitle || matchParty || matchTxId;
    }

    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-16">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
                  <Wallet className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                    Campus Wallet & Transactions
                  </h1>
                  <p className="text-blue-100 text-sm mt-0.5">
                    Track all payments, security deposits, earnings, and terms across campus.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={fetchTransactions}
                className="flex items-center gap-1.5 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs sm:text-sm font-semibold transition backdrop-blur-sm"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>
              <button
                onClick={() => setShowTerms(!showTerms)}
                className="flex items-center gap-1.5 px-4 py-2 bg-white text-blue-900 hover:bg-blue-50 rounded-xl text-xs sm:text-sm font-bold shadow-md transition"
              >
                <FileText className="h-4 w-4 text-blue-700" />
                {showTerms ? "Hide Terms" : "App Terms & UI Policy"}
              </button>
            </div>
          </div>

          {/* 4 Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
            {/* Total Spent */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-sm">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-blue-200">
                  Total Spent (Debit)
                </p>
                <p className="text-2xl sm:text-3xl font-black mt-1 text-white">
                  {formatRupees(data.summary?.total_spent_paise || 0)}
                </p>
                <p className="text-[11px] text-blue-200 mt-1">
                  Rent & deposits paid on borrowed items
                </p>
              </div>
              <div className="p-3 bg-rose-500/20 rounded-2xl border border-rose-300/30">
                <ArrowUpRight className="h-6 w-6 text-rose-300" />
              </div>
            </div>

            {/* Total Earned */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-sm">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-200">
                  Total Earned (Credit)
                </p>
                <p className="text-2xl sm:text-3xl font-black mt-1 text-emerald-300">
                  {formatRupees(data.summary?.total_earned_paise || 0)}
                </p>
                <p className="text-[11px] text-blue-200 mt-1">
                  Rental income earned from lending
                </p>
              </div>
              <div className="p-3 bg-emerald-500/20 rounded-2xl border border-emerald-300/30">
                <ArrowDownLeft className="h-6 w-6 text-emerald-300" />
              </div>
            </div>

            {/* Active Deposits */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-sm">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-blue-200">
                  Active Security Deposits
                </p>
                <p className="text-2xl sm:text-3xl font-black mt-1 text-white">
                  {formatRupees(data.summary?.active_deposits_paise || 0)}
                </p>
                <p className="text-[11px] text-blue-200 mt-1">
                  Refunded automatically on item return
                </p>
              </div>
              <div className="p-3 bg-blue-400/20 rounded-2xl border border-blue-300/30">
                <ShieldCheck className="h-6 w-6 text-blue-300" />
              </div>
            </div>

            {/* To Be Paid */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-sm">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-amber-200">
                  To Be Paid (Pending)
                </p>
                <p className="text-2xl sm:text-3xl font-black mt-1 text-amber-300">
                  {formatRupees(data.summary?.pending_to_be_paid_paise || 0)}
                </p>
                <p className="text-[11px] text-blue-200 mt-1">
                  Approved items waiting for checkout
                </p>
              </div>
              <div className="p-3 bg-amber-500/20 rounded-2xl border border-amber-300/30">
                <AlertCircle className="h-6 w-6 text-amber-300" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {/* App Payment Terms & Policies Accordion */}
        {showTerms && (
          <div className="mb-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-md animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Campus Resource Sharing — Payment Terms & UI Policy
                </h2>
              </div>
              <button
                onClick={() => setShowTerms(false)}
                className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-semibold"
              >
                Close Terms ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-5 text-sm">
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-700">
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  100% Refundable Security Deposit
                </h3>
                <p className="text-slate-600 dark:text-slate-400 text-xs mt-2 leading-relaxed">
                  Security deposits are collected via Razorpay at checkout and held securely. Upon
                  returning the item in good condition, the full deposit amount is automatically
                  refunded back to the borrower.
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-700">
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  5% Daily Rental Pricing
                </h3>
                <p className="text-slate-600 dark:text-slate-400 text-xs mt-2 leading-relaxed">
                  Daily rent is strictly calculated at <strong>5% of the item&apos;s security deposit</strong> per
                  day of borrowing. The lender earns 100% of this rental fee once the handover is confirmed.
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-700">
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                  Verified Peer-to-Peer Escrow
                </h3>
                <p className="text-slate-600 dark:text-slate-400 text-xs mt-2 leading-relaxed">
                  All transactions use encrypted Razorpay checkout. Handover and Return statuses require
                  dual confirmation between neighbor students before final settlement is completed.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Filters and Search Bar */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-xl overflow-x-auto">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                activeTab === "all"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              All Transactions ({data.transactions?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab("credit")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap flex items-center gap-1 ${
                activeTab === "credit"
                  ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-500" />
              Credits (+ Earned)
            </button>
            <button
              onClick={() => setActiveTab("debit")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap flex items-center gap-1 ${
                activeTab === "debit"
                  ? "bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <ArrowUpRight className="h-3.5 w-3.5 text-rose-500" />
              Debits (- Spent)
            </button>
            <button
              onClick={() => setActiveTab("pending")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap flex items-center gap-1 ${
                activeTab === "pending"
                  ? "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
              To Be Paid ({data.transactions?.filter((t) => t.is_to_be_paid).length || 0})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by item, name, or Tx ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
            />
          </div>
        </div>

        {/* Transactions List */}
        <div className="mt-6 space-y-3">
          {loading ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 border border-slate-200 dark:border-slate-800 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-slate-500 text-sm mt-3 font-medium">
                Loading your transaction ledger...
              </p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 border border-slate-200 dark:border-slate-800 text-center">
              <CreditCard className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mt-3">
                No transactions found
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {searchQuery
                  ? "Try clearing your search keyword or switching filter tabs."
                  : "When you borrow or lend items on campus, your payments and earnings will appear here."}
              </p>
            </div>
          ) : (
            filteredTransactions.map((tx) => {
              const isCredit = tx.transaction_type === "CREDIT";
              const isPending = tx.is_to_be_paid;

              return (
                <div
                  key={tx.id}
                  onClick={() => setSelectedTransaction(tx)}
                  className={`group bg-white dark:bg-slate-900 border rounded-2xl p-4 sm:p-5 transition shadow-sm hover:shadow-md cursor-pointer ${
                    isPending
                      ? "border-amber-300 dark:border-amber-700/60 bg-amber-50/20 dark:bg-amber-950/10 hover:bg-amber-50/40"
                      : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Left: Item info and type */}
                    <div className="flex items-start gap-4">
                      {/* Image Thumbnail */}
                      <div className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                        {tx.item_image ? (
                          <img
                            src={getImageUrl(tx.item_image)}
                            alt={tx.item_title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <CreditCard className="h-6 w-6 text-slate-400" />
                        )}
                      </div>

                      {/* Text details */}
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 text-base sm:text-lg transition"
                          >
                            {tx.item_title}
                          </span>

                          {/* Status Badge */}
                          {isPending ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 border border-amber-300/60">
                              <Clock className="h-3 w-3" />
                              To Be Paid
                            </span>
                          ) : tx.status === "paid" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 border border-emerald-300/60">
                              <CheckCircle2 className="h-3 w-3" />
                              Paid
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              {tx.status}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                          {isCredit ? "Earned from lending to" : "Borrowing from"}{" "}
                          <strong className="text-slate-700 dark:text-slate-200">
                            {tx.other_party_name}
                          </strong>
                        </p>

                        {/* Rent & Deposit Breakdown */}
                        <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                          <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md font-semibold">
                            Rent: {formatRupees(tx.rent_amount)}
                          </span>
                          <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md font-semibold">
                            Deposit: {formatRupees(tx.deposit_amount)}
                          </span>
                          {tx.refunded_amount > 0 && (
                            <span className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-md font-semibold">
                              Refunded: {formatRupees(tx.refunded_amount)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Amount & Actions */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 dark:border-slate-800">
                      <div className="text-left sm:text-right">
                        <p
                          className={`text-lg sm:text-xl font-black tracking-tight ${
                            isPending
                              ? "text-amber-600 dark:text-amber-400"
                              : isCredit
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          {isPending ? "" : isCredit ? "+ " : "- "}
                          {formatRupees(
                            isCredit
                              ? tx.total_amount
                              : tx.rent_amount + Math.max(0, tx.deposit_amount - tx.refunded_amount)
                          )}
                        </p>
                        <p className="text-[11px] text-slate-400 font-medium">
                          Total Order: {formatRupees(tx.total_amount)}
                        </p>
                      </div>

                      {/* Pay Now Button for pending items */}
                      {isPending ? (
                        <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                          <PayNowButton
                            borrowRequest={{
                              id: tx.borrow_request_id,
                              resource: { title: tx.item_title },
                            }}
                            onPaid={fetchTransactions}
                          />
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-1 font-mono">
                          <span>Tx: {tx.razorpay_payment_id || tx.id.slice(0, 10)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer date */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                    <span>
                      {tx.created_at
                        ? new Date(tx.created_at).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Pending Checkout"}
                    </span>
                    <span className="font-semibold uppercase tracking-wider text-slate-500">
                      {tx.borrow_status.replace("_", " ")}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Transaction Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl">
            <button
              onClick={() => setSelectedTransaction(null)}
              className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="text-center mb-6 mt-2">
              <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Transaction Details</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {selectedTransaction.item_title}
              </p>
            </div>
            
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 space-y-3 text-sm">
              <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-700/50">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Status</span>
                <span className="font-bold text-slate-900 dark:text-white capitalize">
                  {selectedTransaction.status || selectedTransaction.borrow_status}
                </span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-700/50">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Type</span>
                <span className={`font-bold ${selectedTransaction.transaction_type === "CREDIT" ? "text-emerald-600" : "text-rose-600"}`}>
                  {selectedTransaction.transaction_type}
                </span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-700/50">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Party</span>
                <span className="font-bold text-slate-900 dark:text-white text-right max-w-[150px] truncate">
                  {selectedTransaction.other_party_name}
                </span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-700/50">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Amount</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  ₹{(selectedTransaction.total_amount / 100).toFixed(2)}
                </span>
              </div>
              {selectedTransaction.razorpay_payment_id && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Txn ID</span>
                  <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                    {selectedTransaction.razorpay_payment_id}
                  </span>
                </div>
              )}
            </div>
            
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => navigate(`/my-bookings?id=${selectedTransaction.borrow_request_id}&tab=${selectedTransaction.transaction_type === "CREDIT" ? "lending" : "borrowing"}`)}
                className="flex-1 bg-primary-600 hover:bg-primary-700 text-white rounded-xl py-2.5 text-sm font-bold shadow-sm transition-colors"
              >
                View Order
              </button>
              <button
                onClick={() => setSelectedTransaction(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl py-2.5 text-sm font-bold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
