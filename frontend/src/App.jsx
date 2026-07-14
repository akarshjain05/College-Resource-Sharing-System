import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AppShell from "./layouts/AppShell";
import AdminLayout from "./layouts/AdminLayout";

import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import DashboardPage from "./pages/DashboardPage";
import NotificationsPage from "./pages/NotificationsPage";
import ComplaintsPage from "./pages/ComplaintsPage";
import ResourceListPage from "./pages/resources/ResourceListPage";
import ResourceDetailPage from "./pages/resources/ResourceDetailPage";
import ResourceCreatePage from "./pages/resources/ResourceCreatePage";
import BorrowRequestsPage from "./pages/borrow/BorrowRequestsPage";
import ProfilePage from "./pages/profile/ProfilePage";
import PublicProfilePage from "./pages/profile/PublicProfilePage";
import WantedPage from "./pages/wanted/WantedPage";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import AdminCategoriesPage from "./pages/admin/AdminCategoriesPage";
import AdminComplaintsPage from "./pages/admin/AdminComplaintsPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" toastOptions={{ style: { fontFamily: "Inter, sans-serif" } }} />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          <Route
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/resources" element={<ResourceListPage />} />
            <Route path="/resources/new" element={<ResourceCreatePage />} />
            <Route path="/resources/:id" element={<ResourceDetailPage />} />
            <Route path="/borrow-requests" element={<BorrowRequestsPage />} />
            <Route path="/wanted" element={<WantedPage />} />
            <Route path="/complaints" element={<ComplaintsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/users/:userId" element={<PublicProfilePage />} />

            <Route
              path="/admin"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminDashboardPage />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="categories" element={<AdminCategoriesPage />} />
              <Route path="complaints" element={<AdminComplaintsPage />} />
            </Route>
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
