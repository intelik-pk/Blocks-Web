import React from 'react';
import AdminNotificationIcon from './AdminNotificationIcon';

// Safe wrapper to prevent crashes
const SafeAdminNotificationIcon = ({ onToggle }) => {
  try {
    return <AdminNotificationIcon onToggle={onToggle} />;
  } catch (error) {
    console.error('AdminNotificationIcon error:', error);
    return null;
  }
};

export default SafeAdminNotificationIcon;

