import React from "react";
import { FaPlus, FaMinus, FaTrash, FaFileInvoice } from "react-icons/fa";


const StaffTable = ({
orders,
loading,
onIncreaseQty,
onReduceQty,
onRemoveOrder
}) => {
if (loading) {
return <div className="p-6 text-center text-gray-500">Loading orders...</div>;
}


if (!orders.length) {
return <div className="p-6 text-center text-gray-500">No orders found.</div>;
}


return (
<div className="overflow-x-auto border rounded-xl shadow-sm bg-white">
<table className="min-w-full text-sm md:text-base">
<thead className="bg-indigo-600 text-white">
<tr>
<th className="p-3">#</th>
<th className="p-3">Product</th>
<th className="p-3">Qty</th>
<th className="p-3">Price</th>
<th className="p-3">Total</th>
<th className="p-3">Actions</th>
</tr>
</thead>
<tbody>
{orders.map((o, i) => (
<tr key={o._id} className="border-t">
<td className="p-3">{i + 1}</td>
<td className="p-3">{o.product?.name}</td>
<td className="p-3 text-center">{o.quantity}</td>
<td className="p-3">₦{o.price.toLocaleString()}</td>
<td className="p-3 font-semibold">
₦{(o.totalPrice || o.quantity * o.price).toLocaleString()}
</td>
<td className="p-3 space-x-1 text-center">
<button onClick={() => onReduceQty(o._id)} className="p-2 bg-yellow-500 text-white rounded-full"><FaMinus /></button>
<button onClick={() => onIncreaseQty(o._id)} className="p-2 bg-green-500 text-white rounded-full"><FaPlus /></button>
<button onClick={() => onRemoveOrder(o._id)} className="p-2 bg-red-600 text-white rounded-full"><FaTrash /></button>
</td>
</tr>
))}
</tbody>
</table>
</div>
);
};


export default StaffTable;