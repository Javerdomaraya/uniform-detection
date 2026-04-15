import { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import apiClient from '@/lib/axios';

export const useFirebaseAuth = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Login with email and password
  const loginWithEmail = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // Sign in with Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await userCredential.user.getIdToken();
      
      // Send token to Django backend
      const response = await apiClient.post('/api/auth/firebase/login/', {
        idToken
      });
      
      // Store token and user data
      localStorage.setItem('firebase_token', idToken);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      setLoading(false);
      return response.data;
    } catch (err: unknown) {
      const firebaseErr = err as { message?: string };
      setError(firebaseErr.message || 'Login failed');
      setLoading(false);
      throw err;
    }
  };

  // Register with email and password
  const registerWithEmail = async (email: string, password: string, displayName: string = '') => {
    setLoading(true);
    setError(null);
    
    try {
      // Create user in Firebase
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const idToken = await userCredential.user.getIdToken();
      
      // Send to Django backend
      const response = await apiClient.post('/api/auth/firebase/register/', {
        email,
        password,
        displayName,
        role: 'security'
      });
      
      // Store token and user data
      localStorage.setItem('firebase_token', idToken);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      setLoading(false);
      return response.data;
    } catch (err: unknown) {
      const firebaseErr = err as { message?: string };
      setError(firebaseErr.message || 'Registration failed');
      setLoading(false);
      throw err;
    }
  };

  // Login with Google
  const loginWithGoogle = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const idToken = await userCredential.user.getIdToken();
      
      // Send token to Django backend
      const response = await apiClient.post('/api/auth/firebase/login/', {
        idToken
      });
      
      // Store token and user data
      localStorage.setItem('firebase_token', idToken);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      setLoading(false);
      return response.data;
    } catch (err: unknown) {
      const firebaseErr = err as { message?: string };
      setError(firebaseErr.message || 'Google login failed');
      setLoading(false);
      throw err;
    }
  };

  // Logout
  const logout = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await signOut(auth);
      localStorage.removeItem('firebase_token');
      localStorage.removeItem('user');
      setLoading(false);
    } catch (err: unknown) {
      const firebaseErr = err as { message?: string };
      setError(firebaseErr.message || 'Logout failed');
      setLoading(false);
      throw err;
    }
  };

  // Reset Password
  const resetPassword = async (email: string) => {
    setLoading(true);
    setError(null);
    
    try {
      await sendPasswordResetEmail(auth, email);
      setLoading(false);
      return true;
    } catch (err: unknown) {
      const firebaseErr = err as { message?: string };
      setError(firebaseErr.message || 'Password reset failed');
      setLoading(false);
      throw err;
    }
  };

  return {
    loginWithEmail,
    registerWithEmail,
    loginWithGoogle,
    logout,
    resetPassword,
    loading,
    error
  };
};
