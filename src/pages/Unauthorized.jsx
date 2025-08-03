import { Link } from "react-router-dom";

const Unauthorized = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-red-600 mb-4">403</h1>
        <h2 className="text-2xl font-semibold mb-4">Unauthorized Access</h2>
        <p className="text-gray-600 mb-6">You don't have permission to access this page.</p>
        <Link 
          to="/login" 
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Back to Login
        </Link>
      </div>
    </div>
  );
};

export default Unauthorized;