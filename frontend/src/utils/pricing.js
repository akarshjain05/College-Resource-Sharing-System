export function computeTotalAmountRupees(borrowRequest, resource) {
  if (!borrowRequest || !resource) return 0;
  
  const dailyPrice = resource.daily_price || 0;
  const deposit = resource.deposit_amount || 0;
  
  // Calculate days difference
  const start = new Date(borrowRequest.start_date);
  const end = new Date(borrowRequest.end_date);
  
  // Inclusive of start date, so if start == end, it's 1 day
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  
  return (dailyPrice * diffDays) + deposit;
}
