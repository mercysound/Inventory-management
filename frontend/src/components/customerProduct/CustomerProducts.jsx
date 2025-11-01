// frontend/src/components/customer/CustomerProducts.jsx
import React, { useEffect, useState } from "react";
import axiosInstance from "../../utils/axiosInstance";
import CustomerProductsSkeleton from "./CustomerProductsSkeleton";
import OrderModal from "./OrderModal";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, Search, Package } from "lucide-react";

const CustomerProducts = () => {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const [orderData, setOrderData] = useState({
    orderId: "", // new field to store existing order id if any
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

  // When user clicks "Order" — check for existing order for this product first
  const handleOrderChange = async (product) => {
    try {
      // Reset orderData to avoid stale values
      setOrderData({
        orderId: "",
        productId: product._id,
        quantity: 1,
        total: product.price,
        stock: product.stock,
        price: product.price,
      });

      // Fetch existing order for this product (if any)
      const res = await axiosInstance.get(`/orders/product/${product._id}`);
      if (res.data.success && res.data.order) {
        const existing = res.data.order;
        setOrderData({
          orderId: existing._id,
          productId: product._id,
          quantity: existing.quantity,
          total: existing.totalPrice ?? existing.quantity * product.price,
          stock: product.stock,
          price: existing.price ?? product.price,
        });
      } else {
        // no existing order — keep default (new order)
        setOrderData((prev) => ({
          ...prev,
          productId: product._id,
          total: product.price,
          stock: product.stock,
          price: product.price,
        }));
      }
    } catch (err) {
      // If request fails, still open modal with defaults
      console.error("Error fetching existing order:", err);
      setOrderData({
        orderId: "",
        productId: product._id,
        quantity: 1,
        total: product.price,
        stock: product.stock,
        price: product.price,
      });
    } finally {
      setOpenModal(true);
    }
  };

  const closeModal = () => setOpenModal(false);

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <ShoppingBag className="text-green-600" size={24} />
          <h1 className="font-bold text-2xl text-gray-800">Available Products</h1>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <select
            onChange={handleChangeCategory}
            className="border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-green-500 outline-none w-full sm:w-auto"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search product..."
              onChange={handleSearch}
              className="border border-gray-300 rounded-lg pl-9 p-2 w-full focus:ring-2 focus:ring-green-500 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Product Table */}
      {loading ? (
        <CustomerProductsSkeleton />
      ) : (
        <div className="overflow-x-auto bg-white shadow-lg rounded-xl border border-gray-100">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-gray-100 text-gray-700">
                <th className="p-3 text-sm text-left">S/N</th>
                <th className="p-3 text-sm text-left">Product</th>
                <th className="p-3 text-sm text-left">Category</th>
                <th className="p-3 text-sm text-left">Price</th>
                <th className="p-3 text-sm text-center">Stock</th>
                <th className="p-3 text-sm text-left">Description</th>
                <th className="p-3 text-sm text-center">Action</th>
              </tr>
            </thead>

            <AnimatePresence>
              <tbody>
                {filteredProducts.length > 0 ? (
                  filteredProducts.map((product, index) => (
                    <motion.tr
                      key={product._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-gray-200 hover:bg-gray-50 transition-all"
                    >
                      <td className="p-3 text-sm">{index + 1}</td>
                      <td className="p-3 font-semibold text-gray-800 flex items-center gap-2">
                        <Package size={16} className="text-green-500" />
                        {product.name}
                      </td>
                      <td className="p-3 text-gray-700">{product.categoryId?.name}</td>
                      <td className="p-3 text-gray-700 font-medium">
                        ₦{product.price.toLocaleString()}
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            product.stock === 0
                              ? "bg-red-100 text-red-600"
                              : product.stock < 5
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {product.stock}
                        </span>
                      </td>
                      <td className="p-3 text-sm text-gray-600 max-w-xs truncate">
                        {product.description}
                      </td>
                      <td className="p-3 text-center">
                        {product.stock < 1 ? (
                          <button className="px-3 py-1 bg-gray-500 text-white rounded-md cursor-not-allowed">
                            Unavailable
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOrderChange(product)}
                            className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-all"
                          >
                            Order
                          </button>
                        )}
                      </td>
                    </motion.tr>
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
            </AnimatePresence>
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
