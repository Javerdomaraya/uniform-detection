import { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { AuthUser, UserProfile } from '@/types/auth';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing auth on mount
    const storedAccessToken = localStorage.getItem('access_token');
    const storedRefreshToken = localStorage.getItem('refresh_token');
    const storedUserData = localStorage.getItem('user_data');
    
    if (storedAccessToken && storedUserData) {
      try {
        const userData = JSON.parse(storedUserData);
        setUser({
          id: userData.id,
          email: userData.email,
          profile: userData.profile,
          accessToken: storedAccessToken,
          refreshToken: storedRefreshToken || '',
        });
        console.log('[AUTH] Restored session:', userData);
      } catch (error) {
        console.error('[AUTH] Failed to restore session:', error);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_data');
      }
    }
    setLoading(false);
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      // Step 1: Get the access and refresh tokens
      const tokenResponse = await axios.post('/api/token/', {
        username: email, // Django JWT uses 'username' by default, using email as username
        password: password,
      });

      const accessToken = tokenResponse.data.access;
      const refreshToken = tokenResponse.data.refresh;

      // Step 2: Use the token to fetch the user profile
      const profileResponse = await axios.get('/api/user/profile/', {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      // Step 3: Set the user and profile in your Auth context
      const userData = profileResponse.data;
      const user = {
        id: userData.id.toString(),
        email: userData.email,
        profile: {
          id: userData.id.toString(),
          email: userData.email,
          full_name: userData.username, // Using username as full_name for now
          role: userData.role as 'admin' | 'security',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        accessToken: accessToken,
        refreshToken: refreshToken,
      };

      setUser(user);
      
      // Store in localStorage for persistence
      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('refresh_token', refreshToken);
      localStorage.setItem('user_data', JSON.stringify(user));
      
      console.log('[AUTH] User logged in:', user);
      
      return {};

    } catch (error: any) {
      console.error('Login error:', error.response);
      return { error: error.response?.data?.detail || 'An unexpected error occurred.' };
    }
  };

  const signOut = async () => {
    setUser(null);
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_data');
    console.log('[AUTH] User logged out');
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};