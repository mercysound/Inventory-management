import React from "react";

const ProfileSkeleton = () => {
  return (
    <div className="p-5">
      <div className="bg-white p-6 rounded-lg shadow max-w-md animate-pulse">
        <div className="h-6 bg-gray-300 rounded w-1/3 mb-4"></div>

        <div className="space-y-4">
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-10 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSkeleton;
