import React, { useState } from "react";

export default function Login({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const login = async () => {
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error);
      return;
    }

    localStorage.setItem("admin_auth", "true");
    onSuccess();
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-black text-white">
      <div className="bg-gray-900 p-6 rounded shadow-lg w-80">
        <h2 className="text-xl font-bold mb-4">Admin Login</h2>

        <input
          type="password"
          className="w-full bg-gray-800 border border-gray-700 px-3 py-2 rounded mb-3"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <div className="text-red-500 mb-3">{error}</div>}

        <button
          onClick={login}
          className="w-full bg-blue-600 py-2 rounded font-bold"
        >
          Login
        </button>
      </div>
    </div>
  );
}
