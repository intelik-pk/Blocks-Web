import React from 'react';
import BankAssetRequestForm from './BankAssetRequestForm';

export default function TradeFinanceRequestForm(props) {
  return (
    <BankAssetRequestForm
      {...props}
      assetCategory="trade_finance"
      formTitle="Trade Finance Registration"
    />
  );
}
