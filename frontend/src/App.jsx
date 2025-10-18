import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router';
import Root from './utils/Root.jsx';
import Login from './pages/Login/Login.jsx';
import ProtectedRoutes from './utils/ProtectedRoutes.jsx';
import Dashboard from './pages/login/Dashboard.jsx';
// import Categories from './components/Categories.jsx';
import Categories from './components/category/Category.jsx';
import Suppliers from './components/supplier/Suppliers.jsx';
import Product from './components/product/Product.jsx';
import Profile from './components/profile/Profile.jsx';
import Logout from './components/Logout.jsx';
import Users from './components/user/Users.jsx';
import CustomerProducts from './components/customerProduct/CustomerProducts.jsx';
import CustomerOrders from './components/orders/CustomerOrders.jsx';

import Summary from './components/Summary.jsx';
export const BASE_URL = import.meta.env.VITE_API_URL; // Use to import base url frontend .env
import { ToastContainer } from 'react-toastify';

function App() {

  return (
    <>
      <ToastContainer />
      <Router>
        <Routes>
          <Route path='/' element={<Root />} />
          <Route path='/admin-dashboard' element={
            <ProtectedRoutes requireRole={["admin"]}>
              <Dashboard />
            </ProtectedRoutes>
          }
          >
            <Route index element={<Summary />} />
            <Route path='categories' element={<Categories />} />
            <Route path='products' element={<Product />} />
            <Route path='suppliers' element={<Suppliers />} />
            <Route path='orders' element={<CustomerOrders />} />
            <Route path='profile' element={<Profile />} />
            <Route path='users' element={<Users />} />
            <Route path='logout' element={<Logout />} />
          </Route>
          <Route
            path='/customer-dashboard'
            element={<Dashboard />}
          >
            <Route
              index element={<CustomerProducts />}></Route>
            <Route
              path='orders' element={<CustomerOrders />}></Route>
            <Route
              path='logout' element={<Logout />}></Route>
            <Route
              path='profile' element={<Profile />}></Route>
          </Route>
          <Route path='/login' element={<Login />} />
          <Route path='/unauthorized' element={<p className='font-bold text-3xl mt-20 ml-20'>Uanthorized</p>} />
        </Routes>
      </Router>
    </>
  )
}

export default App