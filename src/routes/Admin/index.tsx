import { useEffect, useState } from "react";
import Admin from "./Admin";
import { useAuth } from "../../providers/AuthProvider";

const API = "http://localhost:4000/api";

const AdminRoute = () => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    fetch(`${API}/auth/me`, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setJobs(data?.ownedJobs ?? []))
      .catch(() => setJobs([]));
  }, [user]);

  return <Admin jobs={jobs} />;
};

export default AdminRoute;
