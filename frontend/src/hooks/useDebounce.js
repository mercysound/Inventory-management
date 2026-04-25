// frontend/src/hooks/useDebounce.js
import { useState, useEffect } from "react";

export const useDebounce = (value, delay = 500) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Hook for debounced search
export const useDebouncedSearch = (initialValue = "", delay = 500) => {
  const [searchTerm, setSearchTerm] = useState(initialValue);
  const debouncedSearchTerm = useDebounce(searchTerm, delay);

  const updateSearch = (value) => {
    setSearchTerm(value);
  };

  const clearSearch = () => {
    setSearchTerm("");
  };

  return {
    searchTerm,
    debouncedSearchTerm,
    updateSearch,
    clearSearch,
    isSearching: searchTerm !== debouncedSearchTerm,
  };
};