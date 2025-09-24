import React, { useEffect, useState } from 'react'
import {FaBox, FaCog, FaHome, FaShoppingCart, FaSignOutAlt, FaTable, FaTruck, FaUsers} from "react-icons/fa"
import { NavLink } from 'react-router'
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
  const menuItems = [
    {name: "Dashboard", path: "/admin-dashboard", icon: <FaHome/>, isParent: true},
    {name: "Categories", path: "/admin-dashboard/categories", icon: <FaTable/>, isParent: false},
    {name: "Products", path: "/admin-dashboard/products", icon: <FaBox/>, isParent: false},
    {name: "Suppliers", path: "/admin-dashboard/suppliers", icon: <FaTruck/>, isParent: false},
    {name: "Orders", path: "/admin-dashboard/orders", icon: <FaShoppingCart/>, isParent: false},
    {name: "Users", path: "/admin-dashboard/users", icon: <FaUsers/>, isParent: false},
    {name: "Profile", path: "/admin-dashboard/profile", icon: <FaCog/>, isParent: false},
    {name: "Logout", path: "/admin-dashboard/logout", icon: <FaSignOutAlt/>, isParent: false}
  ];
  const customerItems = [
    {name: "Products", path: "/customer-dashboard", icon: <FaBox/>, isParent: true},
    {name: "Orders", path: "/customer-dashboard/orders", icon: <FaShoppingCart/>, isParent: false},
    {name: "Profile", path: "/customer-dashboard/profile", icon: <FaCog/>, isParent: false},
    {name: "Logout", path: "/customer-dashboard/logout", icon: <FaSignOutAlt/>, isParent: false}
  ]
   
  
  const {user} = useAuth();
  const [menuLinks, setMenuLinks] = useState(customerItems)
  useEffect(()=>{
    if (user && user.role === "admin") {
      setMenuLinks(menuItems)
    }
  }, [])
  return (
    <div className='flex flex-col h-screen bg-black text-white w-16 md:w-64 fixed'>
      <div className='h-16 flex flex-items justify-center'>
        <span className='hidden md:block text-xl font-bold'>Inventory MS</span>
        <span className='md:hidden text-xl font-bold'>IMS</span>
      </div>

      <div>
        <ul className='space-y-2 p-2'>
          {menuLinks.map((item)=>(
              <li key={item.name}>
                <NavLink
                end={item.isParent}
                 className={({isActive}) => (isActive ? "bg-gray-700" : "") + " flex items-center p-2 rounded-md hover:bg-gray-700 transition duration-200"} to={item.path}>
                  <span className='text-xl'>{item.icon}</span>
                  <span className='ml-4 md:block hidden'>{item.name}</span>
                </NavLink>
              </li>
            ))
          }
        </ul>
      </div>
    </div>
  )
}

export default Sidebar;
