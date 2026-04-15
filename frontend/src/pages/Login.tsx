import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { Shield, University, Eye, EyeOff, Mail, Lock, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/use-toast';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import axios from 'axios';

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({ email: '', password: '' });
  const { user, signIn } = useAuth();
  const { toast } = useToast();

  if (user) {
    const role = user.profile?.role;
    if (role === 'admin') {
      return <Navigate to="/admin" replace />;
    } else if (role === 'security') {
      return <Navigate to="/security" replace />;
    }
    return <Navigate to="/" replace />;
  }

  const validateForm = () => {
    const newErrors = { email: '', password: '' };
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email format';
    if (!formData.password) newErrors.password = 'Password is required';
    setErrors(newErrors);
    return !newErrors.email && !newErrors.password;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);

    try {
      console.log('Signing in with Firebase...');
      // Sign in with Firebase
      const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
      const idToken = await userCredential.user.getIdToken();

      console.log('Firebase user:', userCredential.user.email);

      // Verify with Django backend
      const response = await axios.post('http://localhost:8000/api/auth/firebase/verify/', {
        idToken
      });

      console.log('Django response:', response.data);

      if (response.data && response.data.access && response.data.refresh) {
        // Create user object from response
        const userData = response.data.user;
        
        // Use role from backend
        const role = userData.role;
        
        console.log('User role:', userData.role);
        
        // Create auth user object
        const authUser = {
          id: userData.id.toString(),
          email: userData.email,
          profile: {
            id: userData.id.toString(),
            email: userData.email,
            full_name: userData.username || userCredential.user.displayName || '',
            role: role as 'admin' | 'security',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          accessToken: response.data.access,
          refreshToken: response.data.refresh,
        };
        
        // Store tokens and user data
        localStorage.setItem('access_token', response.data.access);
        localStorage.setItem('refresh_token', response.data.refresh);
        localStorage.setItem('user_data', JSON.stringify(authUser));
        
        console.log('[LOGIN] Stored auth data:', authUser);
        
        toast({
          title: 'Login Successful',
          description: `Welcome back, ${role}!`,
        });
        
        // Redirect based on role
        const destination = role === 'admin' ? '/admin' : '/security';
        console.log('Redirecting to:', destination);
        
        // Force navigation and reload to apply auth state
        window.location.href = destination;
      }
    } catch (error: any) {
      console.error('Login error:', error);
      let errorMessage = 'Login failed. Please try again.';
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email address.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password. Please try again.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address format.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your connection.';
      }

      toast({
        title: 'Login Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      
      if (!userCredential.user.email) {
        toast({
          title: 'Login Failed',
          description: 'Unable to retrieve email from Google account.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      const idToken = await userCredential.user.getIdToken();

      // Verify with Django backend
      const response = await axios.post('http://localhost:8000/api/auth/firebase/verify/', {
        idToken
      });

      if (response.data && response.data.access && response.data.refresh) {
        // Create user object from response
        const userData = response.data.user;
        
        // Use role from backend
        const role = userData.role;
        
        console.log('User role:', userData.role);
        
        // Create auth user object
        const authUser = {
          id: userData.id.toString(),
          email: userData.email,
          profile: {
            id: userData.id.toString(),
            email: userData.email,
            full_name: userData.username || userCredential.user.displayName || '',
            role: role as 'admin' | 'security',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          accessToken: response.data.access,
          refreshToken: response.data.refresh,
        };
        
        // Store tokens and user data
        localStorage.setItem('access_token', response.data.access);
        localStorage.setItem('refresh_token', response.data.refresh);
        localStorage.setItem('user_data', JSON.stringify(authUser));
        
        console.log('[LOGIN] Stored auth data:', authUser);
        
        toast({
          title: 'Login Successful',
          description: `Welcome, ${role}!`,
        });
        
        // Redirect based on role
        const destination = role === 'admin' ? '/admin' : '/security';
        console.log('Redirecting to:', destination);
        
        // Force navigation and reload to apply auth state
        window.location.href = destination;
      }
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      let errorMessage = 'Google sign-in failed. Please try again.';
      
      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Sign-in cancelled. Please try again.';
      } else if (error.code === 'auth/popup-blocked') {
        errorMessage = 'Pop-up blocked. Please allow pop-ups and try again.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your connection.';
      }

      toast({
        title: 'Google Sign-In Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-dark-bg min-h-screen flex items-center justify-center w-full px-4 py-12 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
      <div className="w-full max-w-md space-y-6">
        {/* Logo and Title */}
        <div className="flex flex-col items-center text-center">
          <div className="relative">
            <img
              src="/Bipsu_new.png"
              alt="BIPSU Logo"
              className="w-32 h-32 md:w-40 md:h-40 object-contain animate-spin-slow"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                if (fallback) fallback.style.display = 'flex';
              }}
            />
            <div
              id="logo-fallback"
              className="w-32 h-32 md:w-40 md:h-40 flex items-center justify-center animate-spin-slow"
              style={{ display: 'none' }}
            >
              <University className="w-full h-full text-blue-400" />
            </div>
          </div>
          <h1 className="text-lg md:text-xl font-semibold text-white mt-4 leading-tight">
            Automated Detection of Student Uniform Compliance
          </h1>
        </div>

        {/* Redesigned Login Card */}
        <div className="w-full bg-slate-900/60 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl p-8 md:p-10 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 pointer-events-none"></div>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50"></div>
          <div className="relative space-y-8">
            <h2 className="text-2xl font-bold text-center text-white flex items-center justify-center gap-2 pb-2">
              <Shield className="h-6 w-6 text-blue-400" />
              System Login
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="w-full space-y-2 group">
                  <Label htmlFor="email" className="block text-sm font-medium transition-colors duration-200 text-slate-400">Email Address</Label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 transition-colors duration-200 group-focus-within:text-blue-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="student@bipsu.edu.ph"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className={`w-full bg-slate-800/50 text-slate-100 placeholder-slate-500 border border-slate-700 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200 shadow-sm hover:border-slate-600 ${errors.email ? 'ring-rose-500' : ''}`}
                      required
                      autoComplete="email"
                    />
                  </div>
                  {errors.email && <p className="mt-1 text-sm text-red-400">{errors.email}</p>}
                </div>

                <div className="w-full space-y-2 group">
                  <Label htmlFor="password" className="block text-sm font-medium transition-colors duration-200 text-slate-400">Password</Label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                      <Lock className="w-4 h-4" />
                    </div>
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className={`w-full bg-slate-800/50 text-slate-100 placeholder-slate-500 border border-slate-700 rounded-xl py-3 pl-10 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200 shadow-sm hover:border-slate-600 ${errors.password ? 'ring-rose-500' : ''}`}
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 focus:outline-none transition-colors p-1 rounded-md"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="mt-1 text-sm text-red-400">{errors.password}</p>}
                  <div className="flex justify-end pt-1">
                    <Link to="/forgot-password" className="text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors focus:outline-none focus:underline">Forgot password?</Link>
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="relative inline-flex items-center justify-center px-6 py-3 text-sm font-semibold tracking-wide transition-all duration-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-70 disabled:cursor-not-allowed text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-500/25 border border-transparent hover:scale-[1.02] active:scale-[0.98] w-full h-12 text-base shadow-blue-900/20"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </button>

                {/* Removed 'System Operational' status indicator */}
              </div>
            </form>
          </div>
        </div>

        {/* Copyright */}
        <p className="text-xs text-slate-500 text-center">© 2025 BIPSU. All rights reserved. <br /><span className="text-slate-600">Secure Automated Compliance Portal</span></p>
      </div>
    </div>
  );
}