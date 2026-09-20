import { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { api, saveSession } from "../api";

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api.acceptInvite({ token, password });
      saveSession(data.token, data.user);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="auth-screen">
        <div className="auth-card" style={{ textAlign: "center" }}>
          <div className="auth-brand">Fieldstone</div>
          <div className="error-banner">This invite link is missing its token.</div>
          <Link to="/login" className="btn btn-secondary btn-block">Back to sign in</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-brand">Fieldstone</div>
        <div className="auth-tagline">Set a password to join your team's workspace</div>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
          </div>
          <button className="btn btn-primary btn-block" disabled={loading}>
            {loading ? "Setting up…" : "Join workspace"}
          </button>
        </form>
      </div>
    </div>
  );
}
