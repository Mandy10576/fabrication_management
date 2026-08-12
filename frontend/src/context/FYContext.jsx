import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

const FYContext = createContext();

export const FYProvider = ({ children }) => {
  const { token } = useAuth();
  const [financialYears, setFinancialYears] = useState(() => {
    try {
      const saved = localStorage.getItem('khodiyar_fys');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [selectedFY, setSelectedFYState] = useState(() => {
    return localStorage.getItem('khodiyar_selected_fy') || 'ALL';
  });
  const [loading, setLoading] = useState(financialYears.length === 0);

  const setSelectedFY = (fyId) => {
    setSelectedFYState(fyId);
    try {
      localStorage.setItem('khodiyar_selected_fy', fyId);
    } catch (e) {}
  };

  const fetchFYs = async () => {
    if (!token) return;
    try {
      const data = await api.get('/financial-years');
      setFinancialYears(data);
      try {
        localStorage.setItem('khodiyar_fys', JSON.stringify(data));
      } catch (e) {}
      
      // Auto-select the current financial year if none is explicitly set, or
      // if the persisted selection no longer exists (e.g. pointing at a
      // financial year from a different/reseeded database) — otherwise every
      // FY-scoped list silently filters to nothing with no visible error.
      const current = data.find(f => f.isCurrent);
      const selectionIsStale = selectedFY !== 'ALL' && selectedFY && !data.some(f => f.id === selectedFY);
      if (current && (selectedFY === 'ALL' || !selectedFY || selectionIsStale)) {
        setSelectedFY(current.id);
      } else if (selectionIsStale) {
        setSelectedFY('ALL');
      }
    } catch (err) {
      console.error('Failed to load financial years:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFYs();
  }, [token]);

  const activeFYObj = financialYears.find(f => f.id === selectedFY);

  return (
    <FYContext.Provider value={{
      financialYears,
      selectedFY,
      setSelectedFY,
      activeFYObj,
      fetchFYs,
      loading
    }}>
      {children}
    </FYContext.Provider>
  );
};

export const useFY = () => useContext(FYContext);
