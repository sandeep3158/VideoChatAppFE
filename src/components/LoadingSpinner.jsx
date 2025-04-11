import { Spinner } from "flowbite-react";

export const LoadingSpinner = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="flex flex-col items-center">
        <Spinner size="xl" />
        <p className="mt-4 text-lg font-semibold text-gray-700">Searhing for active online users...</p>
      </div>
    </div>
  );
};
