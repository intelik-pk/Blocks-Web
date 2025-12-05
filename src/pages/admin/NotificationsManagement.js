import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
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
  Clock
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import { adminAPI } from '../../services/api';
import { API_BASE_URL } from '../../config/api';
import { useAdminAuth } from '../../components/admin/AdminAuth';
import toast from 'react-hot-toast';

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
  const [showUserSelector, setShowUserSelector] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState(activeView);
  const [blocksAdminUserId, setBlocksAdminUserId] = useState(null);
  const [notificationSearchQuery, setNotificationSearchQuery] = useState('');

  // Sync activeTab with activeView prop
  useEffect(() => {
    setActiveTab(activeView);
  }, [activeView]);

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

  // Filter users based on search query
  const filteredUsers = React.useMemo(() => {
    if (!userSearchQuery.trim()) {
      return users;
    }
    const query = userSearchQuery.toLowerCase().trim();
    return users.filter(user => {
      const name = (user.fullName || user.name || '').toLowerCase();
      const email = (user.email || '').toLowerCase();
      return name.includes(query) || email.includes(query);
    });
  }, [users, userSearchQuery]);

  // Send notification mutation
  const sendNotificationMutation = useMutation(
    (data) => adminAPI.sendNotification(data),
    {
      onSuccess: (response) => {
        const result = response?.data || response;
        if (result.success) {
          toast.success(`Notification sent successfully! Sent: ${result.sent}, Failed: ${result.failed}`);
          // Reset form
          setFormData({
            userIds: [],
            title: '',
            message: '',
            category: 'notifications',
            propertyId: '',
            customUrl: '',
          });
          setSelectedUsers([]);
        } else {
          toast.error(`Some notifications failed. Sent: ${result.sent}, Failed: ${result.failed}`);
          if (result.errors && result.errors.length > 0) {
            console.error('Notification errors:', result.errors);
          }
        }
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to send notification');
        console.error('Send notification error:', error);
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
      return response.json();
    },
    {
      onSuccess: () => {
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
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'send'
                ? 'border-black text-black dark:text-white'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <Send className="w-4 h-4 inline mr-2" />
            Send Notification
          </button>
          <button
            onClick={() => setActiveTab('view')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'view'
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
        <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* User Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Users <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowUserSelector(!showUserSelector)}
                className="w-full justify-between"
              >
                <span>
                  {selectedUsers.length === 0
                    ? 'Select users...'
                    : `${selectedUsers.length} user${selectedUsers.length > 1 ? 's' : ''} selected`}
                </span>
                <Users className="w-4 h-4" />
              </Button>

              {showUserSelector && (
                <Card className="absolute z-10 w-full mt-2 max-h-96 overflow-y-auto">
                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between mb-2 pb-2 border-b">
                      <span className="text-sm font-medium">Select Users</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleSelectAll}
                      >
                        {filteredUsers.every(user => selectedUsers.some(u => u.id === user.id)) && filteredUsers.length > 0 ? 'Deselect All' : 'Select All'}
                      </Button>
                    </div>
                    
                    {/* Search Input */}
                    <div className="mb-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search by name or email..."
                          value={userSearchQuery}
                          onChange={(e) => setUserSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          onClick={(e) => e.stopPropagation()}
                        />
                        {userSearchQuery && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setUserSearchQuery('');
                            }}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      {userSearchQuery && (
                        <p className="text-xs text-gray-500 mt-1">
                          {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} found
                        </p>
                      )}
                    </div>

                    {usersLoading ? (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                      </div>
                    ) : filteredUsers.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">
                        {userSearchQuery ? 'No users found matching your search' : 'No users found'}
                      </p>
                    ) : (
                      filteredUsers.map((user) => {
                        const isSelected = selectedUsers.some(u => u.id === user.id);
                        return (
                          <div
                            key={user.id}
                            onClick={() => handleUserToggle(user)}
                            className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-gray-50 ${
                              isSelected ? 'bg-blue-50 border border-blue-200' : ''
                            }`}
                          >
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                              isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                            }`}>
                              {isSelected && <CheckCircle className="w-4 h-4 text-white" />}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium">{user.fullName || user.name || user.email}</p>
                              <p className="text-xs text-gray-500">{user.email}</p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </Card>
              )}
            </div>
            {selectedUsers.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedUsers.map((user) => (
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
              </div>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Enter notification message"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    className={`p-4 border-2 rounded-lg text-left transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Icon className={`w-5 h-5 mb-2 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                    <p className={`text-sm font-medium ${isSelected ? 'text-blue-600' : 'text-gray-700'}`}>
                      {getCategoryLabel(category)}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Property Selector (if property-detail category) */}
          {formData.category === 'property-detail' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Property <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.propertyId}
                onChange={(e) => setFormData({ ...formData, propertyId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom URL <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={formData.customUrl}
                onChange={(e) => setFormData({ ...formData, customUrl: e.target.value })}
                placeholder="/custom-route or /properties/123"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Enter a route path (e.g., /properties, /portfolio, /wallet)</p>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setFormData({
                  userIds: [],
                  title: '',
                  message: '',
                  category: 'notifications',
                  propertyId: '',
                  customUrl: '',
                });
                setSelectedUsers([]);
              }}
            >
              Reset
            </Button>
            <Button
              type="submit"
              disabled={sendNotificationMutation.isLoading}
            >
              <Send className="w-4 h-4 mr-2" />
              {sendNotificationMutation.isLoading ? 'Sending...' : 'Send Notification'}
            </Button>
          </div>
        </form>
      </Card>
      ) : (
        <div className="space-y-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search notifications..."
              value={notificationSearchQuery}
              onChange={(e) => setNotificationSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Unread Notifications */}
          {unreadNotifications.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-foreground">
                  Recent ({unreadNotifications.length})
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => markAllAsReadMutation.mutate()}
                  disabled={markAllAsReadMutation.isLoading}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {markAllAsReadMutation.isLoading ? 'Marking...' : 'Mark All as Read'}
                </Button>
              </div>
              <div className="space-y-3">
                {unreadNotifications.map((notification) => (
                  <Card
                    key={notification.id}
                    className={`p-4 cursor-pointer hover:bg-accent transition-colors border-l-4 border-l-primary`}
                    onClick={() => {
                      if (!notification.read) {
                        markAsReadMutation.mutate(notification.id);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-foreground">{notification.title}</h3>
                          <span className="w-2 h-2 bg-primary rounded-full"></span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {formatTime(notification.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* All Notifications */}
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-4">
              All Notifications ({filteredNotifications.length})
            </h2>
            {notificationsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground mt-2">Loading notifications...</p>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <Card className="p-8 text-center">
                <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">
                  {notificationSearchQuery ? 'No notifications found matching your search' : 'No notifications found'}
                </p>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredNotifications.map((notification) => {
                  const isUnread = !notification.read || notification.read === false;
                  return (
                    <Card
                      key={notification.id}
                      className={`p-4 cursor-pointer hover:bg-accent transition-colors ${
                        isUnread ? 'border-l-4 border-l-primary' : ''
                      }`}
                      onClick={() => {
                        if (isUnread) {
                          markAsReadMutation.mutate(notification.id);
                        }
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-foreground">{notification.title}</h3>
                            {isUnread && <span className="w-2 h-2 bg-primary rounded-full"></span>}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {formatTime(notification.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsManagement;

