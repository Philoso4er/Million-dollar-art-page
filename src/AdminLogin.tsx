import React, { useState } from "react";

export default function AdminLogin({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = async () => {
    const res = await fetch("/api/admin-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (!res.ok) {
      setError("Invalid password");
      return;
    }

    // store session token in localStorage
    localStorage.setItem("admin-auth", "true");
    onSuccess();
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-black text-white">
      <div className="bg-gray-900 p-6 rounded-xl border border-gray-700 w-full max-w-sm">
        <h2 className="text-xl font-bold mb-4">Admin Login</h2>

        <input
          type="password"
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded mb-3"
          placeholder="Enter admin password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <p className="text-red-400 mb-3">{error}</p>}

        <button
          onClick={submit}
          className="w-full bg-blue-600 py-2 rounded font-bold"
        >
          Login
        </button>
      </div>
    </div>
  );
}
