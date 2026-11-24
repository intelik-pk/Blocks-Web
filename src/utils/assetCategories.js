// Mirrors Blocks-Backend src/properties/asset-categories.ts — keep keys in sync.

export const ASSET_CATEGORIES = {
  real_estate: {
    label: 'Real Estate',
    phase: 0,
    types: [
      { value: 'residential', label: 'Residential' },
      { value: 'commercial', label: 'Commercial' },
      { value: 'mixed', label: 'Mixed' },
    ],
    returnLabel: 'Expected ROI (%)',
    documents: { brochure: 'Brochure', floorPlan: 'Floor Plan', compliance: 'Compliance Document' },
    detailFields: [],
  },
  loan_portfolio: {
    label: 'Loan Portfolios',
    phase: 1,
    description: 'Pools of mortgage, car, personal and business loans, with tokens linked to eligible repayment cash flows.',
    types: [
      { value: 'mortgage', label: 'Mortgage' },
      { value: 'auto', label: 'Car / Auto' },
      { value: 'personal', label: 'Personal' },
      { value: 'business', label: 'Business' },
    ],
    returnLabel: 'Expected Yield (%)',
    defaultCashFlowKind: 'repayment',
    documents: { brochure: 'Information Memorandum', floorPlan: 'Loan Tape / Pool Schedule', compliance: 'Legal & Compliance Document' },
    detailFields: [
      { key: 'loanCount', label: 'Number of Loans', type: 'number' },
      { key: 'outstandingPrincipalUSDT', label: 'Outstanding Principal (USDT)', type: 'number' },
      { key: 'weightedAvgRatePct', label: 'Weighted Avg. Rate (%)', type: 'number' },
      { key: 'weightedAvgRemainingTermMonths', label: 'Weighted Avg. Remaining Term (months)', type: 'number' },
      { key: 'delinquencyRatePct', label: 'Delinquency Rate (%)', type: 'number' },
    ],
  },
  bonds_sukuk: {
    label: 'Bonds & Sukuk',
    phase: 1,
    description: 'Bank-held government securities, corporate bonds and Sukuk, with tokens linked to profit and maturity payments.',
    types: [
      { value: 'government_security', label: 'Government Security' },
      { value: 'corporate_bond', label: 'Corporate Bond' },
      { value: 'sukuk', label: 'Sukuk' },
    ],
    returnLabel: 'Expected Profit / Coupon (%)',
    defaultCashFlowKind: 'profit',
    documents: { brochure: 'Offering Circular / Term Sheet', floorPlan: 'Custody / Holding Statement', compliance: 'Legal & Shariah / Compliance Document' },
    detailFields: [
      { key: 'issuer', label: 'Issuer', type: 'text' },
      { key: 'isin', label: 'ISIN / Security ID', type: 'text' },
      { key: 'faceValueUSDT', label: 'Face Value Held (USDT)', type: 'number' },
      { key: 'couponRatePct', label: 'Coupon / Profit Rate (%)', type: 'number' },
      {
        key: 'paymentFrequency',
        label: 'Payment Frequency',
        type: 'select',
        options: [
          { value: 'monthly', label: 'Monthly' },
          { value: 'quarterly', label: 'Quarterly' },
          { value: 'semi_annual', label: 'Semi-annual' },
          { value: 'annual', label: 'Annual' },
          { value: 'at_maturity', label: 'At maturity' },
        ],
      },
    ],
  },
  trade_finance: {
    label: 'Trade Finance',
    phase: 1,
    description: 'Eligible invoices, bills and trade receivables, allowing banks to raise funds against future collections.',
    types: [
      { value: 'invoice', label: 'Invoices' },
      { value: 'bill', label: 'Bills of Exchange' },
      { value: 'trade_receivable', label: 'Trade Receivables' },
    ],
    returnLabel: 'Expected Discount Yield (%)',
    defaultCashFlowKind: 'collection',
    documents: { brochure: 'Facility Summary', floorPlan: 'Invoice / Receivables Schedule', compliance: 'Legal & Compliance Document' },
    detailFields: [
      { key: 'obligor', label: 'Obligor / Buyer', type: 'text' },
      { key: 'instrumentCount', label: 'Number of Invoices / Bills', type: 'number' },
      { key: 'faceValueUSDT', label: 'Face Value of Receivables (USDT)', type: 'number' },
      { key: 'advanceRatePct', label: 'Advance Rate (%)', type: 'number' },
      { key: 'tenorDays', label: 'Average Tenor (days)', type: 'number' },
    ],
  },
  leasing: {
    label: 'Leasing Assets',
    phase: 2,
    description: 'Vehicle, machinery and equipment leases, with tokens linked to rental payments.',
    types: [
      { value: 'vehicle', label: 'Vehicle' },
      { value: 'machinery', label: 'Machinery' },
      { value: 'equipment', label: 'Equipment' },
    ],
    returnLabel: 'Expected Rental Yield (%)',
    defaultCashFlowKind: 'rental',
    documents: { brochure: 'Lease Summary', floorPlan: 'Lease Schedule', compliance: 'Legal & Compliance Document' },
    detailFields: [
      { key: 'leaseCount', label: 'Number of Leases', type: 'number' },
      { key: 'monthlyRentalUSDT', label: 'Monthly Rental (USDT)', type: 'number' },
      { key: 'remainingTermMonths', label: 'Remaining Term (months)', type: 'number' },
    ],
  },
  repossessed: {
    label: 'Repossessed Assets',
    phase: 2,
    description: 'Bank-owned vehicles, machinery and equipment, with tokens linked to sale proceeds or other legally defined rights.',
    types: [
      { value: 'vehicle', label: 'Vehicle' },
      { value: 'machinery', label: 'Machinery' },
      { value: 'equipment', label: 'Equipment' },
    ],
    returnLabel: 'Expected Return (%)',
    defaultCashFlowKind: 'sale_proceeds',
    documents: { brochure: 'Asset Summary', floorPlan: 'Valuation Report', compliance: 'Legal Title / Compliance Document' },
    detailFields: [
      { key: 'appraisedValueUSDT', label: 'Appraised Value (USDT)', type: 'number' },
      { key: 'appraisalDate', label: 'Appraisal Date', type: 'date' },
      { key: 'saleChannel', label: 'Sale Channel', type: 'text' },
    ],
  },
  npl: {
    label: 'Non-Performing Loans',
    phase: 2,
    description: 'Distressed loan portfolios, with tokens linked to actual recovery proceeds.',
    types: [
      { value: 'mortgage', label: 'Mortgage' },
      { value: 'auto', label: 'Car / Auto' },
      { value: 'personal', label: 'Personal' },
      { value: 'business', label: 'Business' },
    ],
    returnLabel: 'Expected Recovery Return (%)',
    defaultCashFlowKind: 'recovery',
    documents: { brochure: 'Portfolio Summary', floorPlan: 'Loan Tape', compliance: 'Legal & Compliance Document' },
    detailFields: [
      { key: 'loanCount', label: 'Number of Loans', type: 'number' },
      { key: 'outstandingBalanceUSDT', label: 'Outstanding Balance (USDT)', type: 'number' },
      { key: 'expectedRecoveryRatePct', label: 'Expected Recovery Rate (%)', type: 'number' },
    ],
  },
};

