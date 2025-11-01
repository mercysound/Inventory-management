// import React from "react";
// import { FaTrashAlt } from "react-icons/fa";

// const OrderHistoryTable = ({ orders, handleDeleteOrder, deleting }) => {
//   // Calculate total of all orders
//   const grandTotal = orders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);

//   return (
//     <div className="w-full bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200">
//       <div className="px-4 py-3 bg-gradient-to-r from-gray-600 to-gray-800 text-white font-semibold text-lg">
//         Completed Orders History
//       </div>

//       <div className="overflow-x-auto">
//         <table className="min-w-full text-sm text-gray-700 border-collapse">
//           <thead className="bg-gray-100 uppercase font-semibold text-gray-600">
//             <tr>
//               <th className="p-3 text-left">#</th>
//               <th className="p-3 text-left">Buyer</th>
//               <th className="p-3 text-left">Staff</th>
//               <th className="p-3 text-left">Products</th>
//               <th className="p-3 text-left">Total</th>
//               <th className="p-3 text-left">Payment</th>
//               <th className="p-3 text-left">Status</th>
//               <th className="p-3 text-left">Date & Time</th>
//               <th className="p-3 text-left">Actions</th>
//             </tr>
//           </thead>
//           <tbody>
//             {orders.map((order, i) => (
//               <tr key={order._id} className="border-t hover:bg-gray-50 transition duration-200 align-top">
//                 <td className="p-3">{i + 1}</td>
//                 <td className="p-3 font-medium text-gray-800">{order.buyerName || "Unknown"}</td>
//                 <td className="p-3">{order.userOrdering?.name || "Unknown"}</td>

//                 {/* Products */}
//                 <td className="p-3">
//                   <ul className="space-y-1">
//                     {order.productList?.map((item, idx) => (
//                       <li key={idx}>
//                         <p className="font-semibold">
//                           {item?.productId?.name || "Unnamed"} ×{item.quantity || 1} 
//                           <span className="text-gray-500 text-sm">
//                             ({item?.productId?.categoryId?.name || "No Category"})
//                           </span>
//                         </p>
//                       </li>
//                     ))}
//                   </ul>
//                 </td>

//                 <td className="p-3 font-semibold">₦{order.totalPrice?.toLocaleString() || 0}</td>
//                 <td className="p-3">{order.paymentMethod || "N/A"}</td>
//                 <td className="p-3">
//                   <span
//                     className={`px-2 py-1 rounded-full text-xs font-medium ${
//                       order.deliveryStatus === "pending"
//                         ? "bg-yellow-100 text-yellow-800"
//                         : order.deliveryStatus === "in transit"
//                         ? "bg-blue-100 text-blue-700"
//                         : "bg-green-100 text-green-700"
//                     }`}
//                   >
//                     {order.deliveryStatus || "Delivered"}
//                   </span>
//                 </td>
//                 <td className="p-3 text-gray-600">
//                   {new Date(order.createdAt).toLocaleDateString()}{" "}
//                   <span className="text-xs text-gray-400">
//                     {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
//                   </span>
//                 </td>
//                 <td className="p-3">
//                   <button
//                     onClick={() => handleDeleteOrder(order._id)}
//                     disabled={deleting}
//                     className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded-md flex items-center gap-1"
//                   >
//                     <FaTrashAlt className="text-xs" /> Delete
//                   </button>
//                 </td>
//               </tr>
//             ))}

//             {/* Grand Total */}
//             <tr className="bg-gray-50 font-bold text-gray-800 border-t">
//               <td colSpan={4} className="p-3 text-right">Grand Total:</td>
//               <td className="p-3 text-indigo-600">₦{grandTotal.toLocaleString()}</td>
//               <td colSpan={4}></td>
//             </tr>
//           </tbody>
//         </table>
//       </div>
//     </div>
//   );
// };

// export default OrderHistoryTable;
