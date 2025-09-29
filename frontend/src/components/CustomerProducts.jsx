import axios from 'axios';
import React, { useEffect, useState } from 'react'

const CustomerProducts = () => {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [orderData, setOrderData] = useState({
    productId: "",
    quantity: 1,
    total: 0,
    stock: 0,
    price: 0
  });

  const fetchProducts = async () => {
    try {
      const response = await axios.get('http://localhost:3000/api/products', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('pos-token')}`
        },
      })
      if (response.data.success) {
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

  const handleSearch = (e) => {
    setFilteredProducts(
      products.filter((product) =>
        product.name.toLowerCase().includes(e.target.value.toLowerCase())
      )
    )
  }
  const handleChangeCategory = (e) => {
    setFilteredProducts(
      products.filter((product) =>
        product.category._id === e.target.value
      )
    )
  }
  const handleOrderChange = (product) => {
    setOrderData({
      productId: product._id,
      quantity: 1,
      total: product.price,
      stock: product.stock,
      price: product.price
    })
    setOpenModal(true)
  }
  const closeModal = () => {
    setOpenModal(false)
  }
  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const response = await axios.post('http://localhost:3000/api/orders/add', orderData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('pos-token')}`
        },
      })
      if (response.data.success) {
        setOpenModal(false)
        setOrderData({
          productId: "",
          quantity: 1,
          total: 0,
          stock: 0,
          price: 0
        });
        alert("order added successfully")
        fetchProducts();
      }
    } catch (error) {
      alert("Error", error.message)
      console.log(error);

    }
  }
  const increaseQuantity = (e) => {
    if (e.target.value > orderData.stock) {
      alert("Not enough stock")
    } else {
      setOrderData((prev) => ({
        ...prev,
        quantity: parseInt(e.target.value),
        total: parseInt(e.target.value) * parseInt(orderData.price)
      }))
    }
  }
  return (
    <div>
      <div className='py-4 px-6'>
        <h1 className='font-bold text-xl'>Products</h1>
      </div>
      <div className='py-4 px-6 flex justify-between items-center'>
        <div>
          <select name="category" id="" className='bg-white border p-1 rounded' onChange={handleChangeCategory}>
            <option value="">Select Category</option>
            {categories.map((category, index) => (
              <option key={index} value={category._id}>{category.name}</option>
            ))}
          </select>
        </div>
        <input type="text" placeholder='Search' className='border p-1 bg-white rounded px-4'
          onChange={handleSearch}
        />
      </div>

      <div>
        <table className='w-full border-collapse border border-gray-200'>
          <thead>
            <tr className='bg-gray-200'>
              <th className='border border-gray-300 p-2'>S/N</th>
              <th className='border border-gray-300 p-2'>Product Name</th>
              <th className='border border-gray-300 p-2'>Product Type</th>
              <th className='border border-gray-300 p-2'>Category Name</th>
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
                  <button className='px-2 py-1 bg-green-500 hover:bg-green-700 text-white rounded cursor-pointer mr-2'
                    onClick={() => handleOrderChange(product)}
                  >
                    Order</button>
                </td>
              </tr>
            ))
            }
          </tbody>
        </table>
        {filteredProducts.length === 0 && <div>No records</div>}
      </div>
      {openModal && (<div className='fixed top-0 left-0 w-full h-full bg-black/50 flex justify-center items-center'>
        <div className="bg-white p-4 rounded shadow-md w-1/3 relative">
          <h1 className='text-xl font-bold text-lg'>Place Order</h1>
          <button className='absolute top-4 right-4 font-bold text-lg cursor-pointer'
            // onClick={closeModal}
            onClick={closeModal}
          >X</button>
          <form action="" className='flex flex-col gap-4 mt-4'
            onSubmit={handleSubmit}
          >
            <input
              type='number'
              name='quantity'
              value={orderData.quantity}
              min='1'
              onChange={increaseQuantity}
              placeholder='Increase Quantity'
              className='border p-1 bg-white rounded px-4'
            />

            {
              <p>{orderData.quantity && !isNaN(orderData.quantity)
                ? Number(orderData.quantity) * orderData.price
                : 0}</p>
            }

            <div className='flex space-x-2'>
              <button className='w-full mt-2 rounded-md bg-green-500 text-white p-3 cursor-pointer hover:bg-red-600' type='submit'>
                Order Product
              </button>
              <button
                type='button'
                className='w-full mt-2 rounded-md bg-red-500 text-white p-3 cursor-pointer hover:bg-red-600'
                onClick={closeModal}
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

export default CustomerProducts