// All bank categories (phase 1 + 2) are selectable.
export const ACTIVE_PHASE = 2;

export const BANK_ASSET_CATEGORIES = [
  'loan_portfolio',
  'bonds_sukuk',
  'trade_finance',
  'leasing',
  'repossessed',
  'npl',
];

export const RISK_RATINGS = ['AAA', 'AA', 'A', 'BBB', 'BB', 'B', 'CCC', 'D'];

export const CASH_FLOW_KINDS = [
  { value: 'repayment', label: 'Loan Repayment' },
  { value: 'profit', label: 'Profit / Coupon' },
  { value: 'principal', label: 'Principal / Maturity' },
  { value: 'collection', label: 'Receivable Collection' },
  { value: 'rental', label: 'Rental Payment' },
  { value: 'sale_proceeds', label: 'Sale Proceeds' },
  { value: 'recovery', label: 'Recovery Proceeds' },
];

export const CASH_FLOW_STATUS_LABELS = {
  scheduled: 'Scheduled',
  received: 'Received',
  distributed: 'Distributed',
};

export const ISSUANCE_RESTRICTED_MESSAGE =
  'Demonstration mode: token issuance, investment and trading are restricted until legal and regulatory approval is in place.';

export const isBankAsset = (category) => !!category && category !== 'real_estate';

export const getCategory = (category) => ASSET_CATEGORIES[category] || ASSET_CATEGORIES.real_estate;

export const getCategoryLabel = (category) => getCategory(category).label;

export const getTypeLabel = (category, type) => {
  const match = getCategory(category).types.find((t) => t.value === type);
  if (match) return match.label;
  return type ? type.replace(/_/g, ' ') : 'N/A';
};

export const getCashFlowKindLabel = (kind) =>
  CASH_FLOW_KINDS.find((k) => k.value === kind)?.label || kind;

export const getDocumentLabel = (category, docKey) =>
  getCategory(category).documents[docKey] || ASSET_CATEGORIES.real_estate.documents[docKey] || docKey;
