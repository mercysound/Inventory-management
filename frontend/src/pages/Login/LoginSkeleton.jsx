import React from "react";

const LoginSkeleton = () => {
  return (
    <div className="animate-pulse space-y-3 w-full">
      <div className="h-4 bg-gray-300 rounded w-3/4 mx-auto"></div>
      <div className="h-10 bg-gray-300 rounded"></div>
      <div className="h-10 bg-gray-300 rounded"></div>
      <div className="h-8 bg-gray-300 rounded w-1/2 mx-auto"></div>
    </div>
  );
};

export default LoginSkeleton;
