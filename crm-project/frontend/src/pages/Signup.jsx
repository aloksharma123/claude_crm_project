import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, saveSession } from "../api";
import GoogleButton from "../components/GoogleButton.jsx";

export default function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ organizationName: "", fullName: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api.signup(form);
      saveSession(data.token, data.user);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-brand">Fieldstone</div>
        <div className="auth-tagline">Set up your company's workspace</div>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Company name</label>
            <input value={form.organizationName} onChange={(e) => update("organizationName", e.target.value)} required />
          </div>
          <div className="field">
            <label>Your name</label>
            <input value={form.fullName} onChange={(e) => update("fullName", e.target.value)} required />
          </div>
          <div className="field">
            <label>Email</label>
            <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} required />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={form.password} onChange={(e) => update("password", e.target.value)} required minLength={8} />
          </div>
          <button className="btn btn-primary btn-block" disabled={loading}>
            {loading ? "Creating workspace…" : "Create workspace"}
          </button>
        </form>

        <div className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>

        <GoogleButton onError={setError} />
      </div>
    </div>
  );
}
