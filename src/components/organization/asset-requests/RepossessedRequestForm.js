import React from 'react';
import BankAssetRequestForm from './BankAssetRequestForm';

export default function RepossessedRequestForm(props) {
  return (
    <BankAssetRequestForm
      {...props}
      assetCategory="repossessed"
      formTitle="Repossessed Assets Registration"
    />
  );
}
