import axios from 'axios';
import React, { useState } from 'react'
import { useEffect } from 'react';

const Product = () => {
  const [openModal, setOpenModal] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSetsuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    type: "",
    description: "",
    price: "",
    stock: "",
    categoryId: "",
    supplierId: "",
  });

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
      if (response.data.success) {
        setSetsuppliers(response.data.suppliers);
        setCategories(response.data.categories);
        setProducts(response.data.products);
        setFilteredProducts(response.data.products);
      } else {
        console.error("Error fetching products", response.data.message);
        alert("Error fetching products. Please try again")

      }
    } catch (error) {
      console.error("Error fetching products", error);
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

  const closeModel = () =>{
    setOpenModal(false);
    setEditProduct(null);
    setFormData({
    name: "",
    type: "",
    description: "",
    price: "",
    stock: "",
    categoryId: "",
    supplierId: "",
  });
  }

  const handleEdit = (product) =>{
    setEditProduct(product._id)
    setFormData({
      name: product.name,
      name: product.type,
      description: product.description,
      price: product.price,
      stock: product.stock,
      categoryId: product.categoryId._id,
      supplierId: product.supplierId._id,
    });
    setOpenModal(true)
  }
  const handleSubmit = async (e) => {
    e.preventDefault()
    let response
    try {
      if (editProduct) {
        response = await axios.put(`http://localhost:3000/api/products/${editProduct}`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('pos-token')}`
            },
          }
        )
      }
      else{
      response = await axios.post(`http://localhost:3000/api/products/add`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('pos-token')}`
          },
        }
      );
      }
      if (response.data.success) {
        alert(editProduct ? "Product upadated successfully!" : "Product added succefully!");
        setOpenModal(false)
        setEditProduct(null)
        setFormData({
          name: "",
          type: "",
          description: "",
          price: "",
          stock: "",
          categoryId: "",
          supplierId: "",
        })
        fetchProducts()
      } else {
        console.error(editProduct ? "Error updating Product" : "Error adding Product:", response.data);
        alert(editProduct ? "Error updating Product, Please try again" : "Error adding Product, Please try again")
      }
    } catch (error) {
      console.error("Error adding product:", error);
      // alert(error.response.data.message, " Please try again")
      // alert("Error adding. Please try agains.")
    }
  }
  
  const handleDelete = async (id )=>{
    try {
      const confirmDelete = confirm("Are you sure you want to delete this Product")
      if (confirmDelete) {
        const response = await axios.delete(`http://localhost:3000/api/products/${id}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("pos-token")}`
            },
          }
        )
        if(response.data.success){
          alert('Products deleted successfully!')
          fetchProducts();
        }else{
          console.error("Error deleting Products", data);
          alert("Error deleting Products. Please try again")
        }
      }
    } catch (error) {
      console.error("Error deleting Products:", error)
        alert("Error deleting Products. Please try again")
    }
  }

  const handleSearch = async (e)=>{
    setFilteredProducts(
      products.filter((product)=>
        product.name.toLowerCase().includes(e.target.value.toLowerCase())
      )
    )
  }
  return (
    <div className='w-full h-full flex flex-col gap-4 p-4'>
      <h1 className="text-2xl font-bold">Product Management</h1>
      <div className='flex justify-between items-center'>
        <input type="text" placeholder='Search' className='border p-1 bg-white rounded px-4'
        onChange={handleSearch}
        />
        <button className='px-4 py-1.5 bg-blue-500 text-white rounded cursor-pointer'
          onClick={() => setOpenModal(true)}
        >Add Product</button>
      </div>

      {loading ? <div>Loading....</div> : (
        <div>
          <table className='w-full border-collapse border border-gray-200'>
          <thead>
            <tr className='bg-gray-200'>
              <th className='border border-gray-300 p-2'>S/N</th>
              <th className='border border-gray-300 p-2'>Product Name</th>
              <th className='border border-gray-300 p-2'>Product Type</th>
              <th className='border border-gray-300 p-2'>Category Name</th>
              <th className='border border-gray-300 p-2'>Supplier Name </th>
              <th className='border border-gray-300 p-2'>Price</th>
              <th className='border border-gray-300 p-2'>Stock</th>
              <th className='border border-gray-300 p-2'>Action</th>
            </tr>
          </thead>
          <tbody> 
            {filteredProducts && filteredProducts.map((product, index) => (
              
              <tr key={product._id}>
                <td className='border border-gray-300 p-2'>{index + 1}</td>
                <td className='border border-gray-300 p-2'>{product.name}</td>
                <td className='border border-gray-300 p-2'>{product.type}</td>
                <td className='border border-gray-300 p-2'>{product.categoryId.name}</td>
                <td className='border border-gray-300 p-2'>{product.supplierId.name}</td>
                <td className='border border-gray-300 p-2'>{product.price}</td>
                <td className='border border-gray-300 p-2'>
                  <span className=' rounded-full font-semibold'>{product.stock == 0 ? (
                    <span className='bg-red-100 text-red-500 '>{product.stock}</span>
                  ) : product.stock < 5 ? (
                    <span className='bg-yellow-100 text-yellow-600 px-2 py-1'>{product.stock}</span>
                  ) : (<span className='bg-green-100 text-green-500 px-2 py-1'>{product.stock}</span>)
                  }</span>
                </td>
                <td className='border border-gray-300 p-2'>
                  <button className='px-2 py-1 bg-yellow-500 text-white rounded cursor-pointer mr-2' onClick={() => handleEdit(product)}>Edit</button>
                  <button className='px-2 py-1 bg-red-500 text-white rounded cursor-pointer mr-2' onClick={() => handleDelete(product._id)}>Delete</button>
                </td>
              </tr>
            ))
            }
          </tbody>
        </table>
        {filteredProducts.length === 0 && <div>No records</div>}
        </div>
      )}

      {openModal && (<div className='fixed top-0 left-0 w-full h-full bg-black/50 flex justify-center items-center'>
        <div className="bg-white p-4 rounded shadow-md w-1/3 relative">
          <h1 className='text-xl font-bold text-lg'>{editProduct?"Edit Product":"Add Product"}</h1>
          <button className='absolute top-4 right-4 font-bold text-lg cursor-pointer'
            // onClick={closeModal}
            onClick={closeModel}
          >X</button>
          <form action="" className='flex flex-col gap-4 mt-4'
            onSubmit={handleSubmit}
          >
            <input required type="text" placeholder='Product Name' className='border p-1 bg-white rounded px-4'
              name='name'
              value={formData.name}
              onChange={handleChange}
            />
            <input required type="text" placeholder='Product Type' className='border p-1 bg-white rounded px-4'
              name='type'
              value={formData.type}
              onChange={handleChange}
            />
            <input required type="text" placeholder='Description' className='border p-1 bg-white rounded px-4'
              name='description'
              value={formData.description}
              onChange={handleChange}
            />
            <input required type="number" placeholder='Enter price' className='border p-1 bg-white rounded px-4'
              name='price'
              value={formData.price}
              onChange={handleChange}
            />
            <input required type="number" placeholder='Enter stock' className='border p-1 bg-white rounded px-4'
              name='stock'
              min='0'
              value={formData.stock}
              onChange={handleChange}
            />

            <div className='w-full border'>
              <select required name="categoryId" className='w-full p-2' onChange={handleChange} value={formData.categoryId}>
                <option value="">Select Category</option>
                {/* <option value="No Category">No Category</option> */}
                {categories && categories.map((category) => (
                  <option key={category._id} value={category._id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className='w-full border'>
              <select required name="supplierId" className='w-full p-2' onChange={handleChange} value={formData.supplierId}>
                <option value="">Select Supplier</option>
                {/* <option value="No Supplier">No Supplier</option> */}
                {suppliers && suppliers.map((supplier) => (
                  <option key={supplier._id} value={supplier._id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </div>

            <div className='flex space-x-2'>
              <button className='w-full mt-2 rounded-md bg-green-500 text-white p-3 cursor-pointer hover:bg-red-600' type='submit'>{editProduct?"Save Changes ":"Add Product" }</button>
              <button
                type='button'
                className='w-full mt-2 rounded-md bg-red-500 text-white p-3 cursor-pointer hover:bg-red-600'
                onClick={closeModel}
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
