import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/common/Navbar';
import { Sidebar } from './components/common/Sidebar';

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

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
          <Route
            path="/"
            element={
              <MainLayout>
                <DashboardPage />
              </MainLayout>
            }
          />
          
          <Route
            path="/new-inspection"
            element={
              <MainLayout>
                <NewInspectionPage />
              </MainLayout>
            }
          />

          <Route
            path="/inspections/new"
            element={
              <MainLayout>
                <NewInspectionPage />
              </MainLayout>
            }
          />

          <Route
            path="/repository"
            element={
              <MainLayout>
                <ProductRepositoryPage />
              </MainLayout>
            }
          />

          <Route
            path="/products"
            element={
              <MainLayout>
                <ProductRepositoryPage />
              </MainLayout>
            }
          />

          <Route
            path="/rules"
            element={
              <MainLayout>
                <RuleBookPage />
              </MainLayout>
            }
          />

          <Route
            path="/rules-admin"
            element={
              <MainLayout>
                <RuleManagementPage />
              </MainLayout>
            }
          />

          <Route
            path="/inspections"
            element={
              <MainLayout>
                <InspectionsListPage />
              </MainLayout>
            }
          />

          <Route
            path="/inspections/:id"
            element={
              <MainLayout>
                <InspectionDetailPage />
              </MainLayout>
            }
          />

          <Route
            path="/products/:id/scan"
            element={
              <MainLayout>
                <ProductScanPage />
              </MainLayout>
            }
          />

          <Route
            path="/products/:id"
            element={
              <MainLayout>
                <ProductScanPage />
              </MainLayout>
            }
          />

          <Route
            path="/legal-documents"
            element={
              <MainLayout>
                <LegalDocumentsPage />
              </MainLayout>
            }
          />

          <Route
            path="/users"
            element={
              <MainLayout>
                <UsersPage />
              </MainLayout>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
