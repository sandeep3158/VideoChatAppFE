export const NoUserFound = ({ onRetry, isRetrying }: any) => {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-blue-50 to-white gap-6">
      
      <div className="text-6xl">😔</div>

      <h2 className="text-2xl font-bold text-gray-800">No User Found</h2>

      <p className="text-gray-500 text-center max-w-sm">
        {isRetrying
          ? "Searching for someone to connect with..."
          : "We couldn't find anyone to match you with right now."}
      </p>

      {isRetrying && (
        <div className="flex items-center gap-2 text-blue-500 text-sm font-medium">
          <svg
            className="animate-spin h-4 w-4 text-blue-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z"
            />
          </svg>
          Looking for available users...
        </div>
      )}

      <button
        onClick={onRetry}
        disabled={isRetrying}
        className={`px-6 py-3 rounded-lg font-semibold text-white transition-colors duration-200 ${
          isRetrying
            ? "bg-blue-300 cursor-not-allowed"
            : "bg-blue-500 hover:bg-blue-600 cursor-pointer"
        }`}
      >
        {isRetrying ? "Searching..." : "Find New Match"}
      </button>

    </div>
  );
};