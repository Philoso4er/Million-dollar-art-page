import { useState } from "react";
import AdminPanel from "../src/components/AdminPanel";

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");

  const login = async () => {
    // Password is checked server-side against ADMIN_PASSWORD; nothing secret ships in the bundle.
    try {
      const res = await fetch("/api/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        setAuthenticated(true);
      } else {
        alert("Incorrect password");
      }
    } catch {
      alert("Could not reach the server. Please try again.");
    }
  };

  if (!authenticated) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-white">
        <div className="bg-gray-800 p-6 rounded border border-gray-700">
          <h2 className="text-xl mb-4">Admin Login</h2>

          <input
            type="password"
            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded"
            placeholder="Enter admin password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            onClick={login}
            className="mt-4 w-full bg-green-600 py-2 rounded"
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  return <AdminPanel />;
}
