import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';

export function useDataFetch() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMultiple = useCallback(async (promises, onSuccess, errorMessage = "Failed to load data") => {
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.all(promises);
      if (onSuccess) {
        onSuccess(results);
      }
      return results;
    } catch (err) {
      console.error(err);
      setError(err);
      toast.error(err.response?.data?.detail || errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, setLoading, error, fetchMultiple };
}
