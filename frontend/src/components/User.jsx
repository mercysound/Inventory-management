import axios from 'axios';
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router';

const Users = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    address: "",
    role: ""
  });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filteredUsers, setFilteredUsers] = useState([]);

  const navigate = useNavigate()

  const fetchUsers = async () => {
    setLoading(true)
    try {

      const response = await axios.get('http://localhost:3000/api/users', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("pos-token")}`,
        }
      });
      setUsers(response.data.users);
      setFilteredUsers(response.data.users);
    } catch (error) {
      console.error("Error fetching users", error)
    }
    finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    fetchUsers()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault();
      let response = await axios.post(`http://localhost:3000/api/users/add`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('pos-token')}`
          },
        }
      );
      // }
      if (response.data.success) {
        alert("User Added Successful");
        setFormData({
          name: "",
          email: "",
          password: "",
          address: "",
          role: ""
        })
        fetchUsers()
      } else {
        console.error("Error adding user:");
        
        alert("Error adding user, pls try again")
      }
  }

  const handleChange = (e) =>{
    const {name, value} = e.target;
    setFormData((prevData)=>({
      ...prevData, 
      [name]:value
    }));
  }

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this User?")
    if (confirmDelete) {
      try {
        const response = await axios.delete(`http://localhost:3000/api/users/${id}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("pos-token")}`
            },
          }
        );
        if (response.data.success) {
          alert("User deleted successfully!")
          fetchUsers(); // Refresh the users  list after deletion
        } else {
          console.error("Error deleting user");
          alert("Error deleting user. Please try again")
        }
      } catch (error) {
        console.error("Error deleting category:", error)
        alert("Error deleting user. Please try again")

      }
    }
  }

  const handleSearch = async (e)=>{
    setFilteredUsers(
      users.filter((user)=>
        user.name.toLowerCase().includes(e.target.value.toLowerCase())
      )
    )
  }

  if (loading) return <div>........</div>

  return (
    <div className='py-4'>
      <h1 className='text-2xl font-bold mb-8'>Users Management</h1>
      <div className='flex flex-col lg:flex-row gap-4'>
        <div className='lg:w-1/3'>
          <div className='bg-white shadow-md rounded-lg p-4'>
            <h2 className='text-center text-xl font-bold mb-4'>Add User</h2>
            <form className='space-y-4' onSubmit={handleSubmit}>
              <div>
                <input type="text" placeholder='Enter Name' className='border w-full p-2 rounded-md'
                  required
                  name='name'
                  onChange={handleChange}
                />
              </div>
              <div>
                <input type="email" placeholder='Enter Email' className='border w-full p-3 rounded-md'
                  required
                  name='email'
                  onChange={handleChange}
                />
              </div>
              <div>
                <input type="password" placeholder='Enter Password' className='border w-full p-3 rounded-md'
                  required
                  name='email'
                  onChange={handleChange}
                />
              </div>
              <div>
                <input type="address" placeholder='Enter Address' className='border w-full p-3 rounded-md'
                  required
                  name='address'
                  onChange={handleChange}
                />
              </div>
              <div>
                <select name="role" className='border w-full p-3 rounded-md' onChange={handleChange}>
                  <option value="">Select Role</option>
                  <option value="admin">Admin</option>
                  <option value="customer">Customer</option>
                </select>
              </div>
              <div className='flex space-x-2'>
                <button className='w-full mt-2 rounded-md bg-green-500 text-white p-3 cursor-pointer hover:bg-red-600' type='submit'>Add User</button>
              </div>
            </form>
          </div>
        </div>

        <div className='lg:w-2/3'>
        <input type="text" placeholder='Serarch user' className='p-2 bg-white w-full mb-4 rounded' onChange={handleSearch} />
          <div className="bg-white shadow-md rounded-lg p-4">
            <table className='w-full border-collapse border border-gray-200'>
              <thead>
                <tr className='bg-gray-100'>
                  <th className='border border-gray-200 p-2'>S/N</th>
                  <th className='border border-gray-200 p-2'> Name</th>
                  <th className='border border-gray-200 p-2'>Email</th>
                  <th className='border border-gray-200 p-2'>Address</th>
                  <th className='border border-gray-200 p-2'>Role</th>
                  <th className='border border-gray-200 p-2'>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers && filteredUsers.map((user, index) => (
                  <tr key={index}>
                    <td className='border border-gray-200 p-2'>{index + 1}</td>
                    <td className='border border-gray-200 p-2'>{user.name}</td>
                    <td className='border border-gray-200 p-2'>{user.email}</td>
                    <td className='border border-gray-200 p-2'>{user.address}</td>
                    <td className='border border-gray-200 p-2'>{user.role}</td>
                    <td className='border border-gray-200 p-2'>
                      <button
                        onClick={() => handleDelete(user._id)}
                        className='bg-red-500 text-white p-2 rounded-md hover:bg-red-600'>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredUsers.length === 0 && <div>No Records</div>}
          </div>
        </div>

      </div>
    </div>
  )
}

export default Users;
