import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Mail, Clock, RefreshCw, CheckCircle2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function VerificationCodeInput({ email, initialChallengeId, initialExpiresIn = 600, onVerified, onCancel }) {
  const { verifySignupOtp, resendSignupOtp } = useAuth();
  const [challengeId, setChallengeId] = useState(initialChallengeId);
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  
  // Timers
  const [expirySeconds, setExpirySeconds] = useState(initialExpiresIn);
  const [cooldownSeconds, setCooldownSeconds] = useState(60);

  // Expiry countdown timer (10 minutes)
  useEffect(() => {
    if (expirySeconds <= 0) return;
    const timer = setInterval(() => {
      setExpirySeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [expirySeconds]);

  // Resend cooldown timer (60 seconds)
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  const formatTime = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleOtpChange = (e) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
    setOtp(value);
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error("Please enter the complete 6-digit code.");
      return;
    }

    setVerifying(true);
    try {
      await verifySignupOtp({ challenge_id: challengeId, otp });
      toast.success("Email verified successfully! Welcome to CRSS.");
      if (onVerified) onVerified();
    } catch (err) {
      const msg = err.response?.data?.detail || "Invalid or expired verification code.";
      toast.error(msg);
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (cooldownSeconds > 0 || resending) return;

    setResending(true);
    try {
      const res = await resendSignupOtp({ challenge_id: challengeId, email });
      setChallengeId(res.challenge_id);
      setExpirySeconds(res.expires_in || 600);
      setCooldownSeconds(res.resend_available_in || 60);
      setOtp("");
      toast.success("A new verification code has been sent to your email.");
    } catch (err) {
      const msg = err.response?.data?.detail || "Failed to resend code. Please try again.";
      toast.error(msg);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-forest-100 text-forest-700">
          <Mail className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-semibold text-ink-900">Verify your email</h2>
        <p className="mt-1 text-sm text-ink-500">
          We sent a 6-digit code to <span className="font-medium text-ink-800">{email}</span>
        </p>
      </div>

      <form onSubmit={handleVerify} className="space-y-5">
        <div>
          <label className="label text-center mb-2 block">Enter 6-digit verification code</label>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={otp}
            onChange={handleOtpChange}
            placeholder="000000"
            className="input text-center text-2xl tracking-[0.5em] font-mono py-3 font-bold border-2 focus:border-forest-600 focus:ring-forest-600"
            required
            autoFocus
          />
        </div>

        <div className="flex items-center justify-between text-xs text-ink-500 px-1">
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-amber-600" />
            <span>
              Code expires in:{" "}
              <strong className={expirySeconds < 60 ? "text-red-600 font-bold" : "text-ink-700"}>
                {formatTime(expirySeconds)}
              </strong>
            </span>
          </div>

          <button
            type="button"
            onClick={handleResend}
            disabled={cooldownSeconds > 0 || resending}
            className="flex items-center gap-1 font-medium text-forest-700 hover:underline disabled:opacity-50 disabled:no-underline"
          >
            <RefreshCw className={`h-3 w-3 ${resending ? "animate-spin" : ""}`} />
            {cooldownSeconds > 0 ? `Resend code (${cooldownSeconds}s)` : "Resend code"}
          </button>
        </div>

        <button
          type="submit"
          disabled={verifying || otp.length !== 6 || expirySeconds === 0}
          className="btn-primary w-full flex items-center justify-center gap-2 py-2.5"
        >
          {verifying ? (
            "Verifying..."
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4" />
              Verify and Continue
            </>
          )}
        </button>
      </form>

      {onCancel && (
        <div className="text-center pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-ink-400 hover:text-ink-600 underline"
          >
            Use a different registration email
          </button>
        </div>
      )}
    </div>
  );
}
