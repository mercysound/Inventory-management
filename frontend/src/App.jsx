import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router';
import Root from './utils/Root.jsx';
import Login from './pages/Login/Login.jsx';
import ProtectedRoutes from './utils/ProtectedRoutes.jsx';
import Dashboard from './pages/Login/Dashboard.jsx';
import Categories from './components/Categories.jsx';
import Suppliers from './components/Suppliers.jsx';
import Product from './components/Product.jsx';
import Logout from './components/Logout.jsx';

function App () {

  return (
    <Router>
      <Routes>
        <Route path='/' element={<Root />} />
        <Route path='/admin-dashboard' element={
          <ProtectedRoutes requireRole={["admin"]}>
            <Dashboard/>
          </ProtectedRoutes>
        }
        >
          <Route index element={<h1>summary of dashbord</h1>} />
          <Route path='categories' element={<Categories/>} />
          <Route path='products' element={<Product/>} />
          <Route path='suppliers' element={<Suppliers/>} />
          <Route path='orders' element={<h1>Orders</h1>} />
          <Route path='profile' element={<h1>Profile</h1>} />
          <Route path='users' element={<h1>Users</h1>} />
          <Route path='logout' element={<Logout/>} />
        </Route>
        <Route path='/customer/dashboard' element={<h1>Customer dashboard</h1>} />
        <Route path='/login' element={<Login />} />
        <Route path='/unathorized' element={<p className='font-bold text-3xl mt-20 ml-20'>Uanthorized</p>} />
      </Routes>
    </Router>
  )
}

export default App