// import axios from 'axios';
// import React, { useEffect, useState } from 'react'
// import { useNavigate } from 'react-router';
// import { BASE_URL } from '../App';
// import { toast } from 'react-toastify';

// const Categories = () => {
//   const [categoryName, setCategoryName] = useState("");
//   const [categoryDescription, setCategoryDescription] = useState("");
//   const [categories, setCategories] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [editCategory, setEditCategory] = useState(null);
//   const navigate = useNavigate()

//   const fetchCagories = async () => {
//     setLoading(true)
//     try {

//       const response = await axios.get(`${BASE_URL}/api/category`, {
//         headers: {
//           Authorization: `Bearer ${localStorage.getItem("pos-token")}`,
//         }
//       });
//       setCategories(response.data.categories);
//     } catch (error) {
//       console.error("Error fetching categories", error)

//       if (error.response && error.response.status === 401) {
//         if (error.response.data.message === "Token has expired, please login again") {
//           localStorage.removeItem("token");
//           navigate("/login");
//         }
//       }
//     }
//     finally {
//       setLoading(false);
//     }
//   }
//   useEffect(() => {
//     fetchCagories()
//   }, [])

//   const handleSubmit = async (e) => {
//     e.preventDefault();

//     try {
//       let response;

//       if (editCategory) {
//         response = await axios.put(`${BASE_URL}/api/category/${editCategory}`,
//           { categoryName, categoryDescription },
//           {
//             headers: {
//               Authorization: `Bearer ${localStorage.getItem('pos-token')}`
//             },
//           }
//         );
//       } else {
//         response = await axios.post(`${BASE_URL}/api/category/add`,
//           { categoryName, categoryDescription },
//           {
//             headers: {
//               Authorization: `Bearer ${localStorage.getItem('pos-token')}`
//             },
//           }
//         );
//       }
//       if (response.data.success) {
//         setCategoryName("");
//         setCategoryDescription("");
//         setEditCategory(null);
//         fetchCagories();
//         toast.success(editCategory ? "Category Updated Successful" : "Category Added Successful")
//       } else {
//         toast.error(editCategory ? "Error Updating Category, pls try again" : "Error addding category, pls try again")
//       }
//     } catch (error) {
//       console.error("Category request error:", error)
//       toast.success("Something went wrong, Please try again.")
//     }
//   }

//   const handleEdit = async (category) => {
//     setEditCategory(category._id)
//     setCategoryName(category.name)
//     setCategoryDescription(category.description)
//   }
//   const handleCancel = async () => {
//     setEditCategory(null)
//     setCategoryName("");
//     setCategoryDescription("")
//   }
//   const handleDelete = async (id) => {
//     const confirmDelete = window.confirm("Are you sure you want to delete this category?")
//     if (confirmDelete) {
//       try {
//         const response = await axios.delete(`${BASE_URL}/api/category/${id}`,
//           {
//             headers: {
//               Authorization: `Bearer ${localStorage.getItem("pos-token")}`
//             },
//           }
//         );
//         if (response.data.success) {
//           toast.success("Category deleted successfully!")
//           fetchCagories(); // Refresh the categories list after deletion
//         } else {
//           console.error("Error deleting category", data);
//           toast.error("Error deleting category. Please try again")
//         }
//       } catch (error) {
//         if(error.response){
//           toast.error(error.response.data.message)
//         }else{
//           // console.error("Error deleting category:", error)
//           toast.error("Error deleting category. Please try again")
//         }
//       }
//     }
//   }
//   if (loading) return <div>Loading ........</div>
//   return (
//     <div className='py-4'>
//       <h1 className='text-2xl font-bold mb-8 ml-3'>Category Management</h1>
//       <div className='flex flex-col lg:flex-row gap-4'>
//         <div className='lg:w-1/3'>
//           <div className='bg-white shadow-md rounded-lg p-4'>
//             <h2 className='text-center text-xl font-bold mb-4'>{editCategory ? "Edit Category" : "Add Category"}</h2>
//             <form className='space-y-4' onSubmit={handleSubmit}>
//               <div>
//                 <input type="text" placeholder='Category Name' className='border w-full p-2 rounded-md'
//                   required
//                   value={categoryName}
//                   onChange={(e) => setCategoryName(e.target.value)}
//                 />
//               </div>
//               <div>
//                 <input type="text" placeholder='Category Description' className='border w-full p-3 rounded-md'
//                   required
//                   value={categoryDescription}
//                   onChange={(e) => setCategoryDescription(e.target.value)}
//                 />
//               </div>
//               <div className='flex space-x-2'>
//                 <button className='w-full mt-2 rounded-md bg-green-500 text-white p-3 cursor-pointer hover:bg-green-600' type='submit'>{editCategory ? "Save Changes " : "Add Category"}</button>
//                 {
//                   editCategory && (
//                     <button
//                       type='button'
//                       className='w-full mt-2 rounded-md bg-red-500 text-white p-3 cursor-pointer hover:bg-red-600'
//                       onClick={handleCancel}
//                     >
//                       Cancel
//                     </button>
//                   )
//                 }
//               </div>
//             </form>
//           </div>
//         </div>

//         <div className='lg:w-2/3'>
//           <div className="bg-white shadow-md rounded-lg p-4">
//             <table className='w-full border-collapse border border-gray-200'>
//               <thead>
//                 <tr className='bg-gray-100'>
//                   <th className='border border-gray-200 p-2'>S/N</th>
//                   <th className='border border-gray-200 p-2'>Category Name</th>
//                   <th className='border border-gray-200 p-2'>Description</th>
//                   <th className='border border-gray-200 p-2'>Action</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {categories.map((category, index) => (
//                   <tr key={index}>
//                     <td className='border border-gray-200 p-2'>{index + 1}</td>
//                     <td className='border border-gray-200 p-2'>{category.name}</td>
//                     <td className='border border-gray-200 p-2'>{category.description}</td>
//                     <td className='border border-gray-200 p-2'>
//                       <button onClick={() => handleEdit(category)} className='bg-blue-500 text-white p-2 rounded-md hover:bg-red-600 mr-2'>Edit</button>
//                       <button
//                         onClick={() => handleDelete(category._id)}
//                         className='bg-red-500 text-white p-2 rounded-md hover:bg-red-600'>Delete</button>
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         </div>

//       </div>
//     </div>
//   )
// }

// export default Categories;
