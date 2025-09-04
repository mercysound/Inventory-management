import { Navigate, useNavigate } from "react-router"
import { useAuth } from "../context/AuthContext"
import { useEffect } from "react";

const ProtectedRoutes = ({children, requireRole}) =>{
  const {user} = useAuth();
  const navigate = useNavigate();
  useEffect(()=>{
    if(!user){
      navigate('/login')
      return;
    }
    if(!requireRole.includes(user.role)){
      navigate('/unauthorized')
      return;
    }
  }, [user, navigate, requireRole ])
  // return user ? children : <Navigate to="/login"/>
  if(!user) return null;
  if(!requireRole.includes(user.role))  return null;

  return children;

}

export default ProtectedRoutes;

