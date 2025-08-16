import React, { createContext, useContext, useEffect, useState } from 'react';
import axios from './axios';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/me/', { withCredentials: true })
      .then(res => setUser(res.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (username, password) => {
    await axios.post('/login/', { username, password }, { withCredentials: true });
    // Always fetch /me/ after login to get full user object
    const meRes = await axios.get('/me/', { withCredentials: true });
    setUser(meRes.data);
    return meRes;
  };

  const logout = async () => {
    await axios.post('/logout/', {}, { withCredentials: true });
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
