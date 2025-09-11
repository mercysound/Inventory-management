import React, { useState } from 'react';
import axios from 'axios';

const Suppliers = () => {
  const [addEditModal, setAddEditModal] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    number: "",
    address: ""
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }))
  }


  
  const handleSubmit = async (e) => {
    e.preventDefault()
    let response
    try {
       response = await axios.post(`http://localhost:3000/api/supplier/add`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('pos-token')}`
          },
        }
      );
      if (response.data.success) {
        alert("Supplier added succefully!");
        setAddEditModal(null); 
        setFormData({
    name: "",
    email: "",
    number: "",
    address: ""
  })
      }else {
        console.error("Error adding Supplier:", response.data);
        alert("Error adding Supplier. Please try again")
      }
    } catch (error) {
      // console.error("Error adding supplier:", error);
      // alert(error.response.data.message," Please try again")
      // alert("Error adding. Please try agains.")
       if (error.response?.status === 40) {
    alert("Supplier already exists");
  } else if (error.response?.status === 401) {
    alert("Session expired, please log in again");
    navigate("/login");
  } else {
    alert("Something went wrong");
  }
    }
  }



  return (
    <div className='w-full h-full flex flex-col gap-4 p-4'>
      <h1 className="text-2xl font-bold">Supplier Management</h1>
      <div className='flex justify-between items-center'>
        <input type="text" placeholder='Search' className='border p-1 bg-white rounded px-4' />
        <button className='px-4 py-1.5 bg-blue-500 text-white rounded cursor-pointer' onClick={() => setAddEditModal(1)}>Add Supplier</button>


        {
          addEditModal && (
            <div className='fixed top-0 left-0 w-full h-full bg-black/50 flex justify-center items-center'>
              <div className="bg-white p-4 rounded shadow-md w-1/3 relative">
                <h1 className='text-xl font-bold text-lg'>Add Supplier</h1>
                <button className='absolute top-4 right-4 font-bold text-lg cursor-pointer' onClick={() => setAddEditModal(null)}>X</button>
                <form action="" className='flex flex-col gap-4 mt-4' onSubmit={handleSubmit}>
                  <input type="text" placeholder='Supplier Name' className='border p-1 bg-white rounded px-4'
                    name='name'
                    value={formData.name}
                    onChange={handleChange}
                  />
                  <input type="email" placeholder='Supplier Email' className='border p-1 bg-white rounded px-4'
                    name='email'
                    value={formData.email}
                    onChange={handleChange}
                  />
                  <input type="number" placeholder='Supplier Phone Number' className='border p-1 bg-white rounded px-4'
                    name='number'
                    value={formData.number}
                    onChange={handleChange}
                  />
                  <input type="text" placeholder='Supplier Address' className='border p-1 bg-white rounded px-4'
                    name='address'
                    value={formData.address}
                    onChange={handleChange}
                  />
                  <button className='px-4 py-1.5 bg-blue-500 text-white rounded cursor-pointer'>Add Suppier</button>
                </form>
              </div>
            </div>
          )
        }
      </div>
    </div>
  )
}

export default Suppliers;
