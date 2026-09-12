import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { api } from "../api";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState("checking"); // checking | success | error

  useEffect(() => {
    if (!token) {
      setStatus("error");
      return;
    }
    api.verifyEmail(token)
      .then(() => setStatus("success"))
      .catch(() => setStatus("error"));
  }, [token]);

  return (
    <div className="auth-screen">
      <div className="auth-card" style={{ textAlign: "center" }}>
        <div className="auth-brand">Fieldstone</div>

        {status === "checking" && <div className="page-subtitle">Verifying your email…</div>}

        {status === "success" && (
          <>
            <p>Your email is verified. You're all set.</p>
            <Link to="/" className="btn btn-primary btn-block">Go to dashboard</Link>
          </>
        )}

        {status === "error" && (
          <>
            <div className="error-banner">This link is invalid or has expired.</div>
            <Link to="/login" className="btn btn-secondary btn-block">Back to sign in</Link>
          </>
        )}
      </div>
    </div>
  );
}
