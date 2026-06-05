import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/chat');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>
          <span style={styles.logoIcon}>🌐</span>
          <h1 style={styles.logoText}>ChatGlobe</h1>
        </div>
        <p style={styles.subtitle}>Real-time chat with AI translation</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              style={styles.input}
              placeholder="you@example.com"
              required
              autoFocus
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              style={styles.input}
              placeholder="••••••••"
              required
            />
          </div>
          {error && <p style={styles.error}>{error}</p>}
          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p style={styles.footer}>
          No account? <Link to="/register" style={styles.link}>Create one</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', background: '#f5f5f5', padding: '1rem' },
  card: { background: '#fff', borderRadius: '12px', border: '1px solid #e0e0e0', padding: '2.5rem 2rem', width: '100%', maxWidth: '380px' },
  logo: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' },
  logoIcon: { fontSize: '28px' },
  logoText: { fontSize: '22px', fontWeight: '600', color: '#1a1a1a' },
  subtitle: { color: '#6b7280', marginBottom: '2rem', fontSize: '13px' },
  form: { display: 'flex', flexDirection: 'column', gap: '16px' },
  field: { display: 'flex', flexDirection: 'column', gap: '5px' },
  label: { fontSize: '13px', fontWeight: '500', color: '#374151' },
  input: { padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '7px', outline: 'none', fontSize: '14px', transition: 'border-color 0.15s' },
  error: { color: '#dc2626', fontSize: '13px', background: '#fef2f2', padding: '8px 12px', borderRadius: '6px' },
  button: { padding: '10px', background: '#2563eb', color: '#fff', borderRadius: '7px', fontWeight: '500', fontSize: '14px', cursor: 'pointer', marginTop: '4px' },
  footer: { marginTop: '1.5rem', textAlign: 'center', color: '#6b7280', fontSize: '13px' },
  link: { color: '#2563eb', fontWeight: '500' },
};
