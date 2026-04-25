// server/utils/pagination.js
export const getPaginationParams = (req) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
  const skip = (page - 1) * limit;

  // Sorting
  const sortField = req.query.sort || 'createdAt';
  const sortOrder = req.query.order === 'asc' ? 1 : -1;
  const sort = { [sortField]: sortOrder };

  return { page, limit, skip, sort };
};

export const getPaginationMeta = (total, limit, page) => {
  const totalPages = Math.ceil(total / limit);

  return {
    total,
    page,
    limit,
    pages: totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
    nextPage: page < totalPages ? page + 1 : null,
    prevPage: page > 1 ? page - 1 : null,
  };
};

export const applyPaginationAndSorting = (query, req) => {
  const { skip, limit, sort } = getPaginationParams(req);
  return query.skip(skip).limit(limit).sort(sort);
};