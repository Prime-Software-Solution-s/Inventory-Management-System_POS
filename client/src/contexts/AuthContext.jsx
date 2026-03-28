import { createContext, useContext, useEffect, useState } from 'react';
import {
  forgotPasswordRequest,
  getCurrentUserRequest,
  loginRequest,
  resetPasswordRequest,
} from '../api/auth';
import { TOKEN_KEY } from '../api/client';

const USER_KEY = 'inventoryos-user';
const AuthContext = createContext(null);

const readStoredUser = () => {
  const storedUser = window.localStorage.getItem(USER_KEY);

  if (!storedUser) {
    return null;
  }

  try {
    return JSON.parse(storedUser);
  } catch {
    return null;
  }
};

const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => window.localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(readStoredUser);
  const [loading, setLoading] = useState(Boolean(window.localStorage.getItem(TOKEN_KEY)));

  const persistSession = (authData) => {
    window.localStorage.setItem(TOKEN_KEY, authData.token);
    window.localStorage.setItem(USER_KEY, JSON.stringify(authData.user));
    setToken(authData.token);
    setUser(authData.user);
  };

  const clearSession = () => {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  };

  useEffect(() => {
    let isMounted = true;

    if (!token) {
      setLoading(false);
      return () => {
        isMounted = false;
      };
    }

    getCurrentUserRequest()
      .then((response) => {
        if (!isMounted) {
          return;
        }

        setUser(response.user);
        window.localStorage.setItem(USER_KEY, JSON.stringify(response.user));
      })
      .catch(() => {
        if (isMounted) {
          clearSession();
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  const login = async (payload) => {
    const response = await loginRequest(payload);
    persistSession(response);
    return response;
  };

  const forgotPassword = async (payload) => forgotPasswordRequest(payload);

  const resetPassword = async (payload) => {
    const response = await resetPasswordRequest(payload);
    persistSession(response);
    return response;
  };

  const logout = () => {
    clearSession();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: Boolean(token && user),
        login,
        forgotPassword,
        resetPassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.');
  }

  return context;
};

export { AuthProvider, useAuth };
