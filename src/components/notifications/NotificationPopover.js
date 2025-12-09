import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Bell, Search, X, CheckCircle, Clock } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { adminAPI } from '../../services/api';
import { API_BASE_URL } from '../../config/api';
import { useAdminAuth } from '../admin/AdminAuth';
import Card from '../ui/Card';
import Button from '../ui/Button';

const NotificationPopover = ({ isOpen, onClose, anchorRef }) => {
  const { adminUser } = useAdminAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const popoverRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [blocksAdminUserId, setBlocksAdminUserId] = useState(null);

  // Get Blocks admin user ID
  useEffect(() => {
    const fetchBlocksAdminId = async () => {
      try {
        const usersResponse = await adminAPI.getUsers({ limit: 1, role: 'admin' });
        const blocksAdminUser = usersResponse?.data?.users?.[0] || usersResponse?.data?.data?.users?.[0];
        if (blocksAdminUser?.id) {
          setBlocksAdminUserId(blocksAdminUser.id);
        }
      } catch (error) {
        console.error('Failed to fetch Blocks admin user ID:', error);
      }
    };
    if (adminUser && isOpen) {
      fetchBlocksAdminId();
    }
  }, [adminUser, isOpen]);

  // Fetch notifications
  const { data: notificationsData, isLoading, refetch } = useQuery(
    ['admin-notifications'],
    async () => {
      try {
        const response = await adminAPI.getBlocksAdminNotifications();
        const data = response?.data || response;
        return data;
      } catch (error) {
        console.error('Error fetching Blocks admin notifications:', error);
        return { notifications: [] };
      }
    },
    {
      enabled: !!adminUser && isOpen,
      refetchInterval: 30000,
    }
  );

  // Parse notifications
  const notifications = useMemo(() => {
    let data = null;
    if (notificationsData?.notifications) {
      data = notificationsData.notifications;
    } else if (notificationsData?.data?.notifications) {
      data = notificationsData.data.notifications;
    } else if (notificationsData?.data && Array.isArray(notificationsData.data)) {
      data = notificationsData.data;
    } else if (Array.isArray(notificationsData)) {
      data = notificationsData;
    }
    return Array.isArray(data) ? data : [];
  }, [notificationsData]);

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    if (!Array.isArray(notifications)) return [];
    if (!searchQuery) return notifications;
    const query = searchQuery.toLowerCase();
    return notifications.filter(n => 
      n?.title?.toLowerCase().includes(query) || 
      n?.message?.toLowerCase().includes(query)
    );
  }, [notifications, searchQuery]);

  const unreadCount = useMemo(() => {
    if (!Array.isArray(filteredNotifications)) return 0;
    return filteredNotifications.filter(n => !n.read || n.read === false).length;
  }, [filteredNotifications]);

  // Mark notification as read
  const markAsReadMutation = useMutation(
    async (notificationId) => {
      if (!blocksAdminUserId) {
        throw new Error('Blocks admin user ID not available');
      }
      const response = await fetch(
        `${API_BASE_URL}/api/notifications/mark-read/${notificationId}/user/${blocksAdminUserId}`,
        { method: 'PATCH' }
      );
      return response.json();
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['admin-notifications']);
      },
    }
  );

  // Mark all as read
  const markAllAsReadMutation = useMutation(
    async () => {
      if (!blocksAdminUserId) {
        throw new Error('Blocks admin user ID not available');
      }
      const response = await fetch(
        `${API_BASE_URL}/api/notifications/mark-all-read/user/${blocksAdminUserId}`,
        { method: 'PATCH' }
      );
      return response.json();
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['admin-notifications']);
      },
    }
  );

  const handleNotificationClick = (notification) => {
    // Close the sidebar panel immediately
    onClose();
    
    // Navigate to AdminDashboard with notifications tab and selected notification
    // This will open NotificationsManagement component with the selected notification
    navigate(`/admin?tab=notifications&view=all&selected=${notification.id}`);
  };

  const handleMarkAllAsRead = () => {
    if (unreadCount > 0) {
      markAllAsReadMutation.mutate();
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Calculate position for desktop
  const [position, setPosition] = useState({ top: 0, right: 0 });
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  useEffect(() => {
    const updatePosition = () => {
      if (isOpen && anchorRef?.current && isDesktop) {
        const rect = anchorRef.current.getBoundingClientRect();
        setPosition({
          top: rect.bottom + 8,
          right: window.innerWidth - rect.right,
        });
      }
    };

    if (isOpen && isDesktop) {
      updatePosition();
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);
      return () => {
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition, true);
      };
    }
  }, [isOpen, anchorRef, isDesktop]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        isOpen &&
        popoverRef.current &&
        !popoverRef.current.contains(event.target) &&
        anchorRef?.current &&
        !anchorRef.current.contains(event.target)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen, onClose, anchorRef]);

  // Handle ESC key
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      return () => {
        document.removeEventListener('keydown', handleEsc);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-[99] transition-opacity duration-150"
          onClick={onClose}
        />
      )}

      {/* Popover */}
      <div
        ref={popoverRef}
        className={`
          fixed
          top-0 right-0 left-0 md:top-auto md:left-auto md:right-auto
          z-[100] md:z-[100]
          w-full md:w-[380px] lg:w-[380px]
          max-h-[70vh] md:max-h-[70vh]
          bg-card
          shadow-xl
          rounded-none md:rounded-2xl
          border-t md:border border-border/50
          backdrop-blur-sm
          flex flex-col
          transition-all duration-150 ease-out
          ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}
        `}
        style={
          isDesktop && position.top > 0
            ? {
                top: `${position.top}px`,
                right: `${position.right}px`,
                left: 'auto',
              }
            : {}
        }
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50 flex-shrink-0">
          <h3 className="text-lg font-semibold text-card-foreground">Notifications</h3>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                disabled={markAllAsReadMutation.isLoading}
                className="text-xs h-8 px-2"
              >
                <CheckCircle className="w-3 h-3 mr-1" />
                Mark all read
              </Button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-accent transition-colors"
              title="Close"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 pt-4 pb-3 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto max-h-[55vh] px-4 pb-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mb-2"></div>
              <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Bell className="w-8 h-8 text-muted-foreground mb-2 opacity-50" />
              <p className="text-sm text-muted-foreground">
                {searchQuery ? 'No notifications found' : 'No notifications'}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredNotifications.map((notification) => {
                const isUnread = !notification.read || notification.read === false;
                return (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`
                      p-3 rounded-lg cursor-pointer transition-colors
                      hover:bg-accent/50
                      ${isUnread ? 'bg-accent/30' : ''}
                    `}
                  >
                    <div className="flex items-start gap-3">
                      {isUnread && (
                        <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                      )}
                      {!isUnread && <div className="w-2 flex-shrink-0"></div>}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-sm font-semibold text-card-foreground line-clamp-1">
                            {notification.title}
                          </h4>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-1.5 mt-2">
                          <Clock className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                          <span className="text-xs text-muted-foreground">
                            {formatTime(notification.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* View All Button */}
        <div className="px-4 pb-4 pt-3 border-t border-border/50 flex-shrink-0">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              onClose();
              // Navigate to notifications tab with view=all parameter
              navigate('/admin?tab=notifications&view=all');
            }}
          >
            View All Notifications
          </Button>
        </div>
      </div>
    </>
  );
};

export default NotificationPopover;

