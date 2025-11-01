import "./App.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./utils/ProtectedRoute.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Categories from "./components/category/Category.jsx";
import Suppliers from "./components/supplier/Suppliers.jsx";
import Product from "./components/product/Product.jsx";
import Profile from "./components/profile/Profile.jsx";
import Logout from "./components/Logout.jsx";
import Users from "./components/user/Users.jsx";
import CustomerProducts from "./components/customerProduct/CustomerProducts.jsx";
import CustomerOrders from "./components/orders/CustomerOrders.jsx";
import Summary from "./components/Summary.jsx";
import PlacedOrders from "./components/purchase/PlacedOrders.jsx";
import { ToastContainer } from "react-toastify";
import LandingPage from "./pages/LandingPage.jsx";
import CustomerOrderPortal from "./components/customer/CustomerOrderPortal/CustomerOrderPortal.jsx";

export const BASE_URL = import.meta.env.VITE_API_URL;

function App() {
  return (
    <>
      <ToastContainer />
      <Router>
        <Routes>
          {/* Landing/Login Page */}
          <Route path="/" element={<LandingPage />} />

          {/* Admin Dashboard */}
          <Route
            path="/admin-dashboard/*"
            element={
              <ProtectedRoute requireRole={["admin"]}>
                <Dashboard />
              </ProtectedRoute>
            }
          >
            <Route index element={<Summary />} />
            <Route path="categories" element={<Categories />} />
            <Route path="products" element={<Product />} />
            <Route path="suppliers" element={<Suppliers />} />
            <Route path="placed-orders" element={<PlacedOrders />} />
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
            <Route path="orders" element={<CustomerOrders />} />
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
            <Route index element={<CustomerProducts />} />
            <Route path="orders" element={<CustomerOrderPortal />} />
            <Route path="profile" element={<Profile />} />
            <Route path="logout" element={<Logout />} />
          </Route>

          {/* Unauthorized */}
          <Route
            path="/unauthorized"
            element={
              <p className="font-bold text-3xl mt-20 ml-20 text-red-600">
                Unauthorized Access
              </p>
            }
          />
        </Routes>
      </Router>
    </>
  );
}

export default App;
