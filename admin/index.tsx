import React, { useEffect } from "react";
import Login from "./Login";
import Dashboard from "./Dashboard";

export default function AdminPage() {
  const [loggedIn, setLoggedIn] = React.useState(false);

  useEffect(() => {
    if (localStorage.getItem("admin_auth") === "true") {
      setLoggedIn(true);
    }
  }, []);

  if (!loggedIn) return <Login onSuccess={() => setLoggedIn(true)} />;

  return <Dashboard />;
}
