import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || '';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('chat_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    axios.get(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(({ data }) => setUser(data.user))
      .catch(() => { localStorage.removeItem('chat_token'); setToken(null); })
      .finally(() => setLoading(false));
  }, [token]);

  const login = useCallback(async (email, password) => {
    const { data } = await axios.post(`${API}/api/auth/login`, { email, password });
    localStorage.setItem('chat_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data;
  }, []);

  const register = useCallback(async (username, email, password, preferredLanguage) => {
    const { data } = await axios.post(`${API}/api/auth/register`, { username, email, password, preferredLanguage });
    localStorage.setItem('chat_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('chat_token');
    setToken(null);
    setUser(null);
  }, []);

  const updateLanguage = useCallback(async (lang) => {
    const { data } = await axios.patch(`${API}/api/auth/language`,
      { preferredLanguage: lang },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    setUser(data.user);
    // Update stored token payload isn't critical — just update user state
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateLanguage }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
