import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

/**
 * Drop-in replacement for <input type="password">, with a toggle button to
 * reveal/hide the value. Accepts the same props a plain <input> would.
 */
export default function PasswordInput({
  id,
  value,
  onChange,
  placeholder,
  required = false,
  minLength,
  autoComplete,
  className = "",
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? "text" : "password"}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        className={`input pr-10 ${className}`}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setVisible((prev) => !prev)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-300 transition-colors hover:text-ink-600"
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
