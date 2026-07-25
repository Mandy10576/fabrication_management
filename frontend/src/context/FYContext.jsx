import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

const FYContext = createContext();

export const FYProvider = ({ children }) => {
  const { token } = useAuth();
  const [financialYears, setFinancialYears] = useState([]);
  const [selectedFY, setSelectedFY] = useState('ALL'); // 'ALL' or FY object or FY id
  const [loading, setLoading] = useState(true);

  const fetchFYs = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const data = await api.get('/financial-years');
      setFinancialYears(data);
      
      // Auto select current financial year if none selected
      const current = data.find(f => f.isCurrent);
      if (current && selectedFY === 'ALL') {
        setSelectedFY(current.id);
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
