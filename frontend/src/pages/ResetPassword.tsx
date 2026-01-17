import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { auth } from '@/lib/firebase';
import { verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useToast } from '../hooks/use-toast';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const code = searchParams.get('oobCode') || '';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [valid, setValid] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const verify = async () => {
      if (!code) {
        setLoading(false);
        toast({ title: 'Error', description: 'Invalid or missing reset code.', variant: 'destructive' });
        return;
      }
      try {
        const emailFromCode = await verifyPasswordResetCode(auth, code);
        setEmail(emailFromCode);
        setValid(true);
      } catch (err: any) {
        console.error('Invalid reset code:', err);
        toast({ title: 'Error', description: 'Reset link is invalid or expired.', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, [code]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password || password.length < 6) {
      toast({ title: 'Error', description: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      await confirmPasswordReset(auth, code, password);
      toast({ title: 'Success', description: 'Password successfully updated. Please login.' });
      setTimeout(() => navigate('/login'), 1000);
    } catch (err: any) {
      console.error('Confirm password error', err);
      toast({ title: 'Error', description: err?.message || 'Failed to reset password', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-dark-bg min-h-screen flex items-center justify-center w-full px-4 py-12 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center text-center">
          <div className="relative">
            <img src="/Bipsu_new.png" alt="BIPSU Logo" className="w-32 h-32 md:w-40 md:h-40 object-contain" />
          </div>
          <h1 className="text-lg md:text-xl font-semibold text-white mt-4 leading-tight">Reset Password</h1>
        </div>

        <div className="bg-white/10 backdrop-blur-md shadow-2xl rounded-2xl p-8 space-y-6 border border-slate-700/50">
          {loading ? (
            <div className="text-center">Verifying...</div>
          ) : valid ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="email" className="text-sm text-slate-300">Email</Label>
                <Input id="email" type="email" value={email} disabled className="bg-slate-800/60" />
              </div>

              <div>
                <Label htmlFor="password" className="text-sm text-slate-300">New Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter new password" />
              </div>

              <Button type="submit" disabled={loading} className="w-full">{loading ? 'Saving...' : 'Save New Password'}</Button>

              <div className="text-center mt-4">
                <Link to="/login" className="text-sm text-blue-400 hover:text-blue-300">Back to Login</Link>
              </div>
            </form>
          ) : (
            <div className="text-center">
              <p className="text-slate-300">Reset link invalid or expired.</p>
              <div className="mt-4">
                <Link to="/forgot-password" className="text-blue-400 hover:text-blue-300">Request another reset</Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
