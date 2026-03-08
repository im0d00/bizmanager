import { useState } from 'react';
import { useAppStore } from '../store/appStore';

export const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { addNotification } = useAppStore();

  const execute = async (apiFn, options = {}) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFn();
      if (options.successMessage) {
        addNotification({ type: 'success', message: options.successMessage });
      }
      if (options.onSuccess) {
        options.onSuccess(result);
      }
      return result;
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'An error occurred';
      setError(msg);
      addNotification({ type: 'error', message: msg });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { loading, error, execute };
};
