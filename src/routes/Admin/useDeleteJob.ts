import { useState } from "react";

const API = "http://localhost:4000/api";

const useDeleteJob = () => {
  const [isLoading, setIsLoading] = useState(false);

  const deleteJob = async (jobId: string) => {
    setIsLoading(true);
    try {
      await fetch(`${API}/jobs/${jobId}`, {
        method: "DELETE",
        credentials: "include",
      });
      // Reload to reflect changes
      window.location.reload();
    } finally {
      setIsLoading(false);
    }
  };

  return { deleteJob, isLoading };
};

export default useDeleteJob;
