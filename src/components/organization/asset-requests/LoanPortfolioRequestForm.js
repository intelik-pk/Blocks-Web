import React from 'react';
import BankAssetRequestForm from './BankAssetRequestForm';

export default function LoanPortfolioRequestForm(props) {
  return (
    <BankAssetRequestForm
      {...props}
      assetCategory="loan_portfolio"
      formTitle="Loan Portfolio Registration"
    />
  );
}
