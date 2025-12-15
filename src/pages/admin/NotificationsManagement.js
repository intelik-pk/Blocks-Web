import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useSearchParams, useLocation } from 'react-router-dom';
import {
  Bell,
  Send,
  Users,
  Building2,
  Wallet,
  TrendingUp,
  MessageSquare,
  X,
  CheckCircle,
  AlertCircle,
  Search,
  Clock,
  MoreVertical,
  Trash2,
  Filter,
  Calendar,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import { adminAPI } from '../../services/api';
import { API_BASE_URL } from '../../config/api';
import { useAdminAuth } from '../../components/admin/AdminAuth';
import toast from 'react-hot-toast';
import NotificationFilters from '../../components/notifications/NotificationFilters';

const NotificationsManagement = ({ activeView = 'send' }) => {
  const { isAuthenticated } = useAdminAuth();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    userIds: [],
    title: '',
    message: '',
    category: 'notifications',
    propertyId: '',
    customUrl: '',
  });

  const [selectedUsers, setSelectedUsers] = useState([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userFilters, setUserFilters] = useState({
    organization: '',
    role: '',
    status: '' // 'active' | 'inactive' | ''
  });
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true); // For tablet/mobile
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  // Initialize activeTab - if there's a 'selected' param, default to 'view' tab
  const initialTab = searchParams.get('selected') ? 'view' : activeView;
  const [activeTab, setActiveTab] = useState(initialTab);
  const [blocksAdminUserId, setBlocksAdminUserId] = useState(null);
  const [notificationSearchQuery, setNotificationSearchQuery] = useState('');
  const [rightPanelMode, setRightPanelMode] = useState('none'); // 'none' | 'preview' | 'sending' | 'success'

  // View Notifications state
  const [viewTab, setViewTab] = useState('all'); // 'all' | 'unread' | 'read' | 'status' | 'failed'
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [viewFilters, setViewFilters] = useState({
    search: '',
    category: [], // Changed to array for multi-select
    status: [], // Changed to array for multi-select
    date: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedNotifications, setSelectedNotifications] = useState([]);
  const [openMenuId, setOpenMenuId] = useState(null);
  const itemsPerPage = 10;
  const notificationRefs = useRef({});
  const [hasProcessedSelected, setHasProcessedSelected] = useState(false);

  // Sync activeTab with activeView prop (but prioritize 'selected' param)
  useEffect(() => {
    const selectedId = searchParams.get('selected');
    if (selectedId) {
      // If there's a selected notification, always use 'view' tab
      if (activeTab !== 'view') {
        setActiveTab('view');
      }
    } else {
      // Otherwise, sync with activeView prop
      setActiveTab(activeView);
    }
  }, [activeView, searchParams]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openMenuId && !event.target.closest('.notification-menu')) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenuId]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [viewFilters, viewTab]);

  // Clear selection when switching tabs
  useEffect(() => {
    setSelectedNotification(null);
  }, [viewTab]);

  // Fetch all users
  const { data: usersData, isLoading: usersLoading } = useQuery(
    ['admin-users-for-notifications'],
    () => adminAPI.getUsers({ limit: 1000 }),
    {
      enabled: isAuthenticated,
      retry: 1,
    }
  );

  // Fetch all properties (for property-detail category)
  const { data: propertiesData } = useQuery(
    ['admin-properties-for-notifications'],
    () => adminAPI.getProperties({ limit: 1000 }),
    {
      enabled: isAuthenticated && formData.category === 'property-detail',
      retry: 1,
    }
  );

  const users = usersData?.data?.users || usersData?.data?.data?.users || usersData?.data || [];
  const properties = propertiesData?.data?.properties || propertiesData?.data?.data?.properties || propertiesData?.data || [];

  // Helper function to get user initials for avatar
  const getUserInitials = (user) => {
    const name = user.fullName || user.name || user.email || 'U';
    const parts = name.split(' ');
    if (parts.length > 1) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Filter users based on search query and filters
  const filteredUsers = React.useMemo(() => {
    let filtered = users;

    // Search filter
    if (userSearchQuery.trim()) {
      const query = userSearchQuery.toLowerCase().trim();
      filtered = filtered.filter(user => {
        const name = (user.fullName || user.name || '').toLowerCase();
        const email = (user.email || '').toLowerCase();
        return name.includes(query) || email.includes(query);
      });
    }

    // Status filter
    if (userFilters.status) {
      filtered = filtered.filter(user => {
        const isActive = user.isActive !== undefined ? user.isActive : user.is_active;
        return userFilters.status === 'active' ? isActive : !isActive;
      });
    }

    // Role filter (if role field exists)
    if (userFilters.role) {
      filtered = filtered.filter(user => {
        const userRole = user.role || user.userRole || '';
        return userRole.toLowerCase() === userFilters.role.toLowerCase();
      });
    }

    // Organization filter (if organization field exists)
    if (userFilters.organization) {
      filtered = filtered.filter(user => {
        const org = user.organization || user.organizationName || '';
        return org.toLowerCase().includes(userFilters.organization.toLowerCase());
      });
    }

    return filtered;
  }, [users, userSearchQuery, userFilters]);

  // Send notification mutation
  const sendNotificationMutation = useMutation(
    (data) => adminAPI.sendNotification(data),
    {
      onSuccess: (response) => {
        const result = response?.data || response;
        if (result.success) {
          toast.success(`Notification sent successfully! Sent: ${result.sent}, Failed: ${result.failed}`);
          setRightPanelMode('success');
          // Auto-reset after 3 seconds
          setTimeout(() => {
            handleReset();
          }, 3000);
        } else {
          toast.error(`Some notifications failed. Sent: ${result.sent}, Failed: ${result.failed}`);
          setRightPanelMode('none');
          if (result.errors && result.errors.length > 0) {
            console.error('Notification errors:', result.errors);
          }
        }
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to send notification');
        console.error('Send notification error:', error);
        setRightPanelMode('none');
      },
    }
  );

  const handleUserToggle = (user) => {
    const isSelected = selectedUsers.some(u => u.id === user.id);
    if (isSelected) {
      setSelectedUsers(selectedUsers.filter(u => u.id !== user.id));
      setFormData({
        ...formData,
        userIds: formData.userIds.filter(id => id !== user.id),
      });
    } else {
      setSelectedUsers([...selectedUsers, user]);
      setFormData({
        ...formData,
        userIds: [...formData.userIds, user.id],
      });
    }
  };

  const handleSelectAll = () => {
    // Use filteredUsers for select all
    const usersToSelect = filteredUsers.length > 0 ? filteredUsers : users;
    const allFilteredSelected = usersToSelect.every(user =>
      selectedUsers.some(selected => selected.id === user.id)
    );

    if (allFilteredSelected && usersToSelect.length > 0) {
      // Deselect all filtered users
      const remainingSelected = selectedUsers.filter(selected =>
        !usersToSelect.some(user => user.id === selected.id)
      );
      setSelectedUsers(remainingSelected);
      setFormData({ ...formData, userIds: remainingSelected.map(u => u.id) });
    } else {
      // Select all filtered users (merge with existing)
      const newSelected = [...selectedUsers];
      usersToSelect.forEach(user => {
        if (!newSelected.some(selected => selected.id === user.id)) {
          newSelected.push(user);
        }
      });
      setSelectedUsers(newSelected);
      setFormData({ ...formData, userIds: newSelected.map(u => u.id) });
    }
  };

  const handleCategoryChange = (category) => {
    setFormData({
      ...formData,
      category,
      propertyId: category !== 'property-detail' ? '' : formData.propertyId,
      customUrl: category !== 'custom' ? '' : formData.customUrl,
    });
  };

  const handleReset = () => {
    setFormData({
      userIds: [],
      title: '',
      message: '',
      category: 'notifications',
      propertyId: '',
      customUrl: '',
    });
    setSelectedUsers([]);
    setRightPanelMode('none');
  };

  const handlePreview = () => {
    if (!formData.title.trim() || !formData.message.trim()) {
      toast.error('Please enter title and message to preview');
      return;
    }
    setRightPanelMode('preview');
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.userIds || formData.userIds.length === 0) {
      toast.error('Please select at least one user');
      return;
    }

    if (!formData.title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    if (!formData.message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    if (formData.category === 'property-detail' && !formData.propertyId) {
      toast.error('Please select a property');
      return;
    }

    if (formData.category === 'custom' && !formData.customUrl) {
      toast.error('Please enter a custom URL');
      return;
    }

    // Ensure userIds is an array
    const userIdsArray = Array.isArray(formData.userIds)
      ? formData.userIds
      : (formData.userIds ? [formData.userIds] : []);

    if (userIdsArray.length === 0) {
      toast.error('Please select at least one user');
      return;
    }

    const payload = {
      userIds: userIdsArray,
      title: formData.title.trim(),
      message: formData.message.trim(),
      category: formData.category,
      ...(formData.category === 'property-detail' && { propertyId: formData.propertyId }),
      ...(formData.category === 'custom' && { customUrl: formData.customUrl }),
    };

    console.log('Sending notification payload:', payload);
    setRightPanelMode('sending');
    sendNotificationMutation.mutate(payload);
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'properties':
        return Building2;
      case 'property-detail':
        return Building2;
      case 'portfolio':
        return TrendingUp;
      case 'wallet':
        return Wallet;
      case 'notifications':
        return Bell;
      case 'custom':
        return MessageSquare;
      default:
        return Bell;
    }
  };

  const getCategoryLabel = (category) => {
    switch (category) {
      case 'properties':
        return 'Properties List';
      case 'property-detail':
        return 'Property Detail';
      case 'portfolio':
        return 'Portfolio';
      case 'wallet':
        return 'Wallet';
      case 'notifications':
        return 'Notifications';
      case 'custom':
        return 'Custom URL';
      default:
        return category;
    }
  };

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
    if (isAuthenticated) {
      fetchBlocksAdminId();
    }
  }, [isAuthenticated]);

  // Fetch notifications for view tab
  const { data: notificationsData, isLoading: notificationsLoading, refetch: refetchNotifications } = useQuery(
    ['admin-notifications-view'],
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
      enabled: isAuthenticated && activeTab === 'view',
      refetchInterval: 30000,
    }
  );

  // Parse notifications - MUST be declared before any useEffect that uses it
  // Initialize with empty array to prevent "before initialization" errors
  const notifications = useMemo(() => {
    // Always return an array, never null or undefined
    if (!notificationsData) {
      return [];
    }

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

    // Always return an array, never null or undefined
    return Array.isArray(data) ? data : [];
  }, [notificationsData]);

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    if (!Array.isArray(notifications)) return [];
    if (!notificationSearchQuery) return notifications;
    const query = notificationSearchQuery.toLowerCase();
    return notifications.filter(n =>
      n?.title?.toLowerCase().includes(query) ||
      n?.message?.toLowerCase().includes(query)
    );
  }, [notifications, notificationSearchQuery]);

  const unreadNotifications = useMemo(() => {
    return filteredNotifications.filter(n => !n.read || n.read === false);
  }, [filteredNotifications]);

  const readNotifications = useMemo(() => {
    return filteredNotifications.filter(n => n.read === true);
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
      if (!response.ok) {
        throw new Error('Failed to mark notification as read');
      }
      return response.json();
    },
    {
      onMutate: async (notificationId) => {
        // Optimistically update the UI
        await queryClient.cancelQueries(['admin-notifications-view']);
        const previousData = queryClient.getQueryData(['admin-notifications-view']);

        queryClient.setQueryData(['admin-notifications-view'], (old) => {
          const updateNotification = (notifications) => {
            if (Array.isArray(notifications)) {
              return notifications.map(n =>
                n.id === notificationId ? { ...n, read: true, is_read: true } : n
              );
            }
            if (notifications?.notifications) {
              return {
                ...notifications,
                notifications: notifications.notifications.map(n =>
                  n.id === notificationId ? { ...n, read: true, is_read: true } : n
                )
              };
            }
            if (notifications?.data?.notifications) {
              return {
                ...notifications,
                data: {
                  ...notifications.data,
                  notifications: notifications.data.notifications.map(n =>
                    n.id === notificationId ? { ...n, read: true, is_read: true } : n
                  )
                }
              };
            }
            return notifications;
          };

          if (Array.isArray(old)) {
            return updateNotification(old);
          }
          if (old?.data) {
            return { ...old, data: updateNotification(old.data) };
          }
          return old;
        });

        // Update selected notification if it's the one being marked
        if (selectedNotification?.id === notificationId) {
          setSelectedNotification(prev => prev ? { ...prev, read: true, is_read: true, status: 'read' } : null);
        }

        return { previousData };
      },
      onError: (err, notificationId, context) => {
        // Rollback on error
        if (context?.previousData) {
          queryClient.setQueryData(['admin-notifications-view'], context.previousData);
        }
        toast.error('Failed to mark notification as read');
      },
      onSuccess: () => {
        toast.success('Notification marked as read');
      },
      onSettled: () => {
        queryClient.invalidateQueries(['admin-notifications-view']);
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
        queryClient.invalidateQueries(['admin-notifications-view']);
        queryClient.invalidateQueries(['admin-notifications']);
        toast.success('All notifications marked as read');
      },
    }
  );

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
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Helper: Derive category from redirect_route
  const getNotificationCategory = (notification) => {
    const route = notification.redirect_route || notification.category || '';
    if (route.includes('properties') && route.includes('detail')) return 'Property Detail';
    if (route.includes('properties')) return 'Properties';
    if (route.includes('portfolio')) return 'Portfolio';
    if (route.includes('wallet')) return 'Wallet';
    if (route.includes('notifications')) return 'Notifications';
    if (route.startsWith('/')) return 'Custom';
    return notification.category || 'General';
  };

  // Helper: Get category key for icon mapping
  const getCategoryKeyFromRoute = (route) => {
    if (!route) return 'notifications';
    if (route.includes('properties') && route.includes('detail')) return 'property-detail';
    if (route.includes('properties')) return 'properties';
    if (route.includes('portfolio')) return 'portfolio';
    if (route.includes('wallet')) return 'wallet';
    if (route.includes('notifications')) return 'notifications';
    if (route.startsWith('/')) return 'custom';
    return 'notifications';
  };

  // Helper: Group notifications by date
  const groupNotificationsByDate = (notifications) => {
    const groups = {
      'Today': [],
      'Yesterday': [],
      'This Week': [],
      'Older': []
    };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    notifications.forEach(notification => {
      const date = new Date(notification.createdAt || notification.created_at);
      if (date >= today) {
        groups['Today'].push(notification);
      } else if (date >= yesterday) {
        groups['Yesterday'].push(notification);
      } else if (date >= weekAgo) {
        groups['This Week'].push(notification);
      } else {
        groups['Older'].push(notification);
      }
    });

    return Object.entries(groups).filter(([_, items]) => items.length > 0);
  };

  // Helper: Filter by date range
  const filterByDate = (notification, dateFilter) => {
    if (!dateFilter || !notification.createdAt) return true;

    const notificationDate = new Date(notification.createdAt);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    switch (dateFilter) {
      case 'today':
        return notificationDate >= today;
      case 'yesterday':
        return notificationDate >= yesterday && notificationDate < today;
      case 'this-week':
        return notificationDate >= weekAgo;
      case 'this-month':
        return notificationDate >= monthAgo;
      case 'older':
        return notificationDate < monthAgo;
      default:
        return true;
    }
  };

  // Filter and process notifications for view tab
  const processedNotifications = useMemo(() => {
    // Safe guard: ensure notifications is always an array before accessing
    if (!notifications || !Array.isArray(notifications)) {
      return [];
    }

    // Early return if empty
    if (notifications.length === 0) {
      return [];
    }

    // Map notifications from database - no hardcoded data
    let processed = notifications.map(n => ({
      id: n.id,
      title: n.title || 'No Title',
      message: n.message || '',
      category: getNotificationCategory(n),
      status: n.read || n.is_read ? 'read' : 'unread',
      createdAt: n.createdAt || n.created_at || n.created_at,
      redirect_route: n.redirect_route || n.category || '',
      read: n.read || n.is_read || false,
      ...n // Include all original fields from database
    }));

    // Apply search filter
    if (viewFilters.search) {
      const query = viewFilters.search.toLowerCase();
      processed = processed.filter(n =>
        n.title.toLowerCase().includes(query) ||
        n.message.toLowerCase().includes(query)
      );
    }

    // Apply category filter (multi-select)
    if (Array.isArray(viewFilters.category) && viewFilters.category.length > 0) {
      processed = processed.filter(n => viewFilters.category.includes(n.category));
    }

    // Apply status filter (multi-select)
    if (Array.isArray(viewFilters.status) && viewFilters.status.length > 0) {
      processed = processed.filter(n => viewFilters.status.includes(n.status));
    }

    // Apply date filter
    if (viewFilters.date) {
      processed = processed.filter(n => filterByDate(n, viewFilters.date));
    }

    // Apply tab filter
    if (viewTab === 'unread') {
      processed = processed.filter(n => !n.read);
    } else if (viewTab === 'read') {
      processed = processed.filter(n => n.read);
    }

    return processed;
  }, [notifications, viewFilters, viewTab]);

  // Calculate statistics
  const notificationStats = useMemo(() => {
    // Safe guard: ensure notifications exists and is an array
    if (!notifications || !Array.isArray(notifications)) {
      return { total: 0, unread: 0, read: 0, failed: 0, active: 0 };
    }
    const total = notifications.length;
    const unread = notifications.filter(n => !(n.read || n.is_read)).length;
    const read = notifications.filter(n => n.read || n.is_read).length;
    const failed = 0; // This would come from backend if available
    return { total, unread, read, failed, active: total - failed };
  }, [notifications]);

  // Handle selected notification from URL query parameter - MUST be after notifications and processedNotifications are declared
  useEffect(() => {
    const selectedId = searchParams.get('selected');

    // Don't process if no selected ID or already processed
    if (!selectedId || hasProcessedSelected) {
      return;
    }

    // Wait for notifications to load - don't process if still loading
    if (notificationsLoading) {
      return;
    }

    // Safe guard: ensure notifications exists and is an array
    if (!notifications || !Array.isArray(notifications)) {
      return;
    }

    // If notifications array is empty, wait for data to load
    if (notifications.length === 0) {
      return;
    }

    if (selectedId) {
      // Find the notification in all notifications (not just processed, in case it's filtered out)
      const notification = notifications.find(n =>
        String(n.id) === String(selectedId)
      );

      if (notification) {
        // Switch to view tab if not already
        const needsTabSwitch = activeTab !== 'view';
        if (needsTabSwitch) {
          setActiveTab('view');
        }

        // Process notification data
        const processedNotification = {
          id: notification.id,
          title: notification.title || 'No Title',
          message: notification.message || '',
          category: getNotificationCategory(notification),
          status: notification.read || notification.is_read ? 'read' : 'unread',
          createdAt: notification.createdAt || notification.created_at,
          redirect_route: notification.redirect_route || notification.category || '',
          read: notification.read || notification.is_read || false,
          ...notification
        };

        // Find which page the notification is on (if paginated) - safely access processedNotifications
        let notificationIndex = -1;
        if (Array.isArray(processedNotifications) && processedNotifications.length > 0) {
          notificationIndex = processedNotifications.findIndex(n => n.id === processedNotification.id);
          if (notificationIndex >= 0) {
            const targetPage = Math.floor(notificationIndex / itemsPerPage) + 1;
            if (targetPage !== currentPage) {
              setCurrentPage(targetPage);
            }
          }
        }

        // Mark as read if unread
        if (!processedNotification.read && !processedNotification.is_read) {
          markAsReadMutation.mutate(processedNotification.id);
        }

        // Set selected notification (this will open details panel)
        setSelectedNotification(processedNotification);

        // Wait for tab switch, pagination, and DOM update, then scroll
        // Longer delay if we need to switch tabs or change pages to ensure DOM is ready
        const scrollDelay = needsTabSwitch ? 1000 : (notificationIndex >= 0 && Math.floor(notificationIndex / itemsPerPage) + 1 !== currentPage ? 800 : 500);
        setTimeout(() => {
          const element = notificationRefs.current[processedNotification.id];
          if (element) {
            element.scrollIntoView({
              behavior: 'smooth',
              block: 'center'
            });
            // Add highlight effect
            element.classList.add('ring-2', 'ring-blue-500', 'transition-all');
            setTimeout(() => {
              element.classList.remove('ring-2', 'ring-blue-500');
            }, 2000);
          }
        }, scrollDelay);

        // Remove query parameter from URL after processing
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.delete('selected');
        setSearchParams(newSearchParams, { replace: true });
        setHasProcessedSelected(true);
      } else if (notifications.length > 0) {
        // Notification not found in list - clear the selected parameter
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.delete('selected');
        setSearchParams(newSearchParams, { replace: true });
        setHasProcessedSelected(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, notifications, notificationsLoading, activeTab, hasProcessedSelected, processedNotifications, currentPage]);

  // Reset hasProcessedSelected when location changes
  useEffect(() => {
    setHasProcessedSelected(false);
  }, [location.pathname]);

  // Pagination
  const paginatedNotifications = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return processedNotifications.slice(start, end);
  }, [processedNotifications, currentPage]);

  const totalPages = Math.ceil(processedNotifications.length / itemsPerPage);

  if (!isAuthenticated) {
    return (
      <Card className="p-8 text-center">
        <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Authentication Required</h3>
        <p className="text-gray-600">Please log in to access this page.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Notifications</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage and send notifications</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('send')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'send'
                ? 'border-black text-black dark:text-white'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
          >
            <Send className="w-4 h-4 inline mr-2" />
            Send Notification
          </button>
          <button
            onClick={() => setActiveTab('view')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'view'
                ? 'border-black text-black dark:text-white'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
          >
            <Bell className="w-4 h-4 inline mr-2" />
            View Notifications
            {unreadNotifications.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadNotifications.length}
              </Badge>
            )}
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'send' ? (
        <div className="send-notification-layout flex flex-col lg:flex-row min-h-[calc(100vh-12rem)] max-h-[calc(100vh-12rem)] overflow-hidden gap-0">
          {/* LEFT PANEL - User Selection & Filters */}
          {/* Mobile: Full-screen overlay when open */}
          {isLeftPanelOpen && (
            <div className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setIsLeftPanelOpen(false)} />
          )}
          <div className={`users-panel flex flex-col border-r border-gray-200 rounded-xl dark:border-slate-700 transition-all duration-300 ${
            isLeftPanelOpen 
              ? 'w-full lg:w-80 xl:w-96 fixed lg:relative z-50 lg:z-auto h-full lg:h-full' 
              : 'w-0 lg:w-80 xl:w-96 hidden lg:flex'
          }`}>
            <Card className="h-full flex flex-col rounded-xl border-0 shadow-none bg-transparent dark:bg-transparent overflow-hidden">
              {/* Header */}
              <div className="flex-shrink-0 px-4 pt-4 rounded-xl ">
                <div className="flex items-center justify-between ">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Select Users</h3>
                  <button
                    onClick={() => setIsLeftPanelOpen(false)}
                    className="lg:hidden p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                {selectedUsers.length > 0 && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedUsers.length} selected
                  </p>
                )}
              </div>

              {/* Search & Filters */}
              <div className="flex-shrink-0 p-4 space-y-3 border-b border-gray-200 dark:border-slate-700 ">
                {/* Search Input */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100"
                  />
                  {userSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setUserSearchQuery('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Filters */}
                <div className="space-y-2">
                  {/* Status Filter */}
                  <select
                    value={userFilters.status}
                    onChange={(e) => setUserFilters({ ...userFilters, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>

                  {/* Role Filter (if role data exists) */}
                  <select
                    value={userFilters.role}
                    onChange={(e) => setUserFilters({ ...userFilters, role: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">All Roles</option>
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                    <option value="investor">Investor</option>
                  </select>
                </div>
              </div>

              {/* Bulk Actions */}
              <div className="flex-shrink-0 border-b border-gray-200 dark:border-slate-700 p-4 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filteredUsers.length > 0 && filteredUsers.every(user => selectedUsers.some(u => u.id === user.id))}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 dark:border-slate-600"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Select All</span>
                </label>
                {selectedUsers.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedUsers([]);
                      setFormData({ ...formData, userIds: [] });
                    }}
                  >
                    Clear
                  </Button>
                )}
              </div>

              {/* User List (Scrollable) */}
              <div className="flex-1 overflow-y-auto p-4 max-h-[calc(100vh-20rem)]">
                {usersLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Loading users...</p>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-2 opacity-50" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {userSearchQuery || userFilters.status || userFilters.role ? 'No users found matching filters' : 'No users found'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredUsers.map((user) => {
                      const isSelected = selectedUsers.some(u => u.id === user.id);
                      return (
                        <div
                          key={user.id}
                          onClick={() => handleUserToggle(user)}
                          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                            isSelected 
                              ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700' 
                              : 'hover:bg-gray-50 dark:hover:bg-slate-800 border border-transparent'
                          }`}
                        >
                          {/* Avatar */}
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
                            isSelected
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300'
                          }`}>
                            {getUserInitials(user)}
                          </div>
                          
                          {/* Checkbox */}
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleUserToggle(user)}
                            onClick={(e) => e.stopPropagation()}
                            className="rounded border-gray-300 dark:border-slate-600 flex-shrink-0"
                          />
                          
                          {/* User Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                              {user.fullName || user.name || user.email}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* RIGHT PANEL - Notification Form */}
          <div className="notification-panel flex-1 min-w-0 flex flex-col overflow-hidden">
            {/* Mobile: Toggle button to show left panel */}
            {!isLeftPanelOpen && (
              <div className="lg:hidden sticky top-0 z-10 p-4 border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsLeftPanelOpen(true)}
                  className="w-full"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Select Users ({selectedUsers.length} selected)
                </Button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto">
              <div className="px-6 space-y-6">
                <Card className="p-6 dark:bg-slate-900/80 backdrop-blur-xl border border-white/10 dark:border-slate-700/50 shadow-lg">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Selected Users Summary */}
                    {selectedUsers.length > 0 && (
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            Selected Users: {selectedUsers.length}
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedUsers([]);
                              setFormData({ ...formData, userIds: [] });
                            }}
                          >
                            Clear All
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {selectedUsers.slice(0, 10).map((user) => (
                            <Badge
                              key={user.id}
                              variant="default"
                              className="flex items-center gap-1"
                            >
                              {user.fullName || user.name || user.email}
                              <X
                                className="w-3 h-3 cursor-pointer"
                                onClick={() => handleUserToggle(user)}
                              />
                            </Badge>
                          ))}
                          {selectedUsers.length > 10 && (
                            <Badge variant="outline" className="text-xs">
                              +{selectedUsers.length - 10} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Category Section */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        Category (Redirect Route) <span className="text-red-500">*</span>
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {['properties', 'property-detail', 'portfolio', 'wallet', 'notifications', 'custom'].map((category) => {
                          const Icon = getCategoryIcon(category);
                          const isSelected = formData.category === category;
                          return (
                            <button
                              key={category}
                              type="button"
                              onClick={() => handleCategoryChange(category)}
                              className={`p-4 border-2 rounded-xl text-left transition-all duration-200 ${isSelected
                                  ? 'border-black dark:bg-black/20 dark:border-white shadow-lg shadow-black/20 ring-2 ring-black/30'
                                  : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 bg-white/50 dark:bg-slate-800/50'
                                }`}
                            >
                              <Icon className={`w-5 h-5 mb-2 ${isSelected ? 'text-black dark:text-white' : 'text-gray-400 dark:text-gray-500'}`} />
                              <p className={`text-sm font-medium ${isSelected ? 'text-black dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                                {getCategoryLabel(category)}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Enter notification title"
                    required
                  />
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Enter notification message"
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100"
                    required
                  />
                </div>


                {/* Property Selector (if property-detail category) */}
                {formData.category === 'property-detail' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Select Property <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.propertyId}
                      onChange={(e) => setFormData({ ...formData, propertyId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100"
                      required
                    >
                      <option value="">Select a property...</option>
                      {properties.map((property) => (
                        <option key={property.id} value={property.id || property.displayCode}>
                          {property.title || property.name || property.displayCode}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Custom URL (if custom category) */}
                {formData.category === 'custom' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Custom URL <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="text"
                      value={formData.customUrl}
                      onChange={(e) => setFormData({ ...formData, customUrl: e.target.value })}
                      placeholder="/custom-route or /properties/123"
                      required
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Enter a route path (e.g., /properties, /portfolio, /wallet)</p>
                  </div>
                )}

                    {/* Footer Buttons - Sticky */}
                    <div className="sticky bottom-0 border-t border-gray-200 dark:border-slate-700 -mx-6 -mb-6 px-6 py-4 flex justify-end gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleReset}
                        className="border-gray-300 dark:border-slate-600"
                      >
                        Reset
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handlePreview}
                        className="border-blue-500 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                      >
                        Preview
                      </Button>
                      <Button
                        type="submit"
                        disabled={
                          sendNotificationMutation.isLoading ||
                          selectedUsers.length === 0 ||
                          !formData.title.trim() ||
                          !formData.message.trim()
                        }
                        className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        {sendNotificationMutation.isLoading ? 'Sending...' : 'Send Notification'}
                      </Button>
                    </div>
                  </form>
                </Card>

                {/* Preview/Sending/Success Panel */}
                {rightPanelMode !== 'none' && (
                  <div className="mt-6">
                    {rightPanelMode === 'preview' && (
                      <Card className="p-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/10 dark:border-slate-700/50 shadow-lg">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200 dark:border-slate-700">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Preview</h3>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setRightPanelMode('none')}
                              className="h-8 w-8 p-0"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>

                          {/* Preview Card */}
                          <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-6 border border-blue-200/50 dark:border-blue-700/50 shadow-lg">
                            <div className="flex items-start gap-3 mb-4">
                              <div className="p-2 bg-blue-500/10 dark:bg-blue-400/20 rounded-lg">
                                {React.createElement(getCategoryIcon(formData.category), { className: "w-5 h-5 text-blue-600 dark:text-blue-400" })}
                              </div>
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-lg mb-1">
                                  {formData.title || 'Notification Title'}
                                </h4>
                                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                                  {formData.message || 'Notification message will appear here...'}
                                </p>
                                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                  <Badge variant="outline" className="text-xs">
                                    {getCategoryLabel(formData.category)}
                                  </Badge>
                                  {formData.category === 'property-detail' && formData.propertyId && (
                                    <Badge variant="outline" className="text-xs">
                                      Property Selected
                                    </Badge>
                                  )}
                                  {formData.category === 'custom' && formData.customUrl && (
                                    <Badge variant="outline" className="text-xs">
                                      {formData.customUrl}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Selected Users */}
                            {selectedUsers.length > 0 && (
                              <div className="mt-4 pt-4 border-t border-blue-200/50 dark:border-blue-700/50">
                                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                                  Recipients ({selectedUsers.length})
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {selectedUsers.slice(0, 5).map((user) => (
                                    <Badge key={user.id} variant="default" className="text-xs">
                                      {user.fullName || user.name || user.email}
                                    </Badge>
                                  ))}
                                  {selectedUsers.length > 5 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{selectedUsers.length - 5} more
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
                    )}

                    {rightPanelMode === 'sending' && (
                      <Card className="p-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/10 dark:border-slate-700/50 shadow-lg">
                        <div className="flex flex-col items-center justify-center py-12 space-y-4">
                          <div className="relative">
                            <div className="w-16 h-16 border-4 border-blue-200 dark:border-blue-800 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Send className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            </div>
                          </div>
                          <div className="text-center">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                              Sending Notification...
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Please wait while we send your notification
                            </p>
                          </div>
                        </div>
                      </Card>
                    )}

                    {rightPanelMode === 'success' && (
                      <Card className="p-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-green-200/50 dark:border-green-700/50 shadow-lg">
                        <div className="flex flex-col items-center justify-center py-12 space-y-4">
                          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                          </div>
                          <div className="text-center">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                              Sent Successfully!
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Your notification has been sent to all recipients
                            </p>
                          </div>
                        </div>
                      </Card>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      ) : (
        <div className="space-y-6">
          {/* Summary Cards Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-5 bg-white/30 dark:bg-slate-900/30 backdrop-blur-xl border border-white/10 dark:border-slate-700/50 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Total Sent</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{notificationStats.total}</p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Send className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </Card>

            <Card className="p-5 bg-white/30 dark:bg-slate-900/30 backdrop-blur-xl border border-white/10 dark:border-slate-700/50 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Unread</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{notificationStats.unread}</p>
                </div>
                <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                  <Bell className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                </div>
              </div>
            </Card>

            <Card className="p-5 bg-white/30 dark:bg-slate-900/30 backdrop-blur-xl border border-white/10 dark:border-slate-700/50 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Status</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{notificationStats.active}</p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </Card>

            <Card className="p-5 bg-white/30 dark:bg-slate-900/30 backdrop-blur-xl border border-white/10 dark:border-slate-700/50 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Retried</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{notificationStats.failed}</p>
                </div>
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </Card>
          </div>

          {/* Tabs Bar */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex space-x-6">
              {['all', 'unread', 'read', 'status', 'failed'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setViewTab(tab)}
                  className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors capitalize ${viewTab === tab
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                >
                  {tab === 'all' ? 'All Notifications' : tab}
                </button>
              ))}
            </nav>
          </div>

          {/* Filters */}
          <NotificationFilters
            filters={viewFilters}
            onFilterChange={(key, value) => setViewFilters(prev => ({ ...prev, [key]: value }))}
            onMarkAllRead={() => markAllAsReadMutation.mutate()}
          />

          {/* Main Content: List + Details Panel */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Left: Notification List */}
            <div className={`space-y-4 transition-all duration-300 ${selectedNotification ? 'xl:col-span-2' : 'xl:col-span-3'
              }`}>
              {notificationsLoading ? (
                <Card className="p-12 text-center bg-white/30 dark:bg-slate-900/30 backdrop-blur-xl">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-400">Loading notifications...</p>
                </Card>
              ) : paginatedNotifications.length === 0 ? (
                <Card className="p-12 text-center bg-white/30 dark:bg-slate-900/30 backdrop-blur-xl">
                  <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4 opacity-50" />
                  <p className="text-gray-600 dark:text-gray-400">No notifications found</p>
                </Card>
              ) : (
                <>
                  {groupNotificationsByDate(paginatedNotifications).map(([groupName, groupNotifications]) => (
                    <div key={groupName} className="space-y-2">
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 px-2">{groupName}</h3>
                      {groupNotifications.map((notification) => {
                        const isSelected = selectedNotification?.id === notification.id;
                        const isUnread = notification.status === 'unread';
                        return (
                          <div
                            key={notification.id}
                            ref={(el) => {
                              if (el) {
                                notificationRefs.current[notification.id] = el;
                              }
                            }}
                          >
                            <Card
                              className={`p-4 bg-white/30 dark:bg-slate-900/30 backdrop-blur-xl border transition-all cursor-pointer relative ${isSelected
                                  ? 'border-blue-500 dark:border-blue-400 shadow-lg'
                                  : 'border-white/10 dark:border-slate-700/50 hover:border-gray-300 dark:hover:border-slate-600'
                                }`}
                              onClick={() => {
                                setSelectedNotification(notification);
                                // Auto-mark as read when clicked (if unread)
                                if (!notification.read && !notification.is_read) {
                                  markAsReadMutation.mutate(notification.id);
                                }
                              }}
                            >
                              <div className="flex items-start gap-3">
                                <input
                                  type="checkbox"
                                  checked={selectedNotifications.includes(notification.id)}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    setSelectedNotifications(prev =>
                                      prev.includes(notification.id)
                                        ? prev.filter(id => id !== notification.id)
                                        : [...prev, notification.id]
                                    );
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="mt-1 rounded border-gray-300"
                                />
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                  {React.createElement(getCategoryIcon(getCategoryKeyFromRoute(notification.redirect_route)), {
                                    className: "w-4 h-4 text-blue-600 dark:text-blue-400"
                                  })}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
                                      {notification.title}
                                    </h4>
                                    <Badge
                                      variant="outline"
                                      className={`text-xs ${isUnread
                                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-300'
                                          : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-300'
                                        }`}
                                    >
                                      {isUnread ? 'Unread' : 'Read'}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <Badge variant="outline" className="text-xs">
                                      {notification.category}
                                    </Badge>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      {formatTime(notification.createdAt)}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                                    {notification.message}
                                  </p>
                                </div>
                                <div className="relative notification-menu overflow-visible">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenMenuId(openMenuId === notification.id ? null : notification.id);
                                    }}
                                    className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded transition-colors"
                                    aria-label="More options"
                                  >
                                    <MoreVertical className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                  </button>

                                  {openMenuId === notification.id && (
                                    <div
                                      className="
        absolute 
        right-0 
        top-[110%] 
        w-48 
        bg-white 
        dark:bg-slate-800 
        border 
        border-gray-200 
        dark:border-slate-700 
        rounded-lg 
        shadow-xl 
        z-[9999]
      "
                                    >
                                      {/* Mark as Read */}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (!notification.read && !notification.is_read) {
                                            markAsReadMutation.mutate(notification.id);

                                            const updatedNotification = {
                                              ...notification,
                                              read: true,
                                              is_read: true,
                                              status: "read",
                                            };

                                            if (selectedNotification?.id === notification.id) {
                                              setSelectedNotification(updatedNotification);
                                            }
                                          }
                                          setOpenMenuId(null);
                                        }}
                                        disabled={notification.read || notification.is_read}
                                        className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 transition-colors
          ${notification.read || notification.is_read
                                            ? "opacity-50 cursor-not-allowed text-gray-500"
                                            : "cursor-pointer text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                                          }
        `}
                                      >
                                        <CheckCircle className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                        <span>
                                          {notification.read || notification.is_read
                                            ? "Already read"
                                            : "Mark as read"}
                                        </span>
                                      </button>

                                      {/* Delete */}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          // Handle delete
                                          setOpenMenuId(null);
                                        }}
                                        className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 transition-colors cursor-pointer"t
                                      >
                                        <Trash2 className="w-4 h-4" />
                                        <span>Delete</span>
                                      </button>
                                    </div>
                                  )}
                                </div>

                              </div>
                            </Card>
                          </div>
                        );
                      })}
                    </div>
                  ))}

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 pt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className={currentPage === page ? 'bg-blue-600 text-white' : ''}
                        >
                          {page}
                        </Button>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Right: Details Panel */}
            {selectedNotification && (
              <div className="xl:col-span-1">
                <Card className="p-6 bg-white/30 dark:bg-slate-900/30 backdrop-blur-xl border border-white/10 dark:border-slate-700/50 shadow-lg sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200 dark:border-slate-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Details</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedNotification(null)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Status</label>
                      <Badge
                        className={`${selectedNotification.status === 'unread'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          }`}
                      >
                        {selectedNotification.status === 'unread' ? 'Unread' : 'Read'}
                      </Badge>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Title</label>
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{selectedNotification.title}</p>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Category</label>
                      <Badge variant="outline" className="text-xs">
                        {selectedNotification.category}
                      </Badge>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Sent Date & Time</label>
                      <p className="text-sm text-gray-900 dark:text-gray-100">
                        {selectedNotification.createdAt
                          ? new Date(selectedNotification.createdAt).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                          : 'N/A'}
                      </p>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Message</label>
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {selectedNotification.message}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-gray-200 dark:border-slate-700 space-y-3">
                      <label className={`flex items-center gap-2 ${selectedNotification.read ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                        <input
                          type="checkbox"
                          checked={selectedNotification.read}
                          disabled={selectedNotification.read}
                          onChange={() => {
                            if (!selectedNotification.read) {
                              markAsReadMutation.mutate(selectedNotification.id);
                              // Optimistically update
                              setSelectedNotification({ ...selectedNotification, read: true, status: 'read' });
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {selectedNotification.read ? 'Already read' : 'Mark as read'}
                        </span>
                      </label>

                      <Button
                        variant="outline"
                        className="w-full text-red-600 dark:text-red-400 border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                        onClick={() => {
                          // Handle delete
                          setSelectedNotification(null);
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsManagement;

