import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useQuery } from 'react-query';
import { adminAPI } from '../../services/api';
import { useAdminAuth } from './AdminAuth';
import { useWebPush } from '../../hooks/useWebPush';

const AdminNotificationIcon = ({ onToggle }) => {
  const { adminUser } = useAdminAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState(null);
  const { isSupported, isSubscribed } = useWebPush();


  // Fetch Blocks admin notifications
  const { data: notificationsData, refetch } = useQuery(
    ['admin-notifications'],
    async () => {
      try {
        // Use the admin endpoint to get Blocks admin notifications
        const response = await adminAPI.getBlocksAdminNotifications();
        return response.data || response;
      } catch (error) {
        console.error('Error fetching Blocks admin notifications:', error);
        return { notifications: [] };
      }
    },
    {
      enabled: !!adminUser,
      refetchInterval: 30000, // Refetch every 30 seconds
      onSuccess: (data) => {
        try {
          const notifications = data?.notifications || [];
          // Ensure it's an array before filtering
          const notificationsArray = Array.isArray(notifications) ? notifications : [];
          const unread = notificationsArray.filter(n => !n.read || n.read === false).length;
          setUnreadCount(unread);
        } catch (error) {
          console.error('Error processing notifications:', error);
          setUnreadCount(0);
        }
      },
      onError: (error) => {
        console.error('Query error:', error);
        setError(error.message);
      },
    }
  );

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('🔔 Notification bell clicked, onToggle:', onToggle);
    if (onToggle) {
      onToggle();
    } else {
      console.warn('⚠️ onToggle prop not provided to AdminNotificationIcon');
    }
  };

  // Don't render if there's a critical error
  if (error && !adminUser) {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        className="relative inline-flex items-center justify-center p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent focus:outline-none focus:ring-2 focus:ring-inset focus:ring-ring"
        title={isSupported && !isSubscribed ? 'Click to enable notifications' : 'Notifications'}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full min-w-[18px] h-[18px]">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
        {isSupported && !isSubscribed && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center w-2 h-2 transform translate-x-1/2 -translate-y-1/2 bg-yellow-500 rounded-full border-2 border-white"></span>
        )}
      </button>
    </div>
  );
};

export default AdminNotificationIcon;

