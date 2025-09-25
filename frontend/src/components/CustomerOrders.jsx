import axios from 'axios';
import React from 'react'
import { useEffect } from 'react';
import { useState } from 'react';

const CustomerOrders = () => {
    const [orders, setOrders] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    
   const fetchOrders = async () => {
    try {
      const response = await axios.get('http://localhost:3000/api/orders', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('pos-token')}`
        },
      })
      if (response.data.success) {
        setOrders(response.data.orders);
        setFilteredProducts(response.data.orders);
        // setCategories(response.data.categories);
        // setProducts(response.data.products);
        // setFilteredProducts(response.data.products);
      } else {
        console.error("Error fetching products", response.data.message);
        alert("Error fetching products. Please try again")

      }
    } catch (error) {
      console.error("Error fetching products", error);
    }
  }
  useEffect(() => {
    fetchOrders();
  }, []);

  return (
    <div className='w-full h-full flex flex-col gap-4 p-4'>
      <h1 className="text-2xl font-bold">Orders</h1>
      {/* {loading ? <div>Loading....</div> :
       ( */}
        <div>
          <table className='w-full border-collapse border border-gray-200'>
          <thead>
            <tr className='bg-gray-200'>
              <th className='border border-gray-300 p-2'>S/N</th>
              <th className='border border-gray-300 p-2'>Product Name</th>
              <th className='border border-gray-300 p-2'>Category Name</th>
              <th className='border border-gray-300 p-2'>Quantity</th>
              <th className='border border-gray-300 p-2'>Total Price</th>
              <th className='border border-gray-300 p-2'>Date</th>
              {/* <th className='border border-gray-300 p-2'>Action</th> */}
            </tr>
          </thead>
          <tbody> 
            {orders && orders.map((order, index) => (

              <tr key={order._id}>
                <td className='border border-gray-300 p-2'>{index + 1}</td>
                <td className='border border-gray-300 p-2'>{order.product.name}</td>
                <td className='border border-gray-300 p-2'>{order.product.categoryId.name}</td>
                <td className='border border-gray-300 p-2'>{order.quantity}</td>
                <td className='border border-gray-300 p-2'>{order.totalPrice}</td>
                <td className='border border-gray-300 p-2'>{new Date(order.orderDate).toLocaleDateString()}</td>
              </tr>
            ))
            }
          </tbody>
        </table>
        {filteredProducts.length === 0 && <div>No records</div>}
        </div>
      
      {/* )} */}

    </div>
  )
}

export default CustomerOrders
