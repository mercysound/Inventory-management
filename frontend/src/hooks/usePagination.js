// frontend/src/hooks/usePagination.js
import { useState, useCallback } from "react";

export const usePagination = (initialPage = 1, initialLimit = 10) => {
  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(initialLimit);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const updatePagination = useCallback((paginationData) => {
    if (paginationData) {
      setTotal(paginationData.total || 0);
      setTotalPages(paginationData.pages || 0);
    }
  }, []);

  const goToPage = useCallback((newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  }, [totalPages]);

  const nextPage = useCallback(() => {
    if (page < totalPages) {
      setPage(prev => prev + 1);
    }
  }, [page, totalPages]);

  const prevPage = useCallback(() => {
    if (page > 1) {
      setPage(prev => prev - 1);
    }
  }, [page]);

  const changeLimit = useCallback((newLimit) => {
    setLimit(newLimit);
    setPage(1); // Reset to first page when changing limit
  }, []);

  const reset = useCallback(() => {
    setPage(1);
    setTotal(0);
    setTotalPages(0);
  }, []);

  return {
    page,
    limit,
    total,
    totalPages,
    setPage: goToPage,
    nextPage,
    prevPage,
    changeLimit,
    updatePagination,
    reset,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
};