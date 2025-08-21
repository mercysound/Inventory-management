import React, { useState } from 'react';

const Login = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);


    const handleSubmit =  async (e)=>{
       e.preventDefault();
       setLoading(true);
       setError(null)

       try {
        const response = axios.post("http://localhost:5000/api/login", {email:email});
        if (!response.ok) {
          throw new Error("Login failed. Please check your credentials.")
        }

        const data = await response.json();
        localStorage.setItem("pos-user", JSON.stringify(data.user));
        localStorage.setItem("pos-token", data.token);
        window.location.href = "/admin/dashboard"
       } catch (error) {
        setError(error.message);
       }
    }

  return (
    <div className='flex flex-col items-center h-screen justify-center bg-gradient-to-b from-green-600 from-50% to-gray-100 to-50% space-y-6'>
      <h2 className='text-3xl text-white'>Inventory Management System</h2>
      <div className="border shadow-lg p-6 w-80 bg-white">
        <h2 className='text-2xl font-bold mb-4'>Login</h2>
        <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className='block text-gray-700'>Email</label>
          <input type="email" 
          className='w-full px-3 py-2 border'
          name='email'
          onChange={(e)=>setEmail(e.target.value)}
          placeholder='Enter Email'/>
        </div>
        <div className="mb-4">
          <label className='block text-gray-700'>Password</label>
          <input type="password" 
          className='w-full px-3 py-2 border'
          name='password'
          onChange={(e)=>setPassword(e.target.value)}
          placeholder='Enter Password'/>
        </div>
        <button
          type='submit'
          className='w-full bg-green-600 text-white py-2'
        >
          Login</button>
      </form>
      </div>
    </div>
  )
}

export default Login
