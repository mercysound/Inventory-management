import axios from 'axios';
import React, { useState } from 'react'

const Categories = () => {
  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const response = await axios.post('http://localhost:3000/api/category/add',
    { categoryName, categoryDescription },
     {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("pos-token")}`,
        },
      }
    );
    if (response.data.success) {
      setCategoryDescription("");
      setCategoryName("");
      alert("Category added succesfully!")
    }else{
      console.log("Error adding category:", data);
      alert("Error adding category, Please try again")
    }
  }
    return (
      <div className='py-4'>
        <h1 className='text-2xl font-bold mb-8'>Category Management</h1>
        <div className='flex flex-col lg:flex-row gap-4'>
          <div className='lg:w-1/3'>
            <div className='bg-white shadow-md rounded-lg p-4'>
              <h2 className='text-center text-xl font-bold mb-4'>Add Category</h2>
              <form className='space-y-4' onSubmit={handleSubmit}>
                <div>
                  <input type="text" placeholder='Category Name' className='border w-full p-2 rounded-md'
                    onChange={(e) => setCategoryName(e.target.value)}
                  />
                </div>
                <div>
                  <input type="text" placeholder='Category Description' className='border w-full p-3 rounded-md'
                    onChange={(e) => setCategoryDescription(e.target.value)}
                  />
                </div>
                <button className='bg-blue-500 text-white px-4 py-2 rounded' type='submit'>Add Category</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    )
  }

  export default Categories
