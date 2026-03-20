import { useEffect, useState } from "react";
import Profile from "./Profile";
import { useAuth } from "../../providers/AuthProvider";

const API = "http://localhost:4000/api";

const ProfileRoute = () => {
  const { user } = useAuth();
  const [appliedJobs, setAppliedJobs] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    fetch(`${API}/auth/me`, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setAppliedJobs(data?.appliedJobs ?? []))
      .catch(() => setAppliedJobs([]));
  }, [user]);

  const safeUser = {
    name: user?.name || "",
    email: user?.email || "",
  };

  return <Profile user={safeUser} appliedJobs={appliedJobs} />;
};

export default ProfileRoute;
