import "./App.css";
import "react-toastify/dist/ReactToastify.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./utils/ProtectedRoute.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Categories from "./components/admin/category/Category.jsx";
// import Users from "./components/admin/user/Users.js";
import Summary from "./components/admin/dashboard/Summary.jsx";
// import PlacedOrders from "./components/purchase/PlacedOrders.jsx";
import { ToastContainer } from "react-toastify";
import LandingPage from "./pages/LandingPage.jsx";
import Unauthorized from "./pages/unauthorized/Unauthorized.jsx";
import ErrorBoundary from "./components/share-component/ErrorBoundary";
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
import ForgotPassword from "./pages/ForgotPassword.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";


export const BASE_URL = import.meta.env.VITE_API_URL;

function App() {
  return (
    <>
      <ToastContainer />
      <ErrorBoundary>
      <Router>
        <Routes>
          {/* Landing/Login Page */}
          <Route path="/" element={<LandingPage />} />
          {/* Complete Profile Page */}
          <Route path="/complete-profile" element={<CompleteProfile />} />
          {/* Forgot Password Page */}
          <Route path="/forgot-password" element={<ForgotPassword />} />
          {/* Reset Password Page */}
          <Route path="/reset-password" element={<ResetPassword />} />
          {/* Admin Dashboard */}
          <Route
            path="/admin-dashboard/*"
      </Router>
      </ErrorBoundary>
              <ProtectedRoute requireRole={["admin"]}>
                <Dashboard />
              </ProtectedRoute>
            }
          >
            <Route index element={<Summary />} />
            <Route path="categories" element={<Categories />} />
            <Route path="products" element={<Product />} />
            <Route path="suppliers" element={<Suppliers/>} />
            <Route path="placed-orders" element={<PlacedOrders />} />
            <Route path="completed-history" element={<AdminCompletedHistory />} />
            <Route path="profile" element={<Profile />} />
            <Route path="users" element={<Users />} />
            <Route path="logout" element={<Logout />} />
          </Route>

          {/* Staff Dashboard */}
          <Route
            path="/customer-dashboard/*"
            element={
              <ProtectedRoute requireRole={["staff"]}>
                <Dashboard />
              </ProtectedRoute>
            }
          >
            <Route index element={<CustomerProducts />} />
            <Route path="orders" element={<StaffOrders />} />
            <Route path="completed-history" element={<StaffCompletedHistory />} />
            <Route path="profile" element={<Profile />} />
            <Route path="logout" element={<Logout />} />
          </Route>

          {/* Customer Dashboard */}
          <Route
            path="/user-dashboard/*"
            element={
              <ProtectedRoute requireRole={["customer"]}>
                <Dashboard />
              </ProtectedRoute>
            }
          >
            <Route index element={<CustomerProducts/>} />
            <Route path="orders" element={<CustomerOrderPortal/>} />
            <Route path="completed-history" element={<CustomerCompletedHistory />} />
            <Route path="profile" element={<Profile />} />
            <Route path="logout" element={<Logout />} />
          </Route>

          {/* Unauthorized */}
          <Route
            path="/unauthorized"
            element={
              // <p className="font-bold text-3xl mt-20 ml-20 text-red-600">
              //   Unauthorized Access
              // </p>
              <Unauthorized/>
            }
          />
        </Routes>
      </Router>
    </>
  );
}

export default App;
