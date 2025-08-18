import './App.css';
import {BrowserRouter as Router, Routes, Route} from 'react-router';
import Root from './components/Root.jsx';
import Login from './pages/Login/Login.jsx';
import Another from './pages/Login/Another.jsx';

function App() {

  return (
    <Router>
      <Routes>
        <Route path='/' element={<Root/>} />
        <Route path='/admin/dashboard' element={<h1>admin dashboard</h1>} />
        <Route path='/customer/dashboard' element={<h1>Customer dashboard</h1>} />
        <Route path='/login' element={<Login/>} />
        <Route path='/ano' element={<Another/>}/>        
      </Routes>
    </Router>
  )
}

export default App
