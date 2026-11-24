import React from 'react';
import BankAssetRequestForm from './BankAssetRequestForm';

export default function NplRequestForm(props) {
  return (
    <BankAssetRequestForm
      {...props}
      assetCategory="npl"
      formTitle="Non-Performing Loans Registration"
    />
  );
}
