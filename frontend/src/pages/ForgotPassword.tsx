import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, University, ArrowLeft, Mail, CheckCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useFirebaseAuth } from '../hooks/useFirebaseAuth';
import axios from 'axios';
import { useToast } from '../hooks/use-toast';

const ALLOWED_EMAILS = [
  'javerdomaraya7@gmail.com',
  'security@bipsu.edu.ph'
];

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { resetPassword } = useFirebaseAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if email is allowed
    if (!ALLOWED_EMAILS.includes(email.toLowerCase())) {
      toast({
        title: 'Access Denied',
        description: 'This email is not authorized to access the system',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Use backend to generate reset link (ensures it goes to frontend URL)
      const resp = await axios.post('http://localhost:8000/api/auth/firebase/reset-password/', { email });
      // If dev, backend returns reset_link. Do not expose link in prod.
      if (resp.data && resp.data.reset_link) {
        console.log('Reset link:', resp.data.reset_link);
      }
      setEmailSent(true);
      toast({
        title: 'Email Sent',
        description: 'Password reset link has been sent to your email',
      });
    } catch (error: any) {
      console.error('Reset password error:', error);
      let errorMessage = 'Failed to send reset email. Please try again.';
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email address';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address format';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many requests. Please try again later';
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
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
            Reset Your Password
          </h1>
        </div>

        {/* Forgot Password Form */}
        <div className="bg-white/10 backdrop-blur-md shadow-2xl rounded-2xl p-8 space-y-6 border border-slate-700/50">
          {!emailSent ? (
            <>
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
                  <Shield className="h-6 w-6 text-blue-400" />
                  Forgot Password
                </h2>
                <p className="text-slate-300 mt-2 text-sm">
                  Enter your email address and we'll send you a link to reset your password
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Email Field */}
                <div>
                  <Label htmlFor="email" className="block text-sm font-medium text-slate-300">
                    Email Address
                  </Label>
                  <div className="mt-1 relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-lg bg-slate-800/60 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                      required
                      autoComplete="email"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-blue-500 transition duration-200 disabled:opacity-50"
                >
                  {isLoading ? 'Sending...' : 'Send Reset Link'}
                </Button>
              </form>

              {/* Back to Login */}
              <div className="text-center pt-4 border-t border-slate-700/50">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition duration-200"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Login
                </Link>
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-green-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Check Your Email</h3>
              <p className="text-slate-300 mb-4">
                We've sent a password reset link to <strong className="text-white">{email}</strong>
              </p>
              <p className="text-sm text-slate-400 mb-6">
                Didn't receive the email? Check your spam folder or try again
              </p>
              <div className="space-y-3">
                <Button
                  onClick={() => setEmailSent(false)}
                  variant="outline"
                  className="w-full border-slate-600 text-slate-300 hover:bg-slate-800/60 hover:text-white"
                >
                  Try Another Email
                </Button>
                <Link to="/login">
                  <Button
                    variant="ghost"
                    className="w-full text-blue-400 hover:text-blue-300 hover:bg-slate-800/60"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Login
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Copyright */}
        <p className="text-center text-sm text-slate-400">© 2025 BIPSU. All rights reserved.</p>
      </div>
    </div>
  );
}
