import { useState } from "react";

const API = "http://localhost:4000/api";

const useCancelApplication = () => {
  const [isLoading, setIsLoading] = useState(false);

  const cancelApplication = async (jobId: string) => {
    setIsLoading(true);
    try {
      await fetch(`${API}/jobs/${jobId}/apply`, {
        method: "DELETE",
        credentials: "include",
      });
      window.location.reload();
    } finally {
      setIsLoading(false);
    }
  };

  return { cancelApplication, isLoading };
};

export default useCancelApplication;
