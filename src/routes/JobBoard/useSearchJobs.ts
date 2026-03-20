import { useEffect, useState } from "react";

const API = "http://localhost:4000/api";

const useSearchJobs = () => {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/jobs?query=${encodeURIComponent(search)}`, {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => setResults(data))
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [search]);

  return { search, setSearch, results, isLoading: loading };
};

export default useSearchJobs;
