import { useState } from "react";
import { createDefaultAdmin } from "../utils/createAdmin";

const CreateAdmin = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleCreateAdmin = async () => {
    setLoading(true);
    setMessage("");

    const result = await createDefaultAdmin();
    
    if (result.success) {
      setMessage("✅ Admin user created successfully! You can now login with admin@greenfield.edu.ng");
    } else {
      setMessage(`❌ Error: ${result.error}`);
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <h2 className="text-2xl font-bold mb-6 text-center">Create Admin User</h2>
        
        <div className="mb-4 p-4 bg-green-50 rounded">
          <p className="text-sm text-green-800">
            <strong>Default Admin:</strong><br/>
            Email: admin@greenfield.edu.ng<br/>
            Password: admin123456
          </p>
        </div>

        <button
          onClick={handleCreateAdmin}
          disabled={loading}
          className="w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Admin User"}
        </button>

        {message && (
          <div className="mt-4 p-3 rounded bg-gray-50">
            <p className="text-sm">{message}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateAdmin;