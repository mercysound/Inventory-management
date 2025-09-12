import React, { useEffect, useState } from 'react';
import axios from 'axios';

const Suppliers = () => {
  const [editSupplier, setEditSupplier] = useState(null);
  const [addSupplier, setAddSupplier] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    number: "",
    address: ""
  });

  const [loading, setLoading] = useState(false);
  const [suppliers, setSetsuppliers] = useState([]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }))
  }

  const fetchSuppliers = async () => {
    try {
      setLoading(true)
      const response = await axios.get('http://localhost:3000/api/supplier', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('pos-token')}`
        },
      })
      setSetsuppliers(response.data.suppliers)
    } catch (error) { 
      console.error("Error fetching suppliers", error);
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSuppliers()
  }, [])

  const handleEdit = (supplier) => {
    setFormData({
      name: supplier.name,
      email: supplier.email,
      number: supplier.number,
      address: supplier.address
    });
    setEditSupplier(supplier._id)
    setAddSupplier(true)
  }

  const closeModal = () => {
    setAddSupplier(false)

    setFormData({
      name: "",
      email: "",
      number: "",
      address: ""
    })
  }
  // const handleAddSupplier = () => {
  //    setAddSupplier(true)
  //    setEditSupplier(true)
  // }

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
        setEditSupplier(false);
        setFormData({
          name: "",
          email: "",
          number: "",
          address: ""
        })
      } else {
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
    }finally{
      setAddSupplier(false)
    }
  }





  return (
    <div className='w-full h-full flex flex-col gap-4 p-4'>
      <h1 className="text-2xl font-bold">Supplier Management</h1>
      <div className='flex justify-between items-center'>
        <input type="text" placeholder='Search' className='border p-1 bg-white rounded px-4' />
        <button className='px-4 py-1.5 bg-blue-500 text-white rounded cursor-pointer' onClick={()=>setAddSupplier(1)}>Add Supplier</button>
      </div>


      {loading ? <div>Loading....</div> : (
        <table>
          <thead>
            <tr className='bg-gray-200'>
              <th className='border border-gray-300 p-2'>S/N</th>
              <th className='border border-gray-300 p-2'>Supplier Name</th>
              <th className='border border-gray-300 p-2'>Email</th>
              <th className='border border-gray-300 p-2'>Phone Number</th>
              <th className='border border-gray-300 p-2'>Address</th>
              <th className='border border-gray-300 p-2'>Action</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((supplier, index) => (
              // console.log(supplier)

              <tr key={supplier._id}>
                <td className='border border-gray-300 p-2'>{index + 1}</td>
                <td className='border border-gray-300 p-2'>{supplier.name}</td>
                <td className='border border-gray-300 p-2'>{supplier.email}</td>
                <td className='border border-gray-300 p-2'>{supplier.number}</td>
                <td className='border border-gray-300 p-2'>{supplier.address}</td>
                <td className='border border-gray-300 p-2'>
                  <button className='px-2 py-1 bg-yellow-500 text-white rounded cursor-pointer mr-2' onClick={() => handleEdit(supplier)}>Edit</button>
                  <button className='px-2 py-1 bg-red-500 text-white rounded cursor-pointer mr-2' >Delete</button>
                </td>
              </tr>
            ))
            }
          </tbody>
        </table>
      )}


      {
        addSupplier && (
          <div className='fixed top-0 left-0 w-full h-full bg-black/50 flex justify-center items-center'>
            <div className="bg-white p-4 rounded shadow-md w-1/3 relative">
              <h1 className='text-xl font-bold text-lg'>Add Supplier</h1>
              <button className='absolute top-4 right-4 font-bold text-lg cursor-pointer' onClick={closeModal}>X</button>
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
                {/* <button className='px-4 py-1.5 bg-blue-500 text-white rounded cursor-pointer'>Add Suppier</button> */}

                <div className='flex space-x-2'>
                  <button className='w-full mt-2 rounded-md bg-green-500 text-white p-3 cursor-pointer hover:bg-red-600' type='submit'>{editSupplier ? "Save Changes " : "Add Supplier" }</button>
                  {
                    editSupplier && (
                      <button
                        type='button'
                        className='w-full mt-2 rounded-md bg-red-500 text-white p-3 cursor-pointer hover:bg-red-600'
                        onClick={closeModal}
                      >
                        Cancel
                      </button>
                    )
                  }
                </div>

              </form>
            </div>
          </div>
        )
      }
    </div>
  )
}

export default Suppliers;
