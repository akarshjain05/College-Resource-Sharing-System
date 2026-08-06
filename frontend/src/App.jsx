import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AppShell from "./layouts/AppShell";
import AdminLayout from "./layouts/AdminLayout";

import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
import NotificationsPage from "./pages/NotificationsPage";
import ComplaintsPage from "./pages/ComplaintsPage";
import ResourceListPage from "./pages/resources/ResourceListPage";
import MyListingsPage from "./pages/resources/MyListingsPage";
import WishlistPage from "./pages/resources/WishlistPage";
import ResourceDetailPage from "./pages/resources/ResourceDetailPage";
import ResourceCreatePage from "./pages/resources/ResourceCreatePage";
import ResourceEditPage from "./pages/resources/ResourceEditPage";
import BorrowRequestsPage from "./pages/borrow/BorrowRequestsPage";
import ProfilePage from "./pages/profile/ProfilePage";
import PublicProfilePage from "./pages/profile/PublicProfilePage";
import WantedPage from "./pages/wanted/WantedPage";
import MyNeedsPage from "./pages/wanted/MyNeedsPage";
import TransactionsPage from "./pages/payments/TransactionsPage";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import AdminCategoriesPage from "./pages/admin/AdminCategoriesPage";
import AdminResourcesPage from "./pages/admin/AdminResourcesPage";
import AdminBorrowsPage from "./pages/admin/AdminBorrowsPage";
import AdminComplaintsPage from "./pages/admin/AdminComplaintsPage";

import NotFoundPage from "./pages/errors/NotFoundPage";
import ForbiddenPage from "./pages/errors/ForbiddenPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" toastOptions={{ style: { fontFamily: "Inter, sans-serif" } }} />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          <Route
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/resources" element={<ResourceListPage />} />
            <Route path="/wishlist" element={<WishlistPage />} />
            <Route path="/my-listings" element={<MyListingsPage />} />
            <Route path="/resources/new" element={<ResourceCreatePage />} />
            <Route path="/resources/:id/edit" element={<ResourceEditPage />} />
            <Route path="/resources/:id" element={<ResourceDetailPage />} />
            <Route path="/my-bookings" element={<BorrowRequestsPage />} />
            <Route path="/borrow-requests" element={<Navigate to="/my-bookings" replace />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/payments" element={<TransactionsPage />} />
            <Route path="/wanted" element={<WantedPage />} />
            <Route path="/campus-needs" element={<Navigate to="/wanted" replace />} />
            <Route path="/my-needs" element={<MyNeedsPage />} />
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
              <Route path="resources" element={<AdminResourcesPage />} />
              <Route path="borrows" element={<AdminBorrowsPage />} />
              <Route path="complaints" element={<AdminComplaintsPage />} />
            </Route>
          </Route>

          <Route path="/" element={<Navigate to="/resources" replace />} />
          <Route path="/403" element={<ForbiddenPage />} />
          <Route path="/404" element={<NotFoundPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
