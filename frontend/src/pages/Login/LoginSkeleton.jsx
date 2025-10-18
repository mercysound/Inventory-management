import React from "react";

const LoginSkeleton = () => {
  return (
    <div className="border shadow-lg p-6 w-80 bg-white animate-pulse">
      <div className="h-6 bg-gray-300 rounded mb-4 w-1/2 mx-auto"></div>
      <div className="space-y-4">
        <div className="h-4 bg-gray-300 rounded w-3/4 mx-auto"></div>
        <div className="h-4 bg-gray-300 rounded w-full"></div>
        <div className="h-4 bg-gray-300 rounded w-full"></div>
        <div className="h-8 bg-gray-400 rounded mt-6"></div>
      </div>
    </div>
  );
};

export default LoginSkeleton;
