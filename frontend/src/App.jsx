import "./App.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./utils/ProtectedRoute.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Categories from "./components/admin/category/Category.jsx";
import Summary from "./components/admin/dashboard/Summary.jsx";
import { ToastContainer } from "react-toastify";
import LandingPage from "./pages/LandingPage.jsx";
import Unauthorized from "./pages/unauthorized/Unauthorized.jsx";
import CustomerOrderPortal from "./components/customer/CustomerOrderPortal/CustomerOrderPortal";
import CustomerProducts from "./components/customer/customerProduct/CustomerProducts.jsx";
import Suppliers from "./components/admin/supplier/Suppliers.jsx";
import Users from "./components/admin/user/Users.jsx";
import PlacedOrders from "./components/admin/purchase/PlacedOrders.jsx";
import Profile from "./components/share-component/profile/Profile.jsx";
import AdminCompletedHistory from "./components/share-component/history/AdminCompletedHistory.jsx";
import StaffCompletedHistory from "./components/share-component/history/StaffCompletedHistory.jsx";
import CustomerCompletedHistory from "./components/share-component/history/CustomerCompletedHistory.jsx";
import Product from "./components/share-component/product/Product.jsx";
import Logout from "./components/share-component/logout/Logout.jsx";
import CompleteProfile from "./components/share-component/complete-profile/CompleteProfile.jsx";
import StaffOrders from "./components/staff/orders/StaffOrders.jsx";
import StaffPlacedOrders from "./components/staff/placedOrders/StaffPlacedOrders.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";

// ✅ New pages
import SettingsPage from "./components/admin/settings/SettingsPage.jsx";
import ExpiringOrders from "./components/admin/expiring/ExpiringOrders.jsx";

// ✅ Wholesale pages — reuse customer components with wholesale pricing applied at API level
// The product page and cart page are the same components; pricing is controlled server-side
// based on the logged-in user's role.
// We import CustomerCompletedHistory for wholesale history too (same UI, role-filtered data)

export const BASE_URL = import.meta.env.VITE_API_URL;

function App() {
  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick={true}
        pauseOnFocusLoss={true}
        draggable={true}
        pauseOnHover={true}
        limit={3}
        theme="colored"
      />
      <Router>
        <Routes>
          {/* ── Public ── */}
          <Route path="/"                  element={<LandingPage />} />
          <Route path="/complete-profile"  element={<CompleteProfile />} />
          <Route path="/forgot-password"   element={<ForgotPassword />} />
          <Route path="/reset-password"    element={<ResetPassword />} />

          {/* ── Admin Dashboard ── */}
          <Route
            path="/admin-dashboard/*"
            element={
              <ProtectedRoute requireRole={["admin"]}>
                <Dashboard />
              </ProtectedRoute>
            }
          >
            <Route index                    element={<Summary />} />
            <Route path="categories"        element={<Categories />} />
            <Route path="products"          element={<Product />} />
            <Route path="suppliers"         element={<Suppliers />} />
            <Route path="placed-orders"     element={<PlacedOrders />} />
            <Route path="completed-history" element={<AdminCompletedHistory />} />
            <Route path="profile"           element={<Profile />} />
            <Route path="users"             element={<Users />} />
            {/* ✅ New admin routes */}
            <Route path="expiring-orders"   element={<ExpiringOrders />} />
            <Route path="settings"          element={<SettingsPage />} />
            <Route path="logout"            element={<Logout />} />
          </Route>

          {/* ── Staff Dashboard ── */}
          <Route
            path="/customer-dashboard/*"
            element={
              <ProtectedRoute requireRole={["staff"]}>
                <Dashboard />
              </ProtectedRoute>
            }
          >
            <Route index                    element={<CustomerProducts />} />
            <Route path="orders"            element={<StaffOrders />} />
            <Route path="placed-orders"     element={<StaffPlacedOrders />} />
            <Route path="completed-history" element={<StaffCompletedHistory />} />
            <Route path="profile"           element={<Profile />} />
            <Route path="logout"            element={<Logout />} />
          </Route>

          {/* ── Customer Dashboard ── */}
          <Route
            path="/user-dashboard/*"
            element={
              <ProtectedRoute requireRole={["customer"]}>
                <Dashboard />
              </ProtectedRoute>
            }
          >
            <Route index                    element={<CustomerProducts />} />
            <Route path="orders"            element={<CustomerOrderPortal />} />
            <Route path="completed-history" element={<CustomerCompletedHistory />} />
            <Route path="profile"           element={<Profile />} />
            <Route path="logout"            element={<Logout />} />
          </Route>

          {/* ── Wholesale Dashboard ── */}
          {/* Uses the same components as customer — pricing is role-filtered server-side */}
          <Route
            path="/wholesale-dashboard/*"
            element={
              <ProtectedRoute requireRole={["wholesale"]}>
                <Dashboard />
              </ProtectedRoute>
            }
          >
            <Route index                    element={<CustomerProducts />} />
            <Route path="orders"            element={<CustomerOrderPortal />} />
            <Route path="completed-history" element={<CustomerCompletedHistory />} />
            <Route path="profile"           element={<Profile />} />
            <Route path="logout"            element={<Logout />} />
          </Route>

          {/* ── Unauthorized ── */}
          <Route path="/unauthorized" element={<Unauthorized />} />
        </Routes>
      </Router>
    </>
  );
}

export default App;
