import React, { useState, useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Layout } from "@/components/Layout";
import SplashScreen from "@/components/SplashScreen";
import Index from "./pages/Index";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AdminDashboard from "./pages/AdminDashboard";
import SecurityDashboard from "./pages/SecurityDashboard";
import UserManagement from "./pages/UserManagement";
import Reports from "./pages/Reports";
import ComplianceLogs from "./pages/ComplianceLogs";
import CameraMonitoring from "./pages/CameraMonitoring";
import IdentifyViolations from "./pages/IdentifyViolations";
import ViolationReview from "./pages/ViolationReview";
import About from "./pages/About";
import Unauthorized from "./pages/Unauthorized";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 3000); // Show splash for 3 seconds

    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return <SplashScreen />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/admin" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Layout>
                    <AdminDashboard />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/admin/users" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Layout>
                    <UserManagement />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/admin/reports" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Layout>
                    <Reports />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/admin/cameras" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Layout>
                    <CameraMonitoring />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/admin/review-violations" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Layout>
                    <ViolationReview />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/security" element={
                <ProtectedRoute allowedRoles={['security']}>
                  <Layout>
                    <SecurityDashboard />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/security/logs" element={
                <ProtectedRoute allowedRoles={['security']}>
                  <Layout>
                    <ComplianceLogs />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/security/identify-violations" element={
                <ProtectedRoute allowedRoles={['security']}>
                  <Layout>
                    <IdentifyViolations />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/about" element={
                <ProtectedRoute>
                  <Layout>
                    <About />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/unauthorized" element={<Unauthorized />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
