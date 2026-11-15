import { useState, useEffect } from 'react';
import { getCellsByDate } from '../services/fireService';

export const useFireData = (date) => {
  const [cells, setCells] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    getCellsByDate(date)
      .then(data => { if (isMounted) { setCells(data); setError(null); } })
      .catch(err => { if (isMounted) setError(err.message); })
      .finally(() => { if (isMounted) setLoading(false); });
    return () => { isMounted = false; };
  }, [date]);

  return { cells, loading, error };
};