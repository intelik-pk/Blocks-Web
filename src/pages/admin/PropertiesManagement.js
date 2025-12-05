import React, { useState, useMemo, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../../config/api';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Eye, 
  Building2,
  MapPin,
  AlertTriangle,
  X,
  DollarSign,
  Coins,
  Users,
  BarChart3,
  FileText,
  TrendingUp,
  PieChart,
  Activity,
  Target,
  Award,
  Calendar,
  Download,
  ArrowLeft
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import PropertyForm from '../../components/admin/PropertyForm';
import { adminAPI, rewardsAPI, investmentsAPI, blocksBackendAPI, propertiesAPI, walletTransactionsAPI } from '../../services/api';
import { useAdminAuth } from '../../components/admin/AdminAuth';
import { useToast } from '../../components/ui/Toast';
import { cn } from '../../utils/cn';
import { getPropertyImage, getPropertyImages, getPropertyDocuments } from '../../utils/formatLocation';
import Loader from '../../components/Loder';
import InputTwo from '../../components/ui/InputTwo';

// No separate filter button component needed anymore

const PropertiesManagement = () => {
  const toast = useToast();
  const { isAuthenticated } = useAdminAuth();
  
  const [filters, setFilters] = useState({
    search: '',
    status: [], // Array for multi-select
    property_type: [], // Array for multi-select
    sort_by: 'created_at',
    sort_order: 'desc'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showPropertyForm, setShowPropertyForm] = useState(false);
  const [editingProperty, setEditingProperty] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState(null);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [propertyForReward, setPropertyForReward] = useState(null);
  const [rewardAmount, setRewardAmount] = useState('');
  const [rewardDistributionResult, setRewardDistributionResult] = useState(null);
  const [statusModalOpen, setStatusModalOpen] = useState(null); // Track which property's status modal is open (stores property object)
  const [actionPanel, setActionPanel] = useState(null); // Track which action panel is open: 'add', 'edit', 'view', 'funding', 'delete', 'full-details', null
  const [selectedPropertyId, setSelectedPropertyId] = useState(null); // Property ID for full details view
  const [propertyDetailsTab, setPropertyDetailsTab] = useState('overview'); // Active tab for property details
  const [panelHistory, setPanelHistory] = useState([]); // Track navigation history for back/forward navigation
  const hoverTimeoutRef = useRef(null); // Ref for hover timeout to prevent switching on random scrolling
  const [openFilterPanel, setOpenFilterPanel] = useState(null); // Track if main filter panel is open: 'main' or null
  const filterPanelRef = useRef(null); // Ref for filter panel container to handle click outside

  const queryClient = useQueryClient();

  // Cleanup hover timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Handle click outside to close filter panels
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterPanelRef.current && !filterPanelRef.current.contains(event.target)) {
        setOpenFilterPanel(null);
      }
    };

    if (openFilterPanel) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [openFilterPanel]);

  // Fetch property details for full details view
  const { data: fullPropertyData, isLoading: fullPropertyLoading } = useQuery(
    ['property-details', selectedPropertyId],
    () => propertiesAPI.getById(selectedPropertyId),
    {
      enabled: Boolean(selectedPropertyId && actionPanel === 'full-details'),
      retry: 1
    }
  );

  // Fetch investments for full details view
  const { data: fullInvestmentsData, isLoading: fullInvestmentsLoading } = useQuery(
    ['property-details-investments', selectedPropertyId],
    () => adminAPI.getInvestments({ limit: 1000 }),
    {
      enabled: Boolean(selectedPropertyId && actionPanel === 'full-details'),
      retry: 1
    }
  );

  // Fetch transactions for full details view
  const { data: fullTransactionsData, isLoading: fullTransactionsLoading } = useQuery(
    ['property-details-transactions', selectedPropertyId],
    () => walletTransactionsAPI.getAll({ limit: 1000 }),
    {
      enabled: Boolean(selectedPropertyId && actionPanel === 'full-details'),
      retry: 1
    }
  );

  // Fetch properties
  const { data: propertiesData, isLoading, error } = useQuery(
    ['admin-properties'],
    () => adminAPI.getProperties({
      limit: 1000 // Get all properties for frontend filtering
    }),
    {
      retry: 1,
      refetchOnWindowFocus: false,
      enabled: isAuthenticated
    }
  );

  // Update property status mutation - PATCH only the status field
  const updateStatusMutation = useMutation(
    ({ id, status }) => {
      console.log('🔄 Sending PATCH request to update status:', { id, status });
      return adminAPI.updatePropertyStatus(id, { status });
    },
    {
      onSuccess: (response) => {
        queryClient.invalidateQueries(['admin-properties']);
        setShowModal(false);
        setSelectedProperty(null);
        setStatusModalOpen(null);
        console.log('✅ Property status updated successfully:', response);
      },
      onError: (error) => {
        console.error('❌ Failed to update property status:', error);
        console.error('Error details:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          endpoint: error.config?.url,
          method: error.config?.method
        });
        
        let errorMessage = '❌ Failed to update property status\n\n';
        
        if (error.response?.status === 404) {
          errorMessage += '⚠️ Endpoint Not Found (404)\n\n';
          errorMessage += `The backend endpoint PATCH /properties/:id is not implemented yet.\n\n`;
          errorMessage += '📋 Backend Team To-Do:\n';
          errorMessage += '1. Implement PATCH /properties/:id endpoint\n';
          errorMessage += '2. Accept partial updates like: { status: "active" }\n';
          errorMessage += '3. Return updated property data\n\n';
          errorMessage += '💡 Note: Frontend is sending PATCH with only { status: "..." }';
        } else if (error.message === 'Network Error') {
          errorMessage += '⚠️ CORS or Network Error\n\n';
          errorMessage += 'Possible causes:\n';
          errorMessage += '1. Backend CORS not allowing PATCH method\n';
          errorMessage += '2. Backend endpoint not implemented\n';
          errorMessage += '3. Network connectivity issue\n\n';
          errorMessage += '💡 Check browser console for CORS errors';
        } else {
          errorMessage += error.response?.data?.message || error.message;
        }
        
        toast.error(errorMessage);
      }
    }
  );

  // Create property mutation - POST /properties
  const createPropertyMutation = useMutation(
    (propertyData) => {
      // Explicitly verify images and documents are included
      console.log('📤 Creating new property:', {
        endpoint: 'POST /properties',
        hasImages: 'images' in propertyData,
        imagesCount: propertyData?.images?.length || 0,
        images: propertyData?.images,
        hasDocuments: 'documents' in propertyData,
        documentsCount: propertyData?.documents?.length || 0,
        documents: propertyData?.documents
      });
      
      // Ensure images field is present (even if empty)
      if (!propertyData.images) {
        console.warn('⚠️ Images field missing! Adding empty array.');
        propertyData.images = [];
      }
      
      // Verify images format
      if (propertyData.images && propertyData.images.length > 0) {
        const allValid = propertyData.images.every(img => 
          typeof img === 'string' && img.length > 0
        );
        if (!allValid) {
          console.error('❌ Some images have invalid format!', propertyData.images);
        } else {
          console.log('✅ All images are valid and will be sent to backend');
        }
      }
      
      // Ensure documents field is present (even if empty)
      if (!propertyData.documents) {
        console.warn('⚠️ Documents field missing! Adding empty array.');
        propertyData.documents = [];
      }
      
      // Verify documents format
      if (propertyData.documents && propertyData.documents.length > 0) {
        const allValid = propertyData.documents.every(doc => 
          doc && typeof doc === 'object' && doc.url && doc.name && doc.type
        );
        if (!allValid) {
          console.error('❌ Some documents have invalid format!', propertyData.documents);
        } else {
          console.log('✅ All documents are valid and will be sent to backend');
        }
      }
      
      return adminAPI.createProperty(propertyData);
    },
    {
      onSuccess: async (response, variables) => {
        queryClient.invalidateQueries(['admin-properties']);
        setShowPropertyForm(false);
        setEditingProperty(null);
        setActionPanel(null);
        console.log('✅ Property created successfully:', response);
        
        const newProperty = response?.data?.data || response?.data;
        const propertyId = newProperty?.id || newProperty?.displayCode;
        const displayCode = newProperty?.displayCode || 'New Property';
        
        // Post documents to blocks backend if property was created and has documents
        // variables contains the propertyData that was passed to the mutation
        const propertyData = variables;
        // Check if documents exist (object structure: { brochure, floorPlan, compliance })
        const hasDocuments = propertyData?.documents && (
          propertyData.documents.brochure || 
          propertyData.documents.floorPlan || 
          (Array.isArray(propertyData.documents.compliance) && propertyData.documents.compliance.length > 0)
        );
        
        if (propertyId && hasDocuments) {
          try {
            console.log('📤 PATCH posting documents to blocks backend for property:', propertyId, propertyData.documents);
            await blocksBackendAPI.postPropertyDocuments(propertyId, propertyData.documents);
            console.log('✅ Documents posted to blocks backend successfully');
          } catch (docError) {
            console.error('⚠️ Failed to post documents to blocks backend:', docError);
            // Don't fail the whole operation if documents posting fails
            console.warn('⚠️ Property created but documents not saved to blocks backend');
          }
        }
        
        toast.success(`Property "${displayCode}" created successfully!`);
      },
      onError: (error) => {
        console.error('❌ Failed to create property:', error);
        console.error('Full error response:', error.response);
        console.error('Error details:', {
          message: error.message,
          responseData: error.response?.data,
          status: error.response?.status,
          endpoint: error.config?.url,
          method: error.config?.method,
          sentData: error.config?.data
        });
        
        let errorMessage = '❌ Failed to create property\n\n';
        
        if (error.response?.status === 400) {
          errorMessage += '⚠️ Validation Error\n\n';
          const responseData = error.response?.data;
          const validationErrors = responseData?.message || responseData?.errors || responseData;
          
          console.log('Validation errors:', validationErrors);
          console.log('Validation errors type:', typeof validationErrors);
          console.log('Is array?', Array.isArray(validationErrors));
          
          if (Array.isArray(validationErrors)) {
            errorMessage += 'Please fix the following:\n';
            validationErrors.forEach((err, index) => {
              console.log(`Error ${index}:`, err);
              if (typeof err === 'string') {
                errorMessage += `${index + 1}. ${err}\n`;
              } else {
                errorMessage += `${index + 1}. ${JSON.stringify(err)}\n`;
              }
            });
          } else if (typeof validationErrors === 'object' && validationErrors !== null) {
            errorMessage += 'Please fix the following:\n';
            Object.entries(validationErrors).forEach(([field, msg]) => {
              errorMessage += `• ${field}: ${JSON.stringify(msg)}\n`;
            });
          } else {
            errorMessage += validationErrors || 'Please check all required fields.';
          }
          
          errorMessage += '\n\n📋 Check console for full error details.';
        } else if (error.response?.status === 404) {
          errorMessage += '⚠️ Endpoint Not Found (404)\n\n';
          errorMessage += 'The backend endpoint POST /properties is not available.\n\n';
          errorMessage += '📋 Backend Team To-Do:\n';
          errorMessage += '1. Implement POST /properties endpoint\n';
          errorMessage += '2. Accept property data in request body\n';
          errorMessage += '3. Create property in database\n';
          errorMessage += '4. Return created property with displayCode';
        } else if (error.message === 'Network Error') {
          errorMessage += '⚠️ Network/CORS Error\n\n';
          errorMessage += 'Possible causes:\n';
          errorMessage += '1. Backend server is down\n';
          errorMessage += '2. CORS not allowing POST method\n';
          errorMessage += '3. Network connectivity issue';
        } else {
          errorMessage += error.response?.data?.message || error.message;
        }
        
        toast.error(errorMessage);
      }
    }
  );

  // Update property mutation
  const updatePropertyMutation = useMutation(
    ({ id, data }) => {
      // Explicitly verify images and documents are included
      console.log('📤 Updating property:', {
        endpoint: `PATCH /properties/${id}`,
        hasImages: 'images' in data,
        imagesCount: data?.images?.length || 0,
        images: data?.images,
        hasDocuments: 'documents' in data,
        documentsCount: data?.documents?.length || 0,
        documents: data?.documents
      });
      
      // Ensure images field is present (even if empty)
      if (!data.images) {
        console.warn('⚠️ Images field missing in update! Adding empty array.');
        data.images = [];
      }
      
      // Verify images format
      if (data.images && data.images.length > 0) {
        const allValid = data.images.every(img => 
          typeof img === 'string' && img.length > 0
        );
        if (!allValid) {
          console.error('❌ Some images have invalid format!', data.images);
        } else {
          console.log('✅ All images are valid and will be sent to backend');
        }
      }
      
      // Ensure documents field is present (even if empty)
      if (!data.documents) {
        console.warn('⚠️ Documents field missing in update! Adding empty array.');
        data.documents = [];
      }
      
      // Verify documents format
      if (data.documents && data.documents.length > 0) {
        const allValid = data.documents.every(doc => 
          doc && typeof doc === 'object' && doc.url && doc.name && doc.type
        );
        if (!allValid) {
          console.error('❌ Some documents have invalid format!', data.documents);
        } else {
          console.log('✅ All documents are valid and will be sent to backend');
        }
      }
      
      return adminAPI.updateProperty(id, data);
    },
    {
      onSuccess: async (response, variables) => {
        queryClient.invalidateQueries(['admin-properties']);
        queryClient.invalidateQueries(['property-details', variables.id]);
        setShowPropertyForm(false);
        setEditingProperty(null);
        
        // If we came from details view, go back to it; otherwise close
        if (selectedPropertyId || panelHistory.length > 0) {
          setActionPanel('full-details');
          // Refresh the property data
          setSelectedPropertyId(variables.id || selectedPropertyId);
        } else {
          setActionPanel(null);
        }
        
        console.log('Property updated successfully:', response);
        
        // Update documents in blocks backend if property has documents
        // variables contains { id, data } that was passed to the mutation
        const { id, data } = variables;
        // Check if documents exist (object structure: { brochure, floorPlan, compliance })
        const hasDocuments = data?.documents && (
          data.documents.brochure || 
          data.documents.floorPlan || 
          (Array.isArray(data.documents.compliance) && data.documents.compliance.length > 0)
        );
        
        if (id && hasDocuments) {
          try {
            console.log('📤 PATCH updating documents in blocks backend for property:', id, data.documents);
            await blocksBackendAPI.updatePropertyDocuments(id, data.documents);
            console.log('✅ Documents updated in blocks backend successfully');
          } catch (docError) {
            console.error('⚠️ Failed to update documents in blocks backend:', docError);
            // Don't fail the whole operation if documents update fails
            console.warn('⚠️ Property updated but documents not saved to blocks backend');
          }
        }
        
        toast.success('Property updated successfully!');
      },
      onError: (error, variables) => {
        console.error('❌ Failed to update property:', error);
        console.error('📋 Error details:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          endpoint: error.config?.url,
          method: error.config?.method,
          requestData: error.config?.data
        });
        
        // Log the full response for debugging
        if (error.response?.data) {
          console.error('🔍 Backend Error Response:', JSON.stringify(error.response.data, null, 2));
        }
        
        // Log the data that was sent for debugging
        const sentData = variables?.data || error.config?.data;
        if (sentData) {
          console.error('📤 Data that was sent:', JSON.stringify(sentData, null, 2));
        }
        
        let errorMessage = '❌ Failed to update property\n\n';
        
        if (error.response?.status === 404) {
          errorMessage += '⚠️ Endpoint Not Found (404)\n\n';
          errorMessage += `The backend endpoint PATCH /properties/:id is not implemented yet.\n\n`;
          errorMessage += '📋 Backend Team To-Do:\n';
          errorMessage += '1. Implement PATCH /properties/:id endpoint\n';
          errorMessage += '2. Accept partial property data in request body\n';
          errorMessage += '3. Update property fields in database\n';
          errorMessage += '4. Return updated property data\n\n';
          errorMessage += '💡 Current Status: Frontend is ready, waiting for backend implementation.';
        } else if (error.response?.status === 400) {
          errorMessage += '⚠️ Validation Error (400)\n\n';
          const backendMessage = error.response?.data?.message || error.response?.data?.error || 'Please check all required fields.';
          errorMessage += backendMessage;
          
          // If backend provides field-specific errors, show them
          if (error.response?.data?.errors) {
            errorMessage += '\n\nField Errors:\n';
            Object.entries(error.response.data.errors).forEach(([field, message]) => {
              errorMessage += `• ${field}: ${message}\n`;
            });
          }
        } else {
          errorMessage += error.response?.data?.message || error.message;
        }
        
        toast.error(errorMessage);
      }
    }
  );

  // Delete property mutation
  const deletePropertyMutation = useMutation(
    (id) => adminAPI.deleteProperty(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['admin-properties']);
        setShowDeleteModal(false);
        setPropertyToDelete(null);
        setActionPanel(null);
        console.log('Property deleted successfully');
        toast.success('Property deleted successfully!');
      },
      onError: (error) => {
        console.error('Failed to delete property:', error);
        console.error('Error details:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          endpoint: error.config?.url
        });
        
        let errorMessage = '❌ Failed to delete property\n\n';
        
        if (error.response?.status === 404) {
          errorMessage += '⚠️ Endpoint Not Found (404)\n\n';
          errorMessage += `The backend endpoint DELETE /properties/:id is not implemented yet.\n\n`;
          errorMessage += '📋 Backend Team To-Do:\n';
          errorMessage += '1. Implement DELETE /properties/:id endpoint\n';
          errorMessage += '2. Check if property has active investments\n';
          errorMessage += '3. Prevent deletion if funded\n';
          errorMessage += '4. Delete property from database\n';
          errorMessage += '5. Return success confirmation\n\n';
          errorMessage += '💡 Current Status: Frontend is ready with delete protection, waiting for backend implementation.';
        } else if (error.response?.status === 400) {
          errorMessage += '⚠️ Cannot Delete\n\n';
          errorMessage += error.response?.data?.message || 'This property cannot be deleted.';
        } else {
          errorMessage += error.response?.data?.message || error.message;
        }
        
        toast.error(errorMessage);
        setShowDeleteModal(false);
        setPropertyToDelete(null);
      }
    }
  );

  // Fetch all investments to filter by property (backend doesn't support propertyId filter)
  const { data: allInvestmentsData, isLoading: isLoadingInvestments } = useQuery(
    ['all-investments'],
    () => investmentsAPI.getAll(),
    {
      enabled: !!propertyForReward && showRewardModal,
      retry: 1,
    }
  );

  // Calculate total tokens in market from confirmed investments for this property
  const totalTokensInMarket = useMemo(() => {
    if (!propertyForReward || !allInvestmentsData?.data) {
      // Fallback: calculate from property tokens (total - available)
      if (propertyForReward) {
        const total = parseFloat(propertyForReward.tokenization_total_tokens || propertyForReward.totalTokens || 0);
        const available = parseFloat(propertyForReward.tokenization_available_tokens || propertyForReward.availableTokens || 0);
        return Math.max(0, total - available);
      }
      return 0;
    }
    
    const investments = Array.isArray(allInvestmentsData.data) 
      ? allInvestmentsData.data 
      : allInvestmentsData.data.data || [];
    
    const propertyId = propertyForReward.id || propertyForReward.displayCode;
    const propertyInvestments = investments.filter(inv => 
      (inv.propertyId === propertyId || 
       inv.property?.id === propertyId || 
       inv.property?.displayCode === propertyId) &&
      (inv.status === 'confirmed' || inv.status === 'active')
    );
    
    return propertyInvestments.reduce((sum, inv) => {
      const tokens = parseFloat(inv.tokensPurchased) || 0;
      return sum + tokens;
    }, 0);
  }, [allInvestmentsData, propertyForReward]);

  // Count investors for this property
  const investorCount = useMemo(() => {
    if (!propertyForReward || !allInvestmentsData?.data) return 0;
    
    const investments = Array.isArray(allInvestmentsData.data) 
      ? allInvestmentsData.data 
      : allInvestmentsData.data.data || [];
    
    const propertyId = propertyForReward.id || propertyForReward.displayCode;
    const propertyInvestments = investments.filter(inv => 
      (inv.propertyId === propertyId || 
       inv.property?.id === propertyId || 
       inv.property?.displayCode === propertyId) &&
      (inv.status === 'confirmed' || inv.status === 'active')
    );
    
    // Count unique users
    const uniqueUsers = new Set(propertyInvestments.map(inv => inv.userId || inv.user?.id));
    return uniqueUsers.size;
  }, [allInvestmentsData, propertyForReward]);

  // Distribute reward mutation
  const distributeRewardMutation = useMutation(
    (data) => rewardsAPI.distributeRoi(data),
    {
      onSuccess: (response) => {
        console.log('✅ Reward distributed successfully:', response);
        const result = response?.data || response;
        setRewardDistributionResult(result);
        queryClient.invalidateQueries(['admin-properties']);
        queryClient.invalidateQueries(['all-investments']);
        // Refresh property details if we came from details view
        if (selectedPropertyId) {
          queryClient.invalidateQueries(['property-details', selectedPropertyId]);
        }
        // Show success message
        const message = result.message || `Successfully distributed ${rewardAmount} USDT`;
        toast.success(message);
      },
      onError: (error) => {
        console.error('❌ Failed to distribute reward:', error);
        const errorMsg = error.response?.data?.message || error.message || 'Unknown error';
        toast.error(`Failed to distribute reward: ${errorMsg}`);
      }
    }
  );

  // Handle reward distribution
  const handleDistributeReward = (property, fromDetails = false) => {
    // If coming from details view, preserve the history
    if (fromDetails && actionPanel === 'full-details') {
      setPanelHistory(prev => [...prev, 'full-details']);
      // Preserve the selected property ID if not already set
      const propertyId = property.id || property.displayCode;
      if (!selectedPropertyId && propertyId) {
        setSelectedPropertyId(propertyId);
      }
    }
    
    setPropertyForReward(property);
    setRewardAmount('');
    setRewardDistributionResult(null);
    setShowRewardModal(true);
    setActionPanel('funding');
  };

  // Confirm reward distribution
  const confirmDistributeReward = () => {
    if (!propertyForReward) return;
    if (!rewardAmount || parseFloat(rewardAmount) <= 0) {
      toast.warning('Please enter a valid reward amount (greater than 0)');
      return;
    }

    const propertyId = propertyForReward.displayCode || propertyForReward.id;
    const payload = {
      propertyId: propertyId,
      totalRoiUSDT: parseFloat(rewardAmount)
    };
    
    console.log('🚀 Distributing reward with payload:', payload);
    distributeRewardMutation.mutate(payload);
  };

  // Parse response - handle different backend formats
  // Get all properties from API response
  const allProperties = propertiesData?.data?.data?.properties || 
                        propertiesData?.data?.properties || 
                        propertiesData?.data || 
                        (Array.isArray(propertiesData) ? propertiesData : []);
  
  // Frontend filtering logic
  const filteredProperties = useMemo(() => {
    let filtered = [...allProperties];
    
    // Search filter
    if (filters.search && filters.search.trim()) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(property => {
        const title = (property.title || '').toLowerCase();
        const description = (property.description || '').toLowerCase();
        const location = (property.location_city || '').toLowerCase();
        const displayCode = (property.displayCode || '').toLowerCase();
        
        return title.includes(searchLower) ||
               description.includes(searchLower) ||
               location.includes(searchLower) ||
               displayCode.includes(searchLower);
      });
    }
    
    // Status filter (multi-select)
    if (filters.status && Array.isArray(filters.status) && filters.status.length > 0) {
      filtered = filtered.filter(property => {
        const propertyStatus = (property.status || '').toLowerCase();
        return filters.status.some(filterStatus => 
          propertyStatus === filterStatus.toLowerCase()
        );
      });
    }
    
    // Property type filter (multi-select)
    if (filters.property_type && Array.isArray(filters.property_type) && filters.property_type.length > 0) {
      filtered = filtered.filter(property => {
        const propertyType = (property.property_type || property.propertyType || property.type || '').toLowerCase();
        return filters.property_type.some(filterType => 
          propertyType === filterType.toLowerCase()
        );
      });
    }
    
    // Sorting
    if (filters.sort_by) {
      filtered.sort((a, b) => {
        let aValue, bValue;
        
        switch (filters.sort_by) {
          case 'title':
            aValue = (a.title || '').toLowerCase();
            bValue = (b.title || '').toLowerCase();
            break;
          case 'pricing_total_value':
            aValue = parseFloat(a.pricing_total_value || a.totalValueUSDT || 0);
            bValue = parseFloat(b.pricing_total_value || b.totalValueUSDT || 0);
            break;
          case 'pricing_expected_roi':
            aValue = parseFloat(a.pricing_expected_roi || a.expectedROI || 0);
            bValue = parseFloat(b.pricing_expected_roi || b.expectedROI || 0);
            break;
          case 'created_at':
          default:
            aValue = new Date(a.created_at || a.createdAt || 0);
            bValue = new Date(b.created_at || b.createdAt || 0);
            break;
        }
        
        if (filters.sort_order === 'asc') {
          return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
        } else {
          return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
        }
      });
    }
    
    return filtered;
  }, [allProperties, filters]);
  
  // Use filtered properties instead of raw properties
  const properties = filteredProperties;
  
  const pagination = propertiesData?.data?.data?.pagination || 
                     propertiesData?.data?.pagination || 
                     {
                       totalPages: 1,
                       currentPage: 1,
                       totalProperties: properties.length,
                       hasPrev: false,
                       hasNext: false
                     };

  // Debug logging
  console.log('📦 Properties API Response:', {
    raw: propertiesData,
    parsed: properties,
    pagination: pagination,
    count: properties.length,
    isArray: Array.isArray(properties)
  });
  
  // Log each property for detailed inspection
  if (properties.length > 0) {
    console.log(`✅ Found ${properties.length} properties`);
    properties.forEach((property, index) => {
      console.log(`🏢 Property ${index + 1}:`, {
        id: property.id,
        displayCode: property.displayCode,
        title: property.title,
        status: property.status,
        type: property.propertyType || property.property_type || property.type,
        totalValue: property.purchasePriceUSDT || property.totalValueUSDT || property.pricing_total_value,
        rawProperty: property
      });
    });
  } else {
    console.warn('⚠️ No properties found in response');
    console.log('Check if backend has properties:', `${API_BASE_URL}/properties`);
  }

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    // No need to reset currentPage since we're using frontend filtering
  };

  const handleStatusUpdate = (property) => {
    setSelectedProperty(property);
    setShowModal(true);
  };

  const handleViewProperty = (property) => {
    setSelectedProperty(property);
    setShowModal(true);
    setActionPanel('view');
  };

  const confirmStatusUpdate = () => {
    if (selectedProperty) {
      console.log('📤 Updating property status:', {
        displayCode: selectedProperty.displayCode,
        propertyTitle: selectedProperty.title,
        newStatus: selectedProperty.status,
        endpoint: `PATCH /properties/${selectedProperty.displayCode}`,
        body: { status: selectedProperty.status }
      });
      
      // Using displayCode (PROP-000006) as identifier
      updateStatusMutation.mutate({
        id: selectedProperty.displayCode,
        status: selectedProperty.status
      });
    }
  };

  const handleCreateProperty = () => {
    setEditingProperty(null);
    setShowPropertyForm(true);
    setActionPanel('add');
  };

  const handleEditProperty = async (property, fromDetails = false) => {
    // Fetch full property data from backend to ensure all fields are loaded
    const propertyId = property.id || property.displayCode;
    
    // If coming from details view, preserve the history and property ID
    if (fromDetails && actionPanel === 'full-details') {
      setPanelHistory(prev => [...prev, 'full-details']);
      // Preserve the selected property ID if not already set
      if (!selectedPropertyId && propertyId) {
        setSelectedPropertyId(propertyId);
      }
    }
    
    if (propertyId) {
      try {
        console.log('📥 Fetching full property data for editing:', propertyId);
        const response = await adminAPI.getProperty(propertyId);
        const fullProperty = response?.data?.data || response?.data || property;
        console.log('✅ Fetched full property data from backend:', fullProperty);
        setEditingProperty(fullProperty);
        setShowPropertyForm(true);
        setActionPanel('edit');
      } catch (error) {
        console.error('❌ Failed to fetch property data, using existing data:', error);
        // Fallback to existing property data if fetch fails
        setEditingProperty(property);
        setShowPropertyForm(true);
        setActionPanel('edit');
      }
    } else {
      // No ID, just use the property as-is
      setEditingProperty(property);
      setShowPropertyForm(true);
      setActionPanel('edit');
    }
  };

  // Navigate back to details view from edit
  const handleBackToDetails = () => {
    if (panelHistory.length > 0) {
      const previousView = panelHistory[panelHistory.length - 1];
      setPanelHistory(prev => prev.slice(0, -1));
      setActionPanel(previousView);
      setEditingProperty(null);
      setShowPropertyForm(false);
      // Invalidate queries to refresh the details view
      if (selectedPropertyId) {
        queryClient.invalidateQueries(['property-details', selectedPropertyId]);
      }
    } else if (selectedPropertyId) {
      // If we have a selected property ID, go back to details
      setActionPanel('full-details');
      setEditingProperty(null);
      setShowPropertyForm(false);
      // Refresh the property data
      queryClient.invalidateQueries(['property-details', selectedPropertyId]);
    }
  };

  const handleSaveProperty = (propertyData) => {
    if (editingProperty) {
      updatePropertyMutation.mutate({ id: editingProperty.id, data: propertyData });
      // After successful update, go back to details view if we came from there
      if (selectedPropertyId || panelHistory.length > 0) {
        // Don't close, just switch back to details view
        // The mutation's onSuccess will handle the state update
      }
    } else {
      createPropertyMutation.mutate(propertyData);
      // For new properties, close the panel
      setActionPanel(null);
    }
  };

  // Close action panel handler
  const closeActionPanel = () => {
    setActionPanel(null);
    setSelectedPropertyId(null);
    setShowPropertyForm(false);
    setEditingProperty(null);
    setSelectedProperty(null);
    setShowModal(false);
    setShowRewardModal(false);
    setPropertyForReward(null);
    setShowDeleteModal(false);
    setPropertyToDelete(null);
    setStatusModalOpen(null);
    setPanelHistory([]); // Clear navigation history
  };

  const handleDeleteProperty = (property) => {
    setPropertyToDelete(property);
    setShowDeleteModal(true);
    setActionPanel('delete');
  };

  const confirmDeleteProperty = () => {
    if (propertyToDelete) {
      deletePropertyMutation.mutate(propertyToDelete.id);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'coming-soon': { variant: 'warning', text: 'Coming Soon' },
      'active': { variant: 'success', text: 'Active' },
      'construction': { variant: 'info', text: 'Under Construction' },
      'on-hold': { variant: 'secondary', text: 'On Hold' },
      'sold-out': { variant: 'danger', text: 'Sold Out' },
      'completed': { variant: 'primary', text: 'Completed' },
      'generating-income': { variant: 'success', text: 'Generating Income' },
      'funding': { variant: 'info', text: 'Funding' },
      'pending': { variant: 'warning', text: 'Pending' }
    };
    return statusMap[status] || { variant: 'default', text: status };
  };

  // Available status options for 3x3 grid modal
  const statusOptions = [
    { value: 'coming-soon', label: 'Coming Soon' },
    { value: 'active', label: 'Active' },
    { value: 'construction', label: 'Under Construction' },
    { value: 'funding', label: 'Funding' },
    { value: 'generating-income', label: 'Generating Income' },
    { value: 'on-hold', label: 'On Hold' },
    { value: 'sold-out', label: 'Sold Out' },
    { value: 'completed', label: 'Completed' },
    { value: 'pending', label: 'Pending' }
  ];

  // Handle status change from modal
  const handleStatusChange = (property, newStatus) => {
    updateStatusMutation.mutate({
      id: property.displayCode || property.id,
      status: newStatus
    });
    setStatusModalOpen(null); // Close modal
  };

  const getPropertyTypeColor = (type) => {
    const typeMap = {
      'residential': 'bg-blue-100 text-blue-800',
      'commercial': 'bg-green-100 text-green-800',
      'mixed-use': 'bg-purple-100 text-purple-800'
    };
    return typeMap[type] || 'bg-muted text-muted-foreground';
  };

  const formatPrice = (price) => {
    const num = parseFloat(price);
    if (num >= 1000000000) {
      return `$${(num / 1000000000).toFixed(1)}B`;
    } else if (num >= 1000000) {
      return `$${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `$${(num / 1000).toFixed(0)}K`;
    }
    return `$${num.toFixed(0)}`;
  };

  const calculateFundingPercentage = (total, available) => {
    // Convert to numbers to handle string inputs
    const totalNum = parseFloat(total) || 0;
    const availableNum = parseFloat(available) || 0;
    
    if (totalNum === 0) return 0;
    
    const percentage = ((totalNum - availableNum) / totalNum) * 100;
    console.log(`Funding calculation: total=${totalNum}, available=${availableNum}, percentage=${percentage}`);
    return percentage;
  };

  if (!isAuthenticated) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Please log in to view properties.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Failed to load properties: {error.message}</p>
        <Button onClick={() => window.location.reload()} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }


  // Count active filters
  const activeFiltersCount = [
    filters.search,
    ...(Array.isArray(filters.status) ? filters.status : []),
    ...(Array.isArray(filters.property_type) ? filters.property_type : [])
  ].filter(Boolean).length;

  // Clear all filters
  const clearAllFilters = () => {
    setFilters({
      search: '',
      status: [],
      property_type: [],
      sort_by: 'created_at',
      sort_order: 'desc'
    });
    // Filters are applied on frontend, no need to reset page
  };

  // Toggle filter value (for multi-select)
  const toggleFilter = (filterKey, value) => {
    setFilters(prev => {
      const currentArray = Array.isArray(prev[filterKey]) ? prev[filterKey] : [];
      const isSelected = currentArray.includes(value);
      
      if (isSelected) {
        // Remove from array
        return {
          ...prev,
          [filterKey]: currentArray.filter(v => v !== value)
        };
      } else {
        // Add to array
        return {
          ...prev,
          [filterKey]: [...currentArray, value]
        };
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-card-foreground">Properties Management</h2>
          <p className="text-muted-foreground">
            Manage all properties in your platform
            {!actionPanel && properties.length > 0 && (
              <span className="ml-2 text-blue-600 font-semibold">
                ({properties.length} {properties.length === 1 ? 'property' : 'properties'} found)
              </span>
            )}
          </p>
        </div>
        {!actionPanel && (
          <Button onClick={handleCreateProperty} className="flex items-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>Add Property</span>
          </Button>
        )}
        {actionPanel && (
          <Button 
            onClick={closeActionPanel}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <X className="w-4 h-4" />
            <span>Back to List</span>
          </Button>
        )}
      </div>

      {/* Main Grid Layout - Dynamic 1 or 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 relative transition-all duration-300 ease-[cubic-bezier(0.4,0.0,0.2,1)]">
        {/* LEFT SIDE: Filters + Table */}
        <div className={cn(
          "transition-all duration-300 ease-[cubic-bezier(0.4,0.0,0.2,1)] space-y-4",
          actionPanel ? "lg:col-span-7" : "lg:col-span-12"
        )}>
          {/* Filters - Always Visible */}
          <Card variant="primary" className="p-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold text-card-foreground">Filters</h3>
            {activeFiltersCount > 0 && (
              <Badge variant="info" className="ml-2">
                {activeFiltersCount} active
              </Badge>
            )}
          </div>
          {activeFiltersCount > 0 && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={clearAllFilters}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              Clear All Filters
            </Button>
          )}
        </div>

            {/* Unified Filter System */}
            <div className="relative w-full space-y-4" ref={filterPanelRef}>
              {/* Top Row: Search + Single Filters Button */}
              <div className="flex gap-4">
                {/* Search Input - Takes most space */}
                <div className="flex-1">
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Search Properties
                  </label>
                  <div className="relative">
                    <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                    <InputTwo
                      type="text"
                      name="search"
                      placeholder="Search by name, location, code..."
                      value={filters.search}
                      onChange={(e) => handleFilterChange("search", e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
                      style={{ paddingLeft: "48px" }}
                    />
                  </div>
                </div>

                {/* Single Unified Filters Button */}
                <div className="flex-shrink-0">
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Filters
                  </label>
                  <button
                    type="button"
                    onClick={() => setOpenFilterPanel(prev => prev === 'main' ? null : 'main')}
                    className={cn(
                      "px-5 py-2 border rounded-lg bg-card text-card-foreground flex items-center gap-2 transition-all hover:border-primary/50 min-w-[120px]",
                      openFilterPanel === 'main' || activeFiltersCount > 0
                        ? 'border-primary bg-accent font-semibold' 
                        : 'border-input'
                    )}
                  >
                    <Filter className="w-4 h-4" />
                    <span className="text-sm">Filters</span>
                    {activeFiltersCount > 0 && (
                      <span className="ml-1 px-2 py-0.5 rounded-full bg-blue-600 text-white text-xs font-bold">
                        {activeFiltersCount}
                      </span>
                    )}
                    <span className={cn(
                      "transition-transform duration-200",
                      openFilterPanel === 'main' ? "rotate-180" : ""
                    )}>▼</span>
                  </button>
                </div>
              </div>

              {/* Expanded Filter Panel - Opens below in empty space */}
              {openFilterPanel === 'main' && (
                <div className="w-full rounded-xl p-6 bg-gradient-to-br from-white/80 to-white/60 dark:from-slate-900/80 dark:to-slate-900/60 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 shadow-xl animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Status Section - Multi-select */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <span className="w-1 h-4 bg-blue-600 rounded-full"></span>
                        Status
                        {Array.isArray(filters.status) && filters.status.length > 0 && (
                          <span className="ml-2 px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-medium">
                            {filters.status.length} selected
                          </span>
                        )}
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { value: 'active', label: 'Active' },
                          { value: 'coming-soon', label: 'Coming Soon' },
                          { value: 'funding', label: 'Funding' },
                          { value: 'construction', label: 'Under Construction' },
                          { value: 'generating-income', label: 'Generating Income' },
                          { value: 'on-hold', label: 'On Hold' },
                          { value: 'sold-out', label: 'Sold Out' },
                          { value: 'completed', label: 'Completed' },
                          { value: 'pending', label: 'Pending' }
                        ].map((option) => {
                          const isActive = Array.isArray(filters.status) && filters.status.includes(option.value);
                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => toggleFilter('status', option.value)}
                              className={cn(
                                "px-3 py-1.5 rounded-full border cursor-pointer transition-all duration-200 text-xs font-medium flex items-center gap-1.5",
                                isActive
                                  ? "bg-blue-600 text-white border-blue-600 shadow-md hover:bg-blue-700"
                                  : "bg-white/60 dark:bg-slate-800/60 text-card-foreground border-slate-300 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-slate-700"
                              )}
                            >
                              {isActive && <span className="text-xs">✓</span>}
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                      {Array.isArray(filters.status) && filters.status.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setFilters(prev => ({ ...prev, status: [] }))}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          Clear all status filters
                        </button>
                      )}
                    </div>

                    {/* Property Type Section - Multi-select */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <span className="w-1 h-4 bg-green-600 rounded-full"></span>
                        Property Type
                        {Array.isArray(filters.property_type) && filters.property_type.length > 0 && (
                          <span className="ml-2 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs font-medium">
                            {filters.property_type.length} selected
                          </span>
                        )}
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { value: 'residential', label: 'Residential' },
                          { value: 'commercial', label: 'Commercial' },
                          { value: 'mixed-use', label: 'Mixed Use' }
                        ].map((option) => {
                          const isActive = Array.isArray(filters.property_type) && filters.property_type.includes(option.value);
                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => toggleFilter('property_type', option.value)}
                              className={cn(
                                "px-3 py-1.5 rounded-full border cursor-pointer transition-all duration-200 text-xs font-medium flex items-center gap-1.5",
                                isActive
                                  ? "bg-green-600 text-white border-green-600 shadow-md hover:bg-green-700"
                                  : "bg-white/60 dark:bg-slate-800/60 text-card-foreground border-slate-300 dark:border-slate-700 hover:bg-green-50 dark:hover:bg-slate-700"
                              )}
                            >
                              {isActive && <span className="text-xs">✓</span>}
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                      {Array.isArray(filters.property_type) && filters.property_type.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setFilters(prev => ({ ...prev, property_type: [] }))}
                          className="text-xs text-green-600 dark:text-green-400 hover:underline"
                        >
                          Clear all type filters
                        </button>
                      )}
                    </div>

                    {/* Sort By Section */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <span className="w-1 h-4 bg-purple-600 rounded-full"></span>
                        Sort By
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { value: 'created_at', label: 'Date Created' },
                          { value: 'title', label: 'Title' },
                          { value: 'pricing_total_value', label: 'Total Value' },
                          { value: 'pricing_expected_roi', label: 'Expected ROI' }
                        ].map((option) => {
                          const isActive = filters.sort_by === option.value;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => handleFilterChange('sort_by', option.value)}
                              className={cn(
                                "px-3 py-1.5 rounded-full border cursor-pointer transition-all duration-200 text-xs font-medium",
                                isActive
                                  ? "bg-purple-600 text-white border-purple-600 shadow-md"
                                  : "bg-white/60 dark:bg-slate-800/60 text-card-foreground border-slate-300 dark:border-slate-700 hover:bg-purple-50 dark:hover:bg-slate-700"
                              )}
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Sort Order Section */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <span className="w-1 h-4 bg-orange-600 rounded-full"></span>
                        Sort Order
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { value: 'desc', label: 'Descending ↓' },
                          { value: 'asc', label: 'Ascending ↑' }
                        ].map((option) => {
                          const isActive = filters.sort_order === option.value;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => handleFilterChange('sort_order', option.value)}
                              className={cn(
                                "px-3 py-1.5 rounded-full border cursor-pointer transition-all duration-200 text-xs font-medium",
                                isActive
                                  ? "bg-orange-600 text-white border-orange-600 shadow-md"
                                  : "bg-white/60 dark:bg-slate-800/60 text-card-foreground border-slate-300 dark:border-slate-700 hover:bg-orange-50 dark:hover:bg-slate-700"
                              )}
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Active Filters Chips Bar - Always visible when filters applied */}
              {activeFiltersCount > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  {/* Status chips - show each selected status */}
                  {Array.isArray(filters.status) && filters.status.length > 0 && filters.status.map((status) => {
                    const statusLabels = {
                      'coming-soon': 'Coming Soon',
                      'active': 'Active',
                      'construction': 'Under Construction',
                      'funding': 'Funding',
                      'generating-income': 'Generating Income',
                      'on-hold': 'On Hold',
                      'sold-out': 'Sold Out',
                      'completed': 'Completed',
                      'pending': 'Pending'
                    };
                    return (
                      <div 
                        key={status}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors shadow-sm"
                        onClick={() => toggleFilter('status', status)}
                      >
                        <span>Status: {statusLabels[status] || status}</span>
                        <X className="w-3 h-3" />
                      </div>
                    );
                  })}
                  
                  {/* Property Type chips - show each selected type */}
                  {Array.isArray(filters.property_type) && filters.property_type.length > 0 && filters.property_type.map((type) => {
                    const typeLabels = {
                      'residential': 'Residential',
                      'commercial': 'Commercial',
                      'mixed-use': 'Mixed Use'
                    };
                    return (
                      <div 
                        key={type}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium cursor-pointer hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors shadow-sm"
                        onClick={() => toggleFilter('property_type', type)}
                      >
                        <span>Type: {typeLabels[type] || type}</span>
                        <X className="w-3 h-3" />
                      </div>
                    );
                  })}
                  
                  {filters.search && (
                    <div 
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-medium cursor-pointer hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors shadow-sm"
                      onClick={() => handleFilterChange('search', '')}
                    >
                      <span>Search: "{filters.search}"</span>
                      <X className="w-3 h-3" />
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs font-medium shadow-sm">
                    <span>{filters.sort_by === 'created_at' ? 'Date' : 
                              filters.sort_by === 'title' ? 'Title' :
                              filters.sort_by === 'pricing_total_value' ? 'Value' : 'ROI'}</span>
                    <span>{filters.sort_order === 'desc' ? '↓' : '↑'}</span>
                  </div>
                </div>
              )}
            </div>

      </Card>

          {/* Properties Grid */}
          <div className="min-h-[400px]">
            {properties.length === 0 ? (
              <Card variant="primary" className="p-12">
                <div className="flex flex-col items-center text-center">
                  <Building2 className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
                  <p className="text-lg font-semibold text-card-foreground mb-2">No properties found</p>
                  <p className="text-sm text-muted-foreground">Try adjusting your filters or add a new property</p>
                </div>
              </Card>
            ) : (
              <div className={cn(
                "grid gap-4",
                actionPanel 
                  ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" 
                  : "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
              )}>
                {properties.map((property) => {
                // Map backend fields to expected frontend fields
                const mappedProperty = {
                  ...property,
                  title: property.title,
                  location_city: property.city || property.location_city || 'Unknown City',
                  property_type: property.propertyType || property.property_type || property.type || 'residential',
                  status: property.status || 'active',
                  pricing_total_value: property.purchasePriceUSDT || 
                                      property.totalValueUSDT || 
                                      property.pricing_total_value || 
                                      property.totalValue ||
                                      property.price ||
                                      0,
                  pricing_expected_roi: property.expectedROI || 
                                       property.pricing_expected_roi || 
                                       property.roi ||
                                       0,
                  tokenization_total_tokens: property.totalTokens || 
                                            property.tokenization_total_tokens || 
                                            property.tokens ||
                                            0,
                  tokenization_available_tokens: property.availableTokens || 
                                                property.tokenization_available_tokens || 
                                                property.totalTokens || 
                                                property.tokens ||
                                                0,
                };

                const fundingPercentage = calculateFundingPercentage(
                  mappedProperty.tokenization_total_tokens,
                  mappedProperty.tokenization_available_tokens
                );
                
                // Only allow delete if funding is exactly zero (no investors)
                const canDelete = fundingPercentage === 0;
                const isDisabled = fundingPercentage > 0;
                
                // Debug logging for all properties
                console.log(`🏢 ${mappedProperty.title}:`, {
                  '📦 RAW BACKEND DATA': property,
                  '🔄 MAPPED DATA': mappedProperty,
                  '💰 Price Fields Found': {
                    purchasePriceUSDT: property.purchasePriceUSDT,
                    totalValueUSDT: property.totalValueUSDT,
                    pricing_total_value: property.pricing_total_value,
                    totalValue: property.totalValue,
                    price: property.price,
                    '✅ USING': mappedProperty.pricing_total_value
                  },
                  '📊 ROI Fields Found': {
                    expectedROI: property.expectedROI,
                    roi: property.roi,
                    '✅ USING': mappedProperty.pricing_expected_roi
                  },
                  '🎫 Token Fields Found': {
                    totalTokens: property.totalTokens,
                    availableTokens: property.availableTokens,
                    '✅ USING Total': mappedProperty.tokenization_total_tokens,
                    '✅ USING Available': mappedProperty.tokenization_available_tokens
                  },
                  '📈 Funding': fundingPercentage + '%'
                });
                const statusInfo = getStatusBadge(mappedProperty.status);
                const propertyImage = getPropertyImage(mappedProperty);
                const propertyId = mappedProperty.id || mappedProperty.displayCode;
                const isSelected = actionPanel === 'full-details' && selectedPropertyId && (
                  propertyId === selectedPropertyId || 
                  String(propertyId) === String(selectedPropertyId)
                );

                return (
                  <div 
                    key={mappedProperty.id}
                    className={cn(
                      "group overflow-hidden rounded-xl cursor-pointer transition-all duration-300 hover:scale-[1.02] bg-white/5 dark:bg-black/20 backdrop-blur-xl border shadow-lg hover:shadow-xl",
                      isSelected
                        ? "border-primary border-2 ring-2 ring-primary/50 ring-offset-2 bg-primary/10 dark:bg-primary/20 scale-[1.02] shadow-xl"
                        : "border-white/20 dark:border-white/10 hover:border-primary/50"
                    )}
                    onClick={() => {
                      if (propertyId) {
                        setSelectedPropertyId(propertyId);
                        setActionPanel('full-details');
                      }
                    }}
                  >
                    {/* Property Image */}
                    <div className="relative h-48 bg-gradient-to-br from-accent/50 to-accent/20 overflow-hidden rounded-t-xl">
                      {propertyImage ? (
                        <img
                          src={propertyImage}
                          alt={mappedProperty.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 rounded-t-xl"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            if (e.target.nextSibling) {
                              e.target.nextSibling.style.display = 'flex';
                            }
                          }}
                        />
                      ) : null}
                      <div className={`${propertyImage ? 'hidden' : 'flex'} w-full h-full items-center justify-center bg-gradient-to-br from-muted/50 to-muted/30 rounded-t-xl`}>
                        <Building2 className="w-16 h-16 text-muted-foreground opacity-30" />
                      </div>
                      
                      {/* Status Badge Overlay */}
                      <div className="absolute top-3 right-3">
                        <Badge 
                          variant={statusInfo.variant}
                          className="cursor-pointer hover:opacity-90 transition-opacity backdrop-blur-sm bg-white/90 dark:bg-gray-900/90 shadow-lg"
                          onClick={(e) => {
                            e.stopPropagation();
                            setStatusModalOpen(mappedProperty);
                          }}
                          title="Click to change status"
                        >
                          {statusInfo.text}
                        </Badge>
                      </div>
                    </div>

                    {/* Property Details */}
                    <div className="p-4 space-y-3">
                      {/* Title and Location */}
                      <div>
                        <h3 className="text-base font-bold text-card-foreground truncate group-hover:text-primary transition-colors">
                          {mappedProperty.title}
                        </h3>
                        <div className="flex items-center mt-1 text-xs text-muted-foreground">
                          <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                          <span className="truncate">{mappedProperty.location_city}</span>
                        </div>
                      </div>

                      {/* Property Type Badge */}
                      <div>
                        <Badge className={`${getPropertyTypeColor(mappedProperty.property_type)} text-xs`}>
                          {mappedProperty.property_type}
                        </Badge>
                      </div>

                      {/* Metrics Grid */}
                      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border/50">
                        <div className="text-center">
                          <p className="text-[10px] text-muted-foreground font-medium mb-1">Total Value</p>
                          <p className="text-sm font-bold text-card-foreground">{formatPrice(mappedProperty.pricing_total_value)}</p>
                        </div>
                        <div className="text-center border-x border-border/50">
                          <p className="text-[10px] text-muted-foreground font-medium mb-1">Funding</p>
                          <div className="flex flex-col items-center">
                            <p className={`text-sm font-bold ${fundingPercentage > 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
                              {fundingPercentage === 0 ? '0%' : fundingPercentage < 1 ? `${fundingPercentage.toFixed(1)}%` : `${Math.round(fundingPercentage)}%`}
                            </p>
                            <div className="w-full bg-muted rounded-full h-1 mt-1">
                              <div
                                className={`h-1 rounded-full ${fundingPercentage > 0 ? 'bg-green-600' : 'bg-gray-400'}`}
                                style={{ width: `${Math.min(Math.max(fundingPercentage, 0), 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] text-muted-foreground font-medium mb-1">ROI</p>
                          <p className="text-sm font-bold text-purple-600">{mappedProperty.pricing_expected_roi}%</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT SIDE: Dynamic Action Panel */}
        {actionPanel && (
          <div className={cn(
            "lg:col-span-5 rounded-xl shadow-lg p-4 md:p-6",
            "transition-all duration-300 ease-[cubic-bezier(0.4,0.0,0.2,1)]",
            "opacity-100 translate-x-0 translate-y-0",
            "md:translate-y-0",
            "lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto"
          )}>
            {/* Panel Header - Only show for non-full-details actions */}
            {actionPanel !== 'full-details' && actionPanel !== 'edit' && actionPanel !== 'funding' && (
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
                <h3 className="text-lg font-bold text-card-foreground">
                  {actionPanel === 'add' && 'Add New Property'}
                  {actionPanel === 'view' && 'Property Details'}
                  {actionPanel === 'delete' && 'Delete Property'}
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={closeActionPanel}
                  className="h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* Panel Content */}
            <div className="space-y-4">
              {/* Add Property Form */}
              {actionPanel === 'add' && (
                <PropertyForm
                  property={null}
                  onSave={handleSaveProperty}
                  onCancel={closeActionPanel}
                  isLoading={createPropertyMutation.isLoading}
                  inline={true}
                />
              )}

              {/* Edit Property Form */}
              {actionPanel === 'edit' && editingProperty && (
                <div className="space-y-4">
                  {/* Back to Details Button - Only show if we came from details view */}
                  {(panelHistory.length > 0 || selectedPropertyId) && (
                    <div className="flex items-center justify-between pb-3 border-b border-border/50 mb-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleBackToDetails}
                        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span className="text-xs font-medium">Back to Details</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={closeActionPanel}
                        className="h-8 w-8 p-0"
                        title="Close"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                  <PropertyForm
                    property={editingProperty}
                    onSave={handleSaveProperty}
                    onCancel={selectedPropertyId || panelHistory.length > 0 ? handleBackToDetails : closeActionPanel}
                    isLoading={updatePropertyMutation.isLoading}
                    inline={true}
                  />
                </div>
              )}

              {/* View Property Details */}
              {actionPanel === 'view' && selectedProperty && (() => {
                const totalTokens = parseFloat(selectedProperty.tokenization_total_tokens || 0);
                const availableTokens = parseFloat(selectedProperty.tokenization_available_tokens || 0);
                const soldTokens = totalTokens - availableTokens;
                const fundingProgress = totalTokens > 0 ? ((soldTokens / totalTokens) * 100) : 0;
                const totalValue = parseFloat(selectedProperty.pricing_total_value || selectedProperty.totalValueUSDT || 0);
                const pricePerToken = totalTokens > 0 ? (totalValue / totalTokens) : 0;
                const totalInvestment = soldTokens * pricePerToken;
                const totalBuyers = selectedProperty.investment_stats?.totalInvestors || 0;
                const roi = selectedProperty.pricing_expected_roi || selectedProperty.expectedROI || 0;
                
                return (
                  <div className="space-y-4 ">
                    {/* Investment Stats Cards */}
                    <div className="grid grid-cols-2 gap-3">
                      <Card variant="tertiary" className="p-3">
                        <p className="text-xs text-muted-foreground mb-1">Total Investment</p>
                        <p className="text-base font-bold text-card-foreground">{formatPrice(totalInvestment)}</p>
                      </Card>
                      <Card variant="tertiary" className="p-3">
                        <p className="text-xs text-muted-foreground mb-1">Total Buyers</p>
                        <p className="text-base font-bold text-card-foreground">{totalBuyers}</p>
                      </Card>
                      <Card variant="tertiary" className="p-3">
                        <p className="text-xs text-muted-foreground mb-1">Tokens Left</p>
                        <p className="text-base font-bold text-card-foreground">{availableTokens.toLocaleString()}</p>
                      </Card>
                      <Card variant="tertiary" className="p-3">
                        <p className="text-xs text-muted-foreground mb-1">ROI</p>
                        <p className="text-base font-bold text-green-600">{roi}%</p>
                      </Card>
                    </div>

                    {/* Property Information */}
                    <Card variant="tertiary" className="p-4">
                      <h3 className="text-base font-semibold text-card-foreground mb-3">Property Information</h3>
                      <div className="space-y-3 text-sm">
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground">Property Name</label>
                          <p className="text-sm text-card-foreground mt-1">{selectedProperty.title}</p>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground">Type</label>
                          <p className="text-sm text-card-foreground mt-1 capitalize">{selectedProperty.property_type || selectedProperty.type}</p>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground">Status</label>
                          <Badge variant={getStatusBadge(selectedProperty.status).variant} className="mt-1">
                            {getStatusBadge(selectedProperty.status).text}
                          </Badge>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground">Location</label>
                          <p className="text-sm text-card-foreground mt-1 flex items-center">
                            <MapPin className="w-3 h-3 mr-1" />
                            {selectedProperty.location_city || 'Unknown City'}
                          </p>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground">Total Value</label>
                          <p className="text-sm text-card-foreground mt-1">{formatPrice(totalValue)}</p>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground">Price Per Token</label>
                          <p className="text-sm text-card-foreground mt-1">{formatPrice(pricePerToken)}</p>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground">Funding Progress</label>
                          <p className="text-sm text-blue-600 font-semibold mt-1">{fundingProgress.toFixed(2)}%</p>
                        </div>
                      </div>
                    </Card>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-2 pt-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          closeActionPanel();
                          handleDistributeReward(selectedProperty);
                        }}
                        className="flex items-center justify-center bg-green-600 hover:bg-green-700 text-white border-green-600"
                      >
                        <DollarSign className="w-4 h-4 mr-2" />
                        Distribute Reward
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          closeActionPanel();
                          handleEditProperty(selectedProperty);
                        }}
                        className="flex items-center justify-center"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Property
                      </Button>
                    </div>
                  </div>
                );
              })()}

              {/* Funding/Reward Distribution */}
              {actionPanel === 'funding' && propertyForReward && (
                <div className="space-y-4">
                  {/* Back to Details Button - Only show if we came from details view */}
                  {(panelHistory.length > 0 || selectedPropertyId) && (
                    <div className="flex items-center justify-between pb-3 border-b border-border/50 mb-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleBackToDetails}
                        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span className="text-xs font-medium">Back to Details</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={closeActionPanel}
                        className="h-8 w-8 p-0"
                        title="Close"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                  
                  {/* Property Info */}
                  <Card className="p-4">
                    <h4 className="font-medium text-card-foreground mb-3">{propertyForReward.title}</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">Display Code:</span>
                        <p className="font-medium text-card-foreground">{propertyForReward.displayCode || propertyForReward.id}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Location:</span>
                        <p className="font-medium text-card-foreground">{propertyForReward.location_city || propertyForReward.city || 'N/A'}</p>
                      </div>
                    </div>
                  </Card>

                  {/* Token Market Info */}
                  {isLoadingInvestments ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="text-sm text-muted-foreground mt-2">Loading investment data...</p>
                    </div>
                  ) : (
                    <Card variant="tertiary" className="p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                      <div className="flex items-center space-x-2 mb-2">
                        <Coins className="w-5 h-5 text-blue-600" />
                        <h4 className="font-medium text-card-foreground">Tokens in Market</h4>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <span className="text-xs text-muted-foreground">Total Tokens Purchased:</span>
                          <p className="text-base font-semibold text-blue-600">
                            {totalTokensInMarket.toLocaleString(undefined, { maximumFractionDigits: 6 })} tokens
                          </p>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground">Investors:</span>
                          <p className="text-base font-semibold text-blue-600">
                            {investorCount} user{investorCount !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                    </Card>
                  )}

                  {/* Reward Distribution Form */}
                  {!rewardDistributionResult ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-card-foreground mb-2">
                          Total ROI Amount (USDT) *
                        </label>
                        <input
                          type="number"
                          name="rewardAmount"
                          step="0.01"
                          min="0.01"
                          placeholder="Enter amount in USDT (e.g., 10000)"
                          value={rewardAmount}
                          onChange={(e) => setRewardAmount(e.target.value)}
                          className="w-full"
                          style={{
                            border: 'none',
                            padding: '1rem',
                            borderRadius: '1rem',
                            background: '#e8e8e8',
                            boxShadow: '20px 20px 60px #c5c5c5, -20px -20px 60px #ffffff',
                            transition: '0.3s'
                          }}
                          onFocus={(e) => {
                            e.target.style.outlineColor = '#e8e8e8';
                            e.target.style.background = '#e8e8e8';
                            e.target.style.boxShadow = 'inset 20px 20px 60px #c5c5c5, inset -20px -20px 60px #ffffff';
                          }}
                          onBlur={(e) => {
                            e.target.style.background = '#e8e8e8';
                            e.target.style.boxShadow = '20px 20px 60px #c5c5c5, -20px -20px 60px #ffffff';
                          }}
                        />
                      </div>

                      {rewardAmount && parseFloat(rewardAmount) > 0 && totalTokensInMarket > 0 && (
                        <Card variant="tertiary" className="p-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Total ROI:</span>
                              <span className="font-semibold text-green-600">{parseFloat(rewardAmount).toLocaleString()} USDT</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">ROI per Token:</span>
                              <span className="font-semibold">
                                {(parseFloat(rewardAmount) / totalTokensInMarket).toFixed(6)} USDT
                              </span>
                            </div>
                          </div>
                        </Card>
                      )}

                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          onClick={selectedPropertyId || panelHistory.length > 0 ? handleBackToDetails : closeActionPanel}
                          disabled={distributeRewardMutation.isLoading}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={confirmDistributeReward}
                          disabled={distributeRewardMutation.isLoading || !rewardAmount || parseFloat(rewardAmount) <= 0}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold"
                        >
                          {distributeRewardMutation.isLoading ? 'Sending...' : 'Send Reward'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Card variant="tertiary" className="p-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                      <div className="flex items-center space-x-2 mb-3">
                        <DollarSign className="w-5 h-5 text-green-600" />
                        <h4 className="font-medium text-green-800 dark:text-green-200">Reward Distribution Successful!</h4>
                      </div>
                      <p className="text-sm text-green-700 dark:text-green-300 font-medium mb-2">
                        {rewardDistributionResult.message || `Successfully distributed ${rewardAmount} USDT`}
                      </p>
                      <Button
                        onClick={selectedPropertyId || panelHistory.length > 0 ? handleBackToDetails : closeActionPanel}
                        className="w-full bg-green-600 hover:bg-green-700"
                      >
                        {selectedPropertyId || panelHistory.length > 0 ? 'Back to Details' : 'Close'}
                      </Button>
                    </Card>
                  )}
                </div>
              )}

              {/* Delete Confirmation */}
              {actionPanel === 'delete' && propertyToDelete && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                      <AlertTriangle className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-card-foreground">Delete Property</h3>
                      <p className="text-sm text-muted-foreground">This action cannot be undone</p>
                    </div>
                  </div>
                  
                  <Card variant="tertiary" className="p-4 bg-accent">
                    <h4 className="font-medium text-card-foreground mb-2">{propertyToDelete.title}</h4>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Type: {propertyToDelete.property_type}</p>
                      <p>Status: {propertyToDelete.status}</p>
                      <p>Location: {propertyToDelete.location_city}</p>
                      <p>Total Value: {formatPrice(propertyToDelete.pricing_total_value)}</p>
                    </div>
                  </Card>

                  <p className="text-sm text-foreground">
                    Are you sure you want to delete this property? 
                    This will deactivate the property listing and remove it from the platform.
                  </p>
                  
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      onClick={closeActionPanel}
                      disabled={deletePropertyMutation.isLoading}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={confirmDeleteProperty}
                      disabled={deletePropertyMutation.isLoading}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                    >
                      {deletePropertyMutation.isLoading ? 'Deleting...' : 'Delete Property'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Full Property Details View */}
              {actionPanel === 'full-details' && selectedPropertyId && (() => {
                const fullProperty = fullPropertyData?.data || fullPropertyData || {};
                const allInvestments = fullInvestmentsData?.data?.investments || fullInvestmentsData?.data || (Array.isArray(fullInvestmentsData) ? fullInvestmentsData : []);
                const allTransactions = fullTransactionsData?.data?.transactions || fullTransactionsData?.data || (Array.isArray(fullTransactionsData) ? fullTransactionsData : []);
                
                const propertyInvestments = allInvestments.filter(inv => 
                  (inv.propertyId === selectedPropertyId || inv.property_id === selectedPropertyId || inv.property?.id === selectedPropertyId)
                );
                
                const propertyTransactions = allTransactions.filter(txn => 
                  (txn.propertyId === selectedPropertyId || txn.property_id === selectedPropertyId || txn.property?.id === selectedPropertyId)
                );

                const totalInvestment = propertyInvestments.reduce((sum, inv) => {
                  const amount = parseFloat(inv.amountUSDT || inv.amount || inv.investment_amount || 0);
                  return sum + amount;
                }, 0);

                const uniqueBuyers = new Set();
                propertyInvestments.forEach(inv => {
                  const userId = inv.userId || inv.user_id || inv.user?.id;
                  if (userId) uniqueBuyers.add(userId);
                });

                const totalTokens = parseFloat(fullProperty.totalTokens || fullProperty.total_tokens || 0);
                const availableTokens = parseFloat(fullProperty.availableTokens || fullProperty.available_tokens || 0);
                const tokensSold = totalTokens - availableTokens;
                const tokensLeft = availableTokens;
                const pricePerToken = parseFloat(fullProperty.pricePerTokenUSDT || fullProperty.price_per_token_usdt || fullProperty.pricePerToken || 0);
                const totalValueUSDT = parseFloat(fullProperty.totalValueUSDT || fullProperty.total_value_usdt || fullProperty.pricing_total_value || 0);
                const fundingProgress = totalValueUSDT > 0 ? (totalInvestment / totalValueUSDT) * 100 : 0;
                const expectedROI = parseFloat(fullProperty.expectedROI || fullProperty.expected_roi || 0);

                const formatPrice = (amount, currency = 'USD') => {
                  const num = parseFloat(amount);
                  if (num >= 1000000000) {
                    return `${currency} ${(num / 1000000000).toFixed(1)}B`;
                  } else if (num >= 1000000) {
                    return `${currency} ${(num / 1000000).toFixed(1)}M`;
                  } else if (num >= 1000) {
                    return `${currency} ${(num / 1000).toFixed(0)}K`;
                  }
                  return `${currency} ${num.toFixed(0)}`;
                };

                const formatDate = (dateString) => {
                  if (!dateString) return 'N/A';
                  return new Date(dateString).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });
                };

                const getStatusBadge = (status) => {
                  const statusMap = {
                    'coming-soon': { variant: 'warning', text: 'Coming Soon' },
                    'active': { variant: 'success', text: 'Active' },
                    'construction': { variant: 'info', text: 'Under Construction' },
                    'on-hold': { variant: 'secondary', text: 'On Hold' },
                    'sold-out': { variant: 'danger', text: 'Sold Out' },
                    'completed': { variant: 'primary', text: 'Completed' }
                  };
                  return statusMap[status] || { variant: 'default', text: status };
                };

                const tabs = [
                  { id: 'overview', label: 'Overview', icon: BarChart3 },
                  { id: 'documents', label: 'Documents', icon: FileText },
                  { id: 'investments', label: 'Investments', icon: TrendingUp },
                  { id: 'tokens', label: 'Token Activity', icon: PieChart },
                  { id: 'transactions', label: 'Transactions', icon: Activity }
                ];

                const StatCard = ({ title, value, icon: Icon, color = 'blue' }) => (
                  <Card variant="tertiary" className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">{title}</p>
                        <p className="text-xl font-bold text-card-foreground mt-1">{value}</p>
                      </div>
                      <div className={`p-2 rounded-full bg-${color}-100 dark:bg-${color}-900/20`}>
                        <Icon className={`w-5 h-5 text-${color}-600 dark:text-${color}-400`} />
                      </div>
                    </div>
                  </Card>
                );

                const renderOverview = () => (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <StatCard title="Total Investment" value={formatPrice(totalInvestment)} icon={DollarSign} color="green" />
                      <StatCard title="Total Buyers" value={uniqueBuyers.size || 0} icon={Users} color="blue" />
                      <StatCard title="Tokens Left" value={tokensLeft || 0} icon={Target} color="yellow" />
                      <StatCard title="ROI" value={`${expectedROI || 0}%`} icon={TrendingUp} color="purple" />
                    </div>
                    <Card className="p-4">
                      <h3 className="text-base font-semibold text-card-foreground mb-3">Property Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-1">Property Name</label>
                          <p className="text-sm text-card-foreground">{fullProperty.title || fullProperty.name || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-1">Type</label>
                          <p className="text-sm text-card-foreground capitalize">{fullProperty.type || fullProperty.property_type || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-1">Status</label>
                          {fullProperty.status ? (
                            <Badge variant={getStatusBadge(fullProperty.status).variant}>
                              {getStatusBadge(fullProperty.status).text}
                            </Badge>
                          ) : (
                            <p className="text-sm text-muted-foreground">N/A</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-1">Location</label>
                          <p className="text-sm text-card-foreground">{fullProperty.city || fullProperty.location_city || fullProperty.location || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-1">Total Value</label>
                          <p className="text-sm text-card-foreground">{formatPrice(totalValueUSDT, 'USD')}</p>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-1">Price Per Token</label>
                          <p className="text-sm text-card-foreground">{formatPrice(pricePerToken, 'USD')}</p>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-1">Total Tokens</label>
                          <p className="text-sm text-card-foreground">{(totalTokens || 0).toLocaleString()}</p>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-1">Funding Progress</label>
                          <p className="text-sm text-card-foreground">{Math.min(fundingProgress, 100).toFixed(2)}%</p>
                        </div>
                      </div>
                    </Card>
                  </div>
                );

                const renderInvestments = () => (
                  <div className="space-y-4">
                    <Card variant="tertiary" className="overflow-hidden">
                      <div className="px-4 py-3 border-b border-border">
                        <h3 className="text-base font-semibold text-card-foreground">Investment History</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-accent">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Investor</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Amount</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Tokens</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Date</th>
                            </tr>
                          </thead>
                          <tbody className="bg-card divide-y divide-border">
                            {propertyInvestments.length === 0 ? (
                              <tr>
                                <td colSpan="4" className="px-4 py-8 text-center text-muted-foreground text-sm">No investments found</td>
                              </tr>
                            ) : (
                              propertyInvestments.map((investment) => {
                                const user = investment.user || {};
                                const userName = user.fullName || user.full_name || user.name || 'Unknown User';
                                const amount = investment.amountUSDT || investment.amount || investment.investment_amount || 0;
                                const tokens = investment.tokensToBuy || investment.tokensPurchased || investment.tokens_purchased || investment.tokens_to_buy || 0;
                                const createdAt = investment.createdAt || investment.created_at || investment.date;
                                
                                return (
                                  <tr key={investment.id || investment._id || Math.random()} className="hover:bg-accent">
                                    <td className="px-4 py-2 whitespace-nowrap">
                                      <div className="text-xs font-medium text-card-foreground">{userName}</div>
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap text-xs text-card-foreground">{formatPrice(amount)}</td>
                                    <td className="px-4 py-2 whitespace-nowrap text-xs text-card-foreground">{parseFloat(tokens).toLocaleString()}</td>
                                    <td className="px-4 py-2 whitespace-nowrap text-xs text-muted-foreground">{createdAt ? formatDate(createdAt) : 'N/A'}</td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  </div>
                );

                const renderDocuments = () => {
                  const documents = getPropertyDocuments(fullProperty);
                  const hasDocuments = documents?.brochure || documents?.floorPlan || (Array.isArray(documents?.compliance) && documents.compliance.length > 0);
                  
                  if (!hasDocuments) {
                    return (
                      <Card variant="tertiary" className="p-8">
                        <div className="text-center">
                          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                          <h3 className="text-base font-semibold text-card-foreground mb-1">No Documents Available</h3>
                          <p className="text-xs text-muted-foreground">No documents have been uploaded for this property yet.</p>
                        </div>
                      </Card>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      {documents?.brochure && (
                        <Card className="p-4">
                          <h3 className="text-base font-semibold text-card-foreground mb-3 flex items-center">
                            <FileText className="w-4 h-4 mr-2" />
                            Brochure
                          </h3>
                          <div className="p-3 bg-accent rounded-lg border border-border">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-card-foreground">{documents.brochure.name}</p>
                                {documents.brochure.notes && (
                                  <p className="text-xs text-muted-foreground mt-1">{documents.brochure.notes}</p>
                                )}
                              </div>
                              <a href={documents.brochure.url} target="_blank" rel="noopener noreferrer" className="ml-3 p-2 text-primary hover:text-primary/80">
                                <Download className="w-4 h-4" />
                              </a>
                            </div>
                          </div>
                        </Card>
                      )}
                      {documents?.floorPlan && (
                        <Card variant="tertiary" className="p-4">
                          <h3 className="text-base font-semibold text-card-foreground mb-3 flex items-center">
                            <FileText className="w-4 h-4 mr-2" />
                            Floor Plan
                          </h3>
                          <div className="p-3 bg-accent rounded-lg border border-border">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-card-foreground">{documents.floorPlan.name}</p>
                                {documents.floorPlan.notes && (
                                  <p className="text-xs text-muted-foreground mt-1">{documents.floorPlan.notes}</p>
                                )}
                              </div>
                              <a href={documents.floorPlan.url} target="_blank" rel="noopener noreferrer" className="ml-3 p-2 text-primary hover:text-primary/80">
                                <Download className="w-4 h-4" />
                              </a>
                            </div>
                          </div>
                        </Card>
                      )}
                      {Array.isArray(documents?.compliance) && documents.compliance.length > 0 && (
                        <Card variant="tertiary" className="p-4">
                          <h3 className="text-base font-semibold text-card-foreground mb-3 flex items-center">
                            <FileText className="w-4 h-4 mr-2" />
                            Compliance Documents
                          </h3>
                          <div className="space-y-2">
                            {documents.compliance.map((comp, index) => (
                              <div key={index} className="p-3 bg-accent rounded-lg border border-border flex items-center justify-between">
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-card-foreground">{comp.name}</p>
                                  {comp.notes && (
                                    <p className="text-xs text-muted-foreground mt-1">{comp.notes}</p>
                                  )}
                                </div>
                                <a href={comp.url} target="_blank" rel="noopener noreferrer" className="ml-3 p-2 text-primary hover:text-primary/80">
                                  <Download className="w-4 h-4" />
                                </a>
                              </div>
                            ))}
                          </div>
                        </Card>
                      )}
                    </div>
                  );
                };

                const renderTokens = () => (
                  <div className="space-y-4">
                    <Card variant="tertiary" className="p-4">
                      <h3 className="text-base font-semibold text-card-foreground mb-3">Token Information</h3>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-1">Total Tokens</label>
                          <p className="text-lg font-bold text-card-foreground">{totalTokens || 0}</p>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-1">Tokens Sold</label>
                          <p className="text-lg font-bold text-card-foreground">{tokensSold || 0}</p>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-1">Tokens Left</label>
                          <p className="text-lg font-bold text-card-foreground">{tokensLeft || 0}</p>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-1">Price Per Token</label>
                          <p className="text-lg font-bold text-card-foreground">{formatPrice(pricePerToken, 'USD')}</p>
                        </div>
                      </div>
                    </Card>
                  </div>
                );

                const renderTransactions = () => (
                  <div className="space-y-4">
                    <Card variant="tertiary" className="overflow-hidden">
                      <div className="px-4 py-3 border-b border-border">
                        <h3 className="text-base font-semibold text-card-foreground">Transaction History</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-accent">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Transaction</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Type</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Amount</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Date</th>
                            </tr>
                          </thead>
                          <tbody className="bg-card divide-y divide-border">
                            {propertyTransactions.length === 0 ? (
                              <tr>
                                <td colSpan="4" className="px-4 py-8 text-center text-muted-foreground text-sm">No transactions found</td>
                              </tr>
                            ) : (
                              propertyTransactions.map((transaction) => {
                                const txnId = transaction.id || transaction._id || 'N/A';
                                const txnType = transaction.type || transaction.transaction_type || transaction.transactionType || 'N/A';
                                const amount = transaction.amountUSDT || transaction.amount || transaction.amount_in_pkr || 0;
                                const createdAt = transaction.createdAt || transaction.created_at || transaction.date;
                                
                                return (
                                  <tr key={txnId} className="hover:bg-accent">
                                    <td className="px-4 py-2 whitespace-nowrap">
                                      <div className="text-xs font-medium text-card-foreground">
                                        {typeof txnId === 'string' && txnId.length > 8 ? txnId.slice(0, 8) + '...' : txnId}
                                      </div>
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap">
                                      <Badge variant="info" className="text-xs">{txnType}</Badge>
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap text-xs text-card-foreground">{formatPrice(amount)}</td>
                                    <td className="px-4 py-2 whitespace-nowrap text-xs text-muted-foreground">{createdAt ? formatDate(createdAt) : 'N/A'}</td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  </div>
                );

                const renderTabContent = () => {
                  switch (propertyDetailsTab) {
                    case 'overview':
                      return renderOverview();
                    case 'documents':
                      return renderDocuments();
                    case 'investments':
                      return renderInvestments();
                    case 'tokens':
                      return renderTokens();
                    case 'transactions':
                      return renderTransactions();
                    default:
                      return renderOverview();
                  }
                };

                if (fullPropertyLoading) {
                  return (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span className="ml-2 text-muted-foreground text-sm">Loading property details...</span>
                    </div>
                  );
                }

                const mainImage = getPropertyImage(fullProperty);
                const allImages = getPropertyImages(fullProperty);

                return (
                  <div className="space-y-4">
                    {/* Header with Actions */}
                    <div className="pb-4 border-b border-border">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1 min-w-0">
                          <h2 className="text-xl font-bold text-card-foreground truncate">{fullProperty.title || fullProperty.name || 'Property Details'}</h2>
                          <p className="text-sm text-muted-foreground flex items-center mt-1">
                            <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                            <span className="truncate">{fullProperty.city || fullProperty.location_city || fullProperty.location || 'Location not specified'}</span>
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={closeActionPanel}
                          className="h-8 w-8 p-0 ml-2 flex-shrink-0"
                          title="Close"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      {/* Action Buttons Row */}
                      <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-border/50">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // Switch to reward mode without closing panel
                            handleDistributeReward(fullProperty, true);
                          }}
                          className="flex items-center gap-2 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20 border-green-200 dark:border-green-800 transition-all"
                          title="Distribute Reward"
                        >
                          <DollarSign className="w-4 h-4" />
                          <span className="text-xs font-medium">Reward</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // Switch to edit mode without closing panel
                            handleEditProperty(fullProperty, true);
                          }}
                          className="flex items-center gap-2 hover:bg-accent transition-all"
                          title="Edit Property"
                        >
                          <Edit className="w-4 h-4" />
                          <span className="text-xs font-medium">Edit</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const canDelete = calculateFundingPercentage(
                              fullProperty.tokenization_total_tokens || fullProperty.totalTokens || 0,
                              fullProperty.tokenization_available_tokens || fullProperty.availableTokens || 0
                            ) === 0;
                            if (!canDelete) {
                              toast.warning(`Cannot delete - ${calculateFundingPercentage(
                                fullProperty.tokenization_total_tokens || fullProperty.totalTokens || 0,
                                fullProperty.tokenization_available_tokens || fullProperty.availableTokens || 0
                              ).toFixed(1)}% funded`);
                              return;
                            }
                            closeActionPanel();
                            handleDeleteProperty(fullProperty);
                          }}
                          className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={calculateFundingPercentage(
                            fullProperty.tokenization_total_tokens || fullProperty.totalTokens || 0,
                            fullProperty.tokenization_available_tokens || fullProperty.availableTokens || 0
                          ) > 0}
                          title={calculateFundingPercentage(
                            fullProperty.tokenization_total_tokens || fullProperty.totalTokens || 0,
                            fullProperty.tokenization_available_tokens || fullProperty.availableTokens || 0
                          ) > 0 ? `Cannot delete - ${calculateFundingPercentage(
                            fullProperty.tokenization_total_tokens || fullProperty.totalTokens || 0,
                            fullProperty.tokenization_available_tokens || fullProperty.availableTokens || 0
                          ).toFixed(1)}% funded` : 'Delete Property'}
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="text-xs font-medium">Delete</span>
                        </Button>
                        <div className="ml-auto flex items-center gap-2">
                          <Badge 
                            variant={getStatusBadge(fullProperty.status).variant}
                            className="text-xs cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              setStatusModalOpen(fullProperty);
                            }}
                            title="Click to change status"
                          >
                            {getStatusBadge(fullProperty.status).text}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Property Image */}
                    {mainImage && (
                      <Card variant="tertiary" className="overflow-hidden p-0">
                        <div className="w-full h-48 bg-muted flex items-center justify-center overflow-hidden">
                          <img
                            src={mainImage}
                            alt={fullProperty.title || fullProperty.name || 'Property image'}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              if (e.target.nextSibling) {
                                e.target.nextSibling.style.display = 'flex';
                              }
                            }}
                          />
                          <div className="hidden w-full h-full items-center justify-center bg-muted">
                            <Building2 className="w-12 h-12 text-muted-foreground" />
                          </div>
                        </div>
                      </Card>
                    )}

                    {/* Tabs */}
                    <div className="border-b border-border">
                      <div className="flex space-x-4 overflow-x-auto">
                        {tabs.map((tab) => {
                          const Icon = tab.icon;
                          return (
                            <button
                              key={tab.id}
                              onMouseEnter={() => {
                                // Clear any existing timeout
                                if (hoverTimeoutRef.current) {
                                  clearTimeout(hoverTimeoutRef.current);
                                }
                                // Set a short delay before switching tabs
                                hoverTimeoutRef.current = setTimeout(() => {
                                  setPropertyDetailsTab(tab.id);
                                }, 150); // 150ms delay to prevent switching on random scrolling
                              }}
                              onMouseLeave={() => {
                                // Clear timeout if mouse leaves before delay completes
                                if (hoverTimeoutRef.current) {
                                  clearTimeout(hoverTimeoutRef.current);
                                }
                              }}
                              onClick={() => {
                                // Clear timeout and switch immediately on click
                                if (hoverTimeoutRef.current) {
                                  clearTimeout(hoverTimeoutRef.current);
                                }
                                setPropertyDetailsTab(tab.id);
                              }}
                              className={cn(
                                "flex items-center space-x-1 py-2 px-1 border-b-2 font-medium text-xs transition-colors whitespace-nowrap",
                                propertyDetailsTab === tab.id
                                  ? "border-primary text-primary"
                                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-input"
                              )}
                            >
                              <Icon className="w-3 h-3" />
                              <span>{tab.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Tab Content */}
                    <div className="overflow-y-auto">
                      {renderTabContent()}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Property Details Modal - Keep for backward compatibility */}
      {showModal && selectedProperty && !actionPanel && (() => {
        const totalTokens = parseFloat(selectedProperty.tokenization_total_tokens || 0);
        const availableTokens = parseFloat(selectedProperty.tokenization_available_tokens || 0);
        const soldTokens = totalTokens - availableTokens;
        const fundingProgress = totalTokens > 0 ? ((soldTokens / totalTokens) * 100) : 0;
        const totalValue = parseFloat(selectedProperty.pricing_total_value || selectedProperty.totalValueUSDT || 0);
        const pricePerToken = totalTokens > 0 ? (totalValue / totalTokens) : 0;
        const totalInvestment = soldTokens * pricePerToken;
        const totalBuyers = selectedProperty.investment_stats?.totalInvestors || 0;
        const roi = selectedProperty.pricing_expected_roi || selectedProperty.expectedROI || 0;
        
        return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 h-full w-full z-50 flex items-start justify-center p-4 overflow-y-auto">
            <div className="relative my-4 mx-auto border w-full max-w-4xl shadow-lg rounded-md bg-card max-h-[95vh] flex flex-col">
              {/* Sticky Header with Close Button */}
              <div className="sticky top-0 z-10 bg-card border-b border-border px-6 py-4 flex justify-between items-center rounded-t-md shadow-sm">
                <div>
                  <h2 className="text-2xl font-bold text-card-foreground">{selectedProperty.title}</h2>
                  <p className="text-muted-foreground flex items-center mt-1">
                    <MapPin className="w-4 h-4 mr-1" />
                    {selectedProperty.location_city || 'Unknown City'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedProperty(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="overflow-y-auto flex-1 px-6 py-6">

                {/* Investment Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <Card className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">Total Investment</p>
                  <p className="text-lg font-bold text-card-foreground">{formatPrice(totalInvestment)}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">Total Buyers</p>
                  <p className="text-lg font-bold text-card-foreground">{totalBuyers}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">Tokens Left</p>
                  <p className="text-lg font-bold text-card-foreground">{availableTokens.toLocaleString()}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">ROI</p>
                  <p className="text-lg font-bold text-green-600">{roi}%</p>
                </Card>
                </div>

                {/* Second Row Stats */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                <Card className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">Price Per Token</p>
                  <p className="text-lg font-bold text-card-foreground">{formatPrice(pricePerToken)}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">Total Tokens</p>
                  <p className="text-lg font-bold text-card-foreground">{totalTokens.toLocaleString()}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">Funding Progress</p>
                  <p className="text-lg font-bold text-blue-600">{fundingProgress.toFixed(2)}%</p>
                </Card>
                </div>

                {/* Property Information */}
                <Card className="p-6">
                <h3 className="text-lg font-semibold text-card-foreground mb-4">Property Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-muted-foreground">Property Name</label>
                    <p className="text-base text-card-foreground">{selectedProperty.title}</p>
                </div>
                <div>
                    <label className="block text-sm font-medium text-muted-foreground">Type</label>
                    <p className="text-base text-card-foreground capitalize">{selectedProperty.property_type || selectedProperty.type}</p>
                </div>
                <div>
                    <label className="block text-sm font-medium text-muted-foreground">Status</label>
                    <Badge variant={getStatusBadge(selectedProperty.status).variant}>
                      {getStatusBadge(selectedProperty.status).text}
                    </Badge>
                </div>
                <div>
                    <label className="block text-sm font-medium text-muted-foreground">Location</label>
                    <p className="text-base text-card-foreground">{selectedProperty.location_city || 'Unknown City'}</p>
                </div>
                <div>
                    <label className="block text-sm font-medium text-muted-foreground">Total Value</label>
                    <p className="text-base text-card-foreground">{formatPrice(totalValue)}</p>
                </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground">Min Investment</label>
                    <p className="text-base text-card-foreground">{formatPrice(selectedProperty.pricing_min_investment || 0)}</p>
                  </div>
                  </div>
              </Card>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowModal(false);
                      setSelectedProperty(null);
                    }}
                  >
                    Close
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowModal(false);
                      handleDistributeReward(selectedProperty);
                    }}
                    className="flex items-center bg-green-600 hover:bg-green-700 text-white border-green-600"
                  >
                    <DollarSign className="w-4 h-4 mr-2" />
                    Distribute Reward
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowModal(false);
                      handleEditProperty(selectedProperty);
                    }}
                    className="flex items-center"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Property
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}


      {/* Delete Confirmation Modal - Keep for backward compatibility */}
      {showDeleteModal && propertyToDelete && !actionPanel && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-card">
            <div className="mt-3">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-card-foreground">Delete Property</h3>
                  <p className="text-sm text-muted-foreground">This action cannot be undone</p>
                </div>
              </div>
              
              {/* Property Info */}
              <div className="bg-accent p-4 rounded-lg mb-4">
                <h4 className="font-medium text-card-foreground mb-2">{propertyToDelete.title}</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Type: {propertyToDelete.property_type}</p>
                  <p>Status: {propertyToDelete.status}</p>
                  <p>Location: {propertyToDelete.location_city}</p>
                  <p>Total Value: {formatPrice(propertyToDelete.pricing_total_value)}</p>
                  <p>Funding: {calculateFundingPercentage(
                    propertyToDelete.tokenization_total_tokens,
                    propertyToDelete.tokenization_available_tokens
                  ).toFixed(5)}%</p>
                </div>
              </div>

              <p className="text-sm text-foreground mb-6">
                Are you sure you want to delete this property? 
                This will deactivate the property listing and remove it from the platform.
              </p>
              
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setPropertyToDelete(null);
                  }}
                  disabled={deletePropertyMutation.isLoading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmDeleteProperty}
                  disabled={deletePropertyMutation.isLoading}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {deletePropertyMutation.isLoading ? 'Deleting...' : 'Delete Property'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reward Distribution Modal - Keep for backward compatibility */}
      {showRewardModal && propertyForReward && !actionPanel && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-card">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <DollarSign className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-card-foreground">Distribute Reward</h3>
                    <p className="text-sm text-muted-foreground">Distribute ROI to all investors</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowRewardModal(false);
                    setPropertyForReward(null);
                    setRewardAmount('');
                    setRewardDistributionResult(null);
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              {/* Property Info */}
              <Card className="p-4 mb-4">
                <h4 className="font-medium text-card-foreground mb-3">{propertyForReward.title}</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Display Code:</span>
                    <p className="font-medium text-card-foreground">{propertyForReward.displayCode || propertyForReward.id}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Location:</span>
                    <p className="font-medium text-card-foreground">{propertyForReward.location_city || propertyForReward.city || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Tokens:</span>
                    <p className="font-medium text-card-foreground">
                      {propertyForReward.tokenization_total_tokens || propertyForReward.totalTokens || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Available Tokens:</span>
                    <p className="font-medium text-card-foreground">
                      {propertyForReward.tokenization_available_tokens || propertyForReward.availableTokens || 'N/A'}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Token Market Info */}
              {isLoadingInvestments ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-sm text-muted-foreground mt-2">Loading investment data...</p>
                </div>
              ) : (
                <Card className="p-4 mb-4 bg-blue-50 border-blue-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <Coins className="w-5 h-5 text-blue-600" />
                    <h4 className="font-medium text-card-foreground">Tokens in Market</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-muted-foreground">Total Tokens Purchased:</span>
                      <p className="text-lg font-semibold text-blue-600">
                        {totalTokensInMarket.toLocaleString(undefined, { maximumFractionDigits: 6 })} tokens
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Investors:</span>
                      <p className="text-lg font-semibold text-blue-600">
                        {investorCount} user{investorCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Rewards will be distributed proportionally based on token ownership
                  </p>
                </Card>
              )}

              {/* Reward Distribution Form */}
              {!rewardDistributionResult ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-card-foreground mb-2">
                      Total ROI Amount (USDT) *
                    </label>
                    <input
                      type="number"
                      name="rewardAmountModal"
                      step="0.01"
                      min="0.01"
                      placeholder="Enter amount in USDT (e.g., 10000)"
                      value={rewardAmount}
                      onChange={(e) => setRewardAmount(e.target.value)}
                      className="w-full text-lg font-semibold"
                      style={{
                        border: 'none',
                        padding: '1rem',
                        borderRadius: '1rem',
                        background: '#e8e8e8',
                        boxShadow: '20px 20px 60px #c5c5c5, -20px -20px 60px #ffffff',
                        transition: '0.3s'
                      }}
                      onFocus={(e) => {
                        e.target.style.outlineColor = '#e8e8e8';
                        e.target.style.background = '#e8e8e8';
                        e.target.style.boxShadow = 'inset 20px 20px 60px #c5c5c5, inset -20px -20px 60px #ffffff';
                      }}
                      onBlur={(e) => {
                        e.target.style.background = '#e8e8e8';
                        e.target.style.boxShadow = '20px 20px 60px #c5c5c5, -20px -20px 60px #ffffff';
                      }}
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      💡 This amount will be distributed proportionally to all investors based on their token ownership
                    </p>
                  </div>

                  {rewardAmount && parseFloat(rewardAmount) > 0 && totalTokensInMarket > 0 && (
                    <Card className="p-4 bg-green-50 border-green-200">
                      <div className="flex items-center space-x-2 mb-2">
                        <Users className="w-5 h-5 text-green-600" />
                        <h4 className="font-medium text-card-foreground">Distribution Preview</h4>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total ROI:</span>
                          <span className="font-semibold text-green-600">{parseFloat(rewardAmount).toLocaleString()} USDT</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total Tokens in Market:</span>
                          <span className="font-semibold">{totalTokensInMarket.toLocaleString(undefined, { maximumFractionDigits: 6 })}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">ROI per Token:</span>
                          <span className="font-semibold">
                            {(parseFloat(rewardAmount) / totalTokensInMarket).toFixed(6)} USDT
                          </span>
                        </div>
                        <div className="pt-2 border-t border-green-200">
                          <p className="text-xs text-muted-foreground">
                            Each investor will receive rewards proportional to their token ownership
                          </p>
                        </div>
                      </div>
                    </Card>
                  )}

                  <div className="flex justify-end space-x-3 mt-6">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowRewardModal(false);
                        setPropertyForReward(null);
                        setRewardAmount('');
                        setRewardDistributionResult(null);
                      }}
                      disabled={distributeRewardMutation.isLoading}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={confirmDistributeReward}
                      disabled={distributeRewardMutation.isLoading || !rewardAmount || parseFloat(rewardAmount) <= 0}
                      className="bg-green-600 hover:bg-green-700 text-white font-semibold"
                    >
                      {distributeRewardMutation.isLoading ? 'Sending...' : 'Send Reward'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <Card className="p-4 bg-green-50 border-green-200">
                    <div className="flex items-center space-x-2 mb-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <DollarSign className="w-5 h-5 text-green-600" />
                      </div>
                      <h4 className="font-medium text-green-800">Reward Distribution Successful!</h4>
                    </div>
                    <div className="space-y-2 text-sm">
                      <p className="text-green-700 font-medium">
                        {rewardDistributionResult.message || `Successfully distributed ${rewardAmount} USDT`}
                      </p>
                      {rewardDistributionResult.count && (
                        <p className="text-muted-foreground">
                          Rewards distributed to {rewardDistributionResult.count} user(s)
                        </p>
                      )}
                      {rewardDistributionResult.totalDistributed && (
                        <p className="text-muted-foreground">
                          Total distributed: {parseFloat(rewardDistributionResult.totalDistributed).toLocaleString()} USDT
                        </p>
                      )}
                    </div>
                  </Card>

                  <div className="flex justify-end space-x-3">
                    <Button
                      onClick={() => {
                        setShowRewardModal(false);
                        setPropertyForReward(null);
                        setRewardAmount('');
                        setRewardDistributionResult(null);
                      }}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Close
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Status Update Modal with 3x3 Grid - Always show as modal */}
      {statusModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-card-foreground">Change Property Status</h2>
                  <p className="text-sm text-muted-foreground mt-1">{statusModalOpen.title}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStatusModalOpen(null)}
                  className="h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* 3x3 Grid of Status Options */}
              <div className="grid grid-cols-3 gap-3">
                {statusOptions.map((option) => {
                  const optionStatusInfo = getStatusBadge(option.value);
                  const isSelected = statusModalOpen.status === option.value;
                  return (
                    <button
                      key={option.value}
                      onClick={() => handleStatusChange(statusModalOpen, option.value)}
                      className={`p-4 rounded-lg border-2 transition-all hover:scale-105 ${
                        isSelected
                          ? 'border-primary bg-primary/10 shadow-md'
                          : 'border-border hover:border-primary/50 hover:bg-accent'
                      }`}
                    >
                      <div className="flex flex-col items-center space-y-2">
                        <Badge 
                          variant={optionStatusInfo.variant}
                          className="text-xs"
                        >
                          {optionStatusInfo.text}
                        </Badge>
                        {isSelected && (
                          <div className="text-primary font-semibold text-xs">Current</div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Cancel Button */}
              <div className="flex justify-end mt-6">
                <Button
                  variant="outline"
                  onClick={() => setStatusModalOpen(null)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertiesManagement;
