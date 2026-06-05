import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const LANGUAGES = [
  { code: 'EN', label: 'English' }, { code: 'ES', label: 'Spanish' },
  { code: 'FR', label: 'French' }, { code: 'DE', label: 'German' },
  { code: 'IT', label: 'Italian' }, { code: 'PT', label: 'Portuguese' },
  { code: 'RU', label: 'Russian' }, { code: 'ZH', label: 'Chinese' },
  { code: 'JA', label: 'Japanese' }, { code: 'KO', label: 'Korean' },
  { code: 'AR', label: 'Arabic' }, { code: 'TR', label: 'Turkish' },
  { code: 'PL', label: 'Polish' }, { code: 'NL', label: 'Dutch' },
  { code: 'UK', label: 'Ukrainian' },
];

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '', preferredLanguage: 'EN' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      await register(form.username, form.email, form.password, form.preferredLanguage);
      navigate('/chat');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>
          <span style={styles.logoIcon}>🌐</span>
          <h1 style={styles.logoText}>ChatGlobe</h1>
        </div>
        <p style={styles.subtitle}>Create your account</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Username</label>
            <input style={styles.input} value={form.username} onChange={set('username')} placeholder="yourname" required minLength={2} maxLength={30} autoFocus />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input type="email" style={styles.input} value={form.email} onChange={set('email')} placeholder="you@example.com" required />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input type="password" style={styles.input} value={form.password} onChange={set('password')} placeholder="Min 6 characters" required />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>My language — chat will be translated into this</label>
            <select style={styles.select} value={form.preferredLanguage} onChange={set('preferredLanguage')}>
              {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </div>
          {error && <p style={styles.error}>{error}</p>}
          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p style={styles.footer}>
          Already have an account? <Link to="/login" style={styles.link}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', background: '#f5f5f5', padding: '1rem' },
  card: { background: '#fff', borderRadius: '12px', border: '1px solid #e0e0e0', padding: '2.5rem 2rem', width: '100%', maxWidth: '400px' },
  logo: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' },
  logoIcon: { fontSize: '28px' },
  logoText: { fontSize: '22px', fontWeight: '600' },
  subtitle: { color: '#6b7280', marginBottom: '2rem', fontSize: '13px' },
  form: { display: 'flex', flexDirection: 'column', gap: '14px' },
  field: { display: 'flex', flexDirection: 'column', gap: '5px' },
  label: { fontSize: '13px', fontWeight: '500', color: '#374151' },
  input: { padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '7px', outline: 'none', fontSize: '14px' },
  select: { padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '7px', outline: 'none', fontSize: '14px', background: '#fff' },
  error: { color: '#dc2626', fontSize: '13px', background: '#fef2f2', padding: '8px 12px', borderRadius: '6px' },
  button: { padding: '10px', background: '#2563eb', color: '#fff', borderRadius: '7px', fontWeight: '500', fontSize: '14px', cursor: 'pointer', marginTop: '4px' },
  footer: { marginTop: '1.5rem', textAlign: 'center', color: '#6b7280', fontSize: '13px' },
  link: { color: '#2563eb', fontWeight: '500' },
};
