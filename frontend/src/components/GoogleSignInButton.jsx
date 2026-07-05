import { useEffect, useRef } from "react";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

/**
 * Renders Google's official "Sign in with Google" button using the Google Identity
 * Services script (loaded in index.html). Calls onCredential(idToken) once the user
 * completes the Google popup/flow -- the caller is responsible for sending that token
 * to the backend's /auth/google endpoint.
 */
export default function GoogleSignInButton({ onCredential, text = "continue_with" }) {
  const buttonRef = useRef(null);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return undefined;

    let cancelled = false;
    let pollInterval;
    let pollTimeout;

    const renderButton = () => {
      if (cancelled || !buttonRef.current || !window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => {
          if (response?.credential) {
            onCredential(response.credential);
          }
        },
      });
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: "outline",
        size: "large",
        width: 344,
        text,
      });
    };

    if (window.google?.accounts?.id) {
      renderButton();
    } else {
      // The GIS script tag is async/defer, so it may not have loaded yet on first
      // mount -- poll briefly until it has, then give up after 10s.
      pollInterval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(pollInterval);
          renderButton();
        }
      }, 200);
      pollTimeout = setTimeout(() => clearInterval(pollInterval), 10000);
    }

    return () => {
      cancelled = true;
      clearInterval(pollInterval);
      clearTimeout(pollTimeout);
    };
  }, [onCredential, text]);

  if (!GOOGLE_CLIENT_ID) {
    return (
      <p className="rounded-md border border-dashed border-ink-100 p-3 text-center text-xs text-ink-400">
        Google Sign-In isn't configured for this deployment yet.
      </p>
    );
  }

  return <div ref={buttonRef} className="flex justify-center" />;
}
