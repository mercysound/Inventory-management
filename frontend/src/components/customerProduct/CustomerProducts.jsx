import React, { useEffect, useState } from "react";
import axiosInstance from "../../utils/axiosInstance";
import CustomerProductsSkeleton from "./CustomerProductsSkeleton";
import OrderModal from "./OrderModal";

const CustomerProducts = () => {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const [orderData, setOrderData] = useState({
    productId: "",
    quantity: 1,
    total: 0,
    stock: 0,
    price: 0,
  });

  const fetchProducts = async () => {
    try {
      const res = await axiosInstance.get("/products");
      if (res.data.success) {
        setCategories(res.data.categories);
        setProducts(res.data.products);
        setFilteredProducts(res.data.products);
      }
    } catch (err) {
      console.error("Error fetching products:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleSearch = (e) => {
    const query = e.target.value.toLowerCase();
    setFilteredProducts(
      products.filter((p) => p.name.toLowerCase().includes(query))
    );
  };

  const handleChangeCategory = (e) => {
    const cat = e.target.value;
    setFilteredProducts(
      cat ? products.filter((p) => p.categoryId._id === cat) : products
    );
  };

  const handleOrderChange = (product) => {
    setOrderData({
      productId: product._id,
      quantity: 1,
      total: product.price,
      stock: product.stock,
      price: product.price,
    });
    setOpenModal(true);
  };

  const closeModal = () => setOpenModal(false);

  return (
    <div className="px-4 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
        <h1 className="font-bold text-2xl text-gray-800">Products</h1>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <select
            onChange={handleChangeCategory}
            className="border border-gray-300 p-2 rounded w-full sm:w-auto"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Search product..."
            onChange={handleSearch}
            className="border border-gray-300 p-2 rounded w-full sm:w-60"
          />
        </div>
      </div>

      {loading ? (
        <CustomerProductsSkeleton />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200">
            <thead className="bg-gray-200 text-gray-700">
              <tr>
                <th className="border p-2 text-sm">S/N</th>
                <th className="border p-2 text-sm">Product</th>
                <th className="border p-2 text-sm">Category</th>
                <th className="border p-2 text-sm">Price</th>
                <th className="border p-2 text-sm">Stock</th>
                <th className="border p-2 text-sm">Description</th>
                <th className="border p-2 text-sm">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product, index) => (
                  <tr
                    key={product._id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="border p-2 text-center">{index + 1}</td>
                    <td className="border p-2">{product.name}</td>
                    <td className="border p-2">{product.categoryId?.name}</td>
                    <td className="border p-2">₦{product.price}</td>
                    <td className="border p-2 text-center">
                      {product.stock === 0 ? (
                        <span className="bg-red-100 text-red-600 px-2 py-1 rounded">
                          {product.stock}
                        </span>
                      ) : product.stock < 5 ? (
                        <span className="bg-yellow-100 text-yellow-600 px-2 py-1 rounded">
                          {product.stock}
                        </span>
                      ) : (
                        <span className="bg-green-100 text-green-600 px-2 py-1 rounded">
                          {product.stock}
                        </span>
                      )}
                    </td>
                    <td className="border p-2 text-sm text-gray-600">
                      {product.description}
                    </td>
                    <td className="border p-2 text-center">
                      <button
                        onClick={() => handleOrderChange(product)}
                        className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                      >
                        Order
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="7"
                    className="text-center text-gray-500 py-6 italic"
                  >
                    No products found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {openModal && (
        <OrderModal
          orderData={orderData}
          setOrderData={setOrderData}
          closeModal={closeModal}
          refreshProducts={fetchProducts}
        />
      )}
    </div>
  );
};

export default CustomerProducts;
