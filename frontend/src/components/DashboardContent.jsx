import React from "react";

const DashboardContent = ({ dashBoardData }) => {
  return (
    <div className="p-5">
      <h2 className="text-3xl font-bold">Dashboard</h2>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-6">
        <div className="bg-blue-500 text-white p-4 rounded-lg shadow-md flex flex-col items-center justify-center">
          <p className="text-lg font-semibold">Total Products</p>
          <p className="text-2xl font-bold">{dashBoardData.totalProducts}</p>
        </div>
        <div className="bg-green-500 text-white p-4 rounded-lg shadow-md flex flex-col items-center justify-center">
          <p className="text-lg font-semibold">Total Stock</p>
          <p className="text-2xl font-bold">{dashBoardData.totalStock}</p>
        </div>
        <div className="bg-yellow-500 text-white p-4 rounded-lg shadow-md flex flex-col items-center justify-center">
          <p className="text-lg font-semibold">Order Today</p>
          <p className="text-2xl font-bold">{dashBoardData.ordersToday}</p>
        </div>
        <div className="bg-purple-500 text-white p-4 rounded-lg shadow-md flex flex-col items-center justify-center">
          <p className="text-lg font-semibold">Revenue</p>
          <p className="text-2xl font-bold">₦{dashBoardData.revenue}</p>
        </div>
      </div>

      {/* Details sections */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Out of Stock */}
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold text-gray-800 mb-3">
            Out of Stock Product
          </h3>
          {dashBoardData.outOfStock.length > 0 ? (
            <ul className="space-y-2">
              {dashBoardData.outOfStock.map((product, index) => (
                <li key={index} className="text-gray-600">
                  <p className="text-gray-400">
                    <strong>Product Name: </strong>
                    {product.name}
                  </p>
                  <p className="text-gray-400">
                    <strong>Category Name: </strong>(
                    {product.categoryId.name})
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">No product out of stock</p>
          )}
        </div>

        {/* Highest Sale */}
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold text-gray-800 mb-3">
            Highest Sale Product
          </h3>
          {dashBoardData.highestSaleProduct?.name ? (
            <div className="text-gray-600">
              <p>
                <strong>Name:</strong> {dashBoardData.highestSaleProduct.name}
              </p>
              <p>
                <strong>Category:</strong>{" "}
                {dashBoardData.highestSaleProduct.category}
              </p>
              <p>
                <strong>Total Unit Sold:</strong>{" "}
                {dashBoardData.highestSaleProduct.totalQuantity}
              </p>
            </div>
          ) : (
            <p className="text-gray-500">
              {dashBoardData.highestSaleProduct?.message || "Loading..."}
            </p>
          )}
        </div>

        {/* Low Stock */}
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold text-gray-800 mb-3">
            Low Stock Product
          </h3>
          {dashBoardData.lowStock.length > 0 ? (
            <ul className="space-y-2">
              {dashBoardData.lowStock.map((product, index) => (
                <li key={index} className="text-gray-600">
                  <strong>{product.name}</strong> - {product.stock} left{" "}
                  <span className="text-gray-400">
                    ({product.categoryId.name})
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">No low stock product</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardContent;
