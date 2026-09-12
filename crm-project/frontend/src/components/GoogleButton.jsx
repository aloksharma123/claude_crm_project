import { useEffect, useRef } from "react";
import { api, saveSession } from "../api";

export default function GoogleButton({ onError }) {
  const divRef = useRef(null);

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) return; // Google sign-in not configured — button just won't render

    function handleCredential(response) {
      api.googleLogin(response.credential)
        .then(({ token, user }) => {
          saveSession(token, user);
          window.location.href = "/";
        })
        .catch((err) => onError?.(err.message));
    }

    function render() {
      if (!window.google || !divRef.current) return;
      window.google.accounts.id.initialize({ client_id: clientId, callback: handleCredential });
      window.google.accounts.id.renderButton(divRef.current, {
        theme: "outline",
        size: "large",
        width: 308,
      });
    }

    if (window.google) {
      render();
    } else {
      const interval = setInterval(() => {
        if (window.google) {
          clearInterval(interval);
          render();
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [onError]);

  if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) return null;

  return (
    <div style={{ margin: "18px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "0 0 14px", fontSize: 12, color: "var(--ink-soft)" }}>
        <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
        or
        <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
      </div>
      <div ref={divRef} />
    </div>
  );
}
