export const parseApiError = (error) => {
  const data = error.response?.data;
  if (data?.errors?.length) {
    return data.errors.map((e) => e.message).join(", ");
  }
  return data?.message || error.message || "Something went wrong";
};