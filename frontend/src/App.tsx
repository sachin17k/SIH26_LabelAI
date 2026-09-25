import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/common/Navbar';
import { Sidebar } from './components/common/Sidebar';

import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { InspectionsListPage } from './pages/InspectionsListPage';
import { NewInspectionPage } from './pages/NewInspectionPage';
import { InspectionDetailPage } from './pages/InspectionDetailPage';
import { ProductScanPage } from './pages/ProductScanPage';
import { ProductRepositoryPage } from './pages/ProductRepositoryPage';
import { RuleBookPage } from './pages/RuleBookPage';
import { RuleManagementPage } from './pages/RuleManagementPage';
import { LegalDocumentsPage } from './pages/LegalDocumentsPage';
import { UsersPage } from './pages/UsersPage';

const ProtectedLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          
          <Route
            path="/"
            element={
              <ProtectedLayout>
                <DashboardPage />
              </ProtectedLayout>
            }
          />
          
          <Route
            path="/new-inspection"
            element={
              <ProtectedLayout>
                <NewInspectionPage />
              </ProtectedLayout>
            }
          />

          <Route
            path="/inspections/new"
            element={
              <ProtectedLayout>
                <NewInspectionPage />
              </ProtectedLayout>
            }
          />

          <Route
            path="/repository"
            element={
              <ProtectedLayout>
                <ProductRepositoryPage />
              </ProtectedLayout>
            }
          />

          <Route
            path="/products"
            element={
              <ProtectedLayout>
                <ProductRepositoryPage />
              </ProtectedLayout>
            }
          />

          <Route
            path="/rules"
            element={
              <ProtectedLayout>
                <RuleBookPage />
              </ProtectedLayout>
            }
          />

          <Route
            path="/rules-admin"
            element={
              <ProtectedLayout>
                <RuleManagementPage />
              </ProtectedLayout>
            }
          />

          <Route
            path="/inspections"
            element={
              <ProtectedLayout>
                <InspectionsListPage />
              </ProtectedLayout>
            }
          />

          <Route
            path="/inspections/:id"
            element={
              <ProtectedLayout>
                <InspectionDetailPage />
              </ProtectedLayout>
            }
          />

          <Route
            path="/products/:id/scan"
            element={
              <ProtectedLayout>
                <ProductScanPage />
              </ProtectedLayout>
            }
          />

          <Route
            path="/products/:id"
            element={
              <ProtectedLayout>
                <ProductScanPage />
              </ProtectedLayout>
            }
          />

          <Route
            path="/legal-documents"
            element={
              <ProtectedLayout>
                <LegalDocumentsPage />
              </ProtectedLayout>
            }
          />

          <Route
            path="/users"
            element={
              <ProtectedLayout>
                <UsersPage />
              </ProtectedLayout>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
