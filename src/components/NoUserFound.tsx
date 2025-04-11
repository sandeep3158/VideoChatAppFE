import React, { useCallback } from "react";
import { Button } from "flowbite-react";

export const NoUserFound = () => {
  const handleRetry = useCallback(() => {
    window.location.reload(); // Reloads the entire page
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)] text-center p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-gray-800 mb-2">
        No Active Users Found
      </h2>
      <p className="text-gray-600 mb-6">
        It looks like no users are currently online. Please try again after some time.
      </p>
      <Button
        onClick={handleRetry}
        className="bg-blue-600 text-white hover:bg-blue-700 transition-colors duration-200"
      >
        Try Again
      </Button>
    </div>
  );
};
