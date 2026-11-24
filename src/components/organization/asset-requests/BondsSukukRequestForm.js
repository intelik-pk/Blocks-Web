import React from 'react';
import BankAssetRequestForm from './BankAssetRequestForm';

export default function BondsSukukRequestForm(props) {
  return (
    <BankAssetRequestForm
      {...props}
      assetCategory="bonds_sukuk"
      formTitle="Bonds & Sukuk Registration"
    />
  );
}
