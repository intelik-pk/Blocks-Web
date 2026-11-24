import React from 'react';
import BankAssetRequestForm from './BankAssetRequestForm';

export default function LeasingRequestForm(props) {
  return (
    <BankAssetRequestForm
      {...props}
      assetCategory="leasing"
      formTitle="Leasing Assets Registration"
    />
  );
}
