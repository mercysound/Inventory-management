import axios from 'axios';
import React, { useState } from 'react'
import { useEffect } from 'react';

const Product = () => {
  const [openModal, setOpenModal] = useState(false);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSetsuppliers] = useState([]);


  // const handleSearch = async (e)=>{
  //   setFilterSupplier(
  //     suppliers.filter((supplier)=>
  //       supplier.name.toLowerCase().includes(e.target.value.toLowerCase())
  //     )
  //   )
  // }
  const fetchProducts = async () => {
    try {
      const response = await axios.get('http://localhost:3000/api/products', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('pos-token')}`
        },
      })
      setSetsuppliers(response.data.suppliers);
      setCategories(response.data.categories);
    } catch (error) {
      console.error("Error fetching suppliers", error);
    }
  }
  useEffect(() => {
    fetchProducts();
  }, []);

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
      // if (editSupplier) {
      //   response = await axios.put(`http://localhost:3000/api/supplier/${editSupplier}`,
      //     formData,
      //     {
      //       headers: {
      //         Authorization: `Bearer ${localStorage.getItem('pos-token')}`
      //       },
      //     }
      //   )
      // }
      // else{
        response = await axios.post(`http://localhost:3000/api/product/add`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('pos-token')}`
            },
          }
        );
      // }
      if (response.data.success) {
        // fetchSuppliers()
        alert(editSupplier?"Product upadated successfully!":"Product added succefully!");
        openModal(false);
        // setEditSupplier(false);
        setFormData({
          name: "",
          description: "",
          price: "",
          stock: "",
          categoryId: "",
          supplierId: "",
        })
      } else {
        console.error(editSupplier?"Error updating Product":"Error adding Product:", response.data);
        alert(editSupplier?"Error updating Product, Please try again":"Error adding Product, Please try again")
      }
    } catch (error) {
      // console.error("Error adding supplier:", error);
      // alert(error.response.data.message," Please try again")
      // alert("Error adding. Please try agains.")
      if (error.response?.status === 400) {
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
      <h1 className="text-2xl font-bold">Product Management</h1>
      <div className='flex justify-between items-center'>
        <input type="text" placeholder='Search' className='border p-1 bg-white rounded px-4'
        // onChange={handleSearch}
        />
        <button className='px-4 py-1.5 bg-blue-500 text-white rounded cursor-pointer'
          onClick={() => setOpenModal(true)}
        >Add Product</button>
      </div>

      {openModal && (<div className='fixed top-0 left-0 w-full h-full bg-black/50 flex justify-center items-center'>
        <div className="bg-white p-4 rounded shadow-md w-1/3 relative">
          <h1 className='text-xl font-bold text-lg'>Add Product</h1>
          <button className='absolute top-4 right-4 font-bold text-lg cursor-pointer'
            // onClick={closeModal}
            onClick={() => setOpenModal(false)}
          >X</button>
          <form action="" className='flex flex-col gap-4 mt-4'
           onSubmit={handleSubmit}
          >
            <input type="text" placeholder='Product Name' className='border p-1 bg-white rounded px-4'
              name='name'
            value={formData.address}
            onChange={handleChange}
            />
            <input type="text" placeholder='Description' className='border p-1 bg-white rounded px-4'
              name='description'
            value={formData.name}
            onChange={handleChange}
            />
            <input type="number" placeholder='Enter price' className='border p-1 bg-white rounded px-4'
              name='price'
            value={formData.email}
            onChange={handleChange}
            />
            <input type="text" placeholder='Enter stock' className='border p-1 bg-white rounded px-4'
              name='stock'
            value={formData.number}
            onChange={handleChange}
            />

            <div className='w-full border'>
              <select name="category" className='w-full p-2'>
                <option value="">Select Category</option>
              {categories && categories.map((category) => (
                <option key={category._id} value={category._id}>
                  {category.name}
                </option>
            ))}
              </select>
            </div>

            <div className='w-full border'>
              <select name="supplier" className='w-full p-2'>
                <option value="">Select Supplier</option>
              {suppliers && suppliers.map((supplier) => (
                <option key={supplier._id} value={supplier._id}>
                  {supplier.name}
                </option>
            ))}
              </select>
            </div>

            <div className='flex space-x-2'>
              <button className='w-full mt-2 rounded-md bg-green-500 text-white p-3 cursor-pointer hover:bg-red-600' type='submit'>Add Product</button>
                  <button
                    type='button'
                    className='w-full mt-2 rounded-md bg-red-500 text-white p-3 cursor-pointer hover:bg-red-600'
                    onClick={()=> setOpenModal(false)}
                  >
                    Cancel
                  </button>
            </div>

          </form>
        </div>
      </div>
      )}

    </div>
  )
}

export default Product;
