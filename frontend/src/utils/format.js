export function formatCurrency(amount) {
  return `₹${Number(amount).toLocaleString('en-IN')}`;
}

export function formatExperience(years) {
  return `${years} year${years !== 1 ? 's' : ''}`;
}
