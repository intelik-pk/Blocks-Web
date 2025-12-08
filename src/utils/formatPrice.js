/**
 * Format price with abbreviations (for tooltips/hover)
 * @param {number|string} amount - The amount to format
 * @param {string} currency - Currency symbol (default: 'USD')
 * @returns {string} Formatted price with abbreviations (e.g., "$45K", "$1.2M")
 */
export const formatPrice = (amount, currency = 'USD') => {
  const num = parseFloat(amount);
  if (isNaN(num)) return `${currency}0`;
  if (num >= 1000000000) {
    return `${currency} ${(num / 1000000000).toFixed(1)}B`;
  } else if (num >= 1000000) {
    return `${currency} ${(num / 1000000).toFixed(1)}M`;
  } else if (num >= 1000) {
    return `${currency} ${(num / 1000).toFixed(0)}K`;
  }
  return `${currency}${num.toFixed(0)}`;
};

/**
 * Format exact price with 2 decimal places (for display)
 * @param {number|string} amount - The amount to format
 * @param {string} currency - Currency symbol (default: '$')
 * @returns {string} Formatted price with 2 decimals (e.g., "$45,000.00")
 */
export const formatExactPrice = (amount, currency = '$') => {
  const num = parseFloat(amount);
  if (isNaN(num)) return `${currency}0.00`;
  return `${currency}${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/**
 * Format full price for hover tooltip (complete unformatted value)
 * @param {number|string} amount - The amount to format
 * @param {string} currency - Currency symbol (default: '$')
 * @returns {string} Complete full value with all decimal places (e.g., "$45,000.00" or "$45,000.123456")
 */
export const formatFullPrice = (amount, currency = '$') => {
  const num = parseFloat(amount);
  if (isNaN(num)) return `${currency}0.00`;
  // Show complete full value with commas and all decimal places (up to 10 for display)
  return `${currency}${num.toLocaleString('en-US', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 10 
  })}`;
};

