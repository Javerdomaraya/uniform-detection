import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect based on user role
  const role = user.profile?.role;
  if (role === 'admin') {
    return <Navigate to="/admin" replace />;
  } else if (role === 'security') {
    return <Navigate to="/security" replace />;
  }

  // Fallback if no role is set
  return <Navigate to="/login" replace />;
};

export default Index;
