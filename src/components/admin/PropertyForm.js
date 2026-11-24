import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Building2, MapPin, DollarSign, TrendingUp, Hash, Plus, Trash2, Settings, Edit, Upload, FileText, ChevronRight, ChevronLeft, Check, Award, Image as ImageIcon } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import SimpleMap from './SimpleMap';
import { adminAPI, uploadAPI, propertiesAPI, blocksBackendAPI, propertyTokensAPI } from '../../services/api';
import { supabaseUpload } from '../../services/supabaseUpload';
import { useToast } from '../ui/Toast';
import { ASSET_CATEGORIES, ACTIVE_PHASE } from '../../utils/assetCategories';

// Using Supabase for both document and image uploads
console.log('✅ PropertyForm: Using Supabase for document and image uploads');

const ASSET_TYPE_OPTIONS = Object.entries(ASSET_CATEGORIES)
  .filter(([, def]) => def.phase <= ACTIVE_PHASE)
  .flatMap(([categoryKey, def]) =>
    def.types.map((t) => ({
      value: t.value,
      label: `${def.label} — ${t.label}`,
      categoryKey,
    }))
  );

const PropertyForm = ({ property, onSave, onCancel, isLoading, inline = false }) => {
  const toast = useToast();
  // Multi-step form state
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 2; // Only 2 steps (step 2 is commented out)
  
  const [formData, setFormData] = useState({
    // Required fields for backend validation
    organizationId: '', // Required: organization ID
    type: 'sukuk', // Required: asset subtype
    status: 'active', // Required: one of the allowed values
    totalValueUSDT: '', // Required: number
    totalTokens: '', // Required: number
    expectedROI: '', // Required: number (calculated based on construction progress)
    fullROI: '', // Base/full ROI when construction is 100%
    
    // Other fields
    title: '',
    slug: '',
    description: '',
    short_description: '',
    location_address: '',
    location_city: 'Karachi',
    location_state: 'Sindh',
    location_country: 'Pakistan',
    location_latitude: '',
    location_longitude: '',
    property_type: 'sukuk',
    project_type: '',
    floors: '',
    total_units: '',
    construction_progress: '',
    start_date: '',
    expected_completion: '',
    handover_date: '',
    pricing_total_value: '',
    pricing_market_value: '',
    pricing_appreciation: '',
    pricing_expected_roi: '',
    pricing_min_investment: '',
    tokenization_total_tokens: '',
    tokenization_available_tokens: '',
    tokenization_price_per_token: '',
    tokenization_token_price: '',
    unit_types: [],
    features: [],
    images: [], // Array of image URLs
    seo: {},
    investment_stats: {
      totalInvestors: 0,
      totalInvestment: 0,
      averageInvestment: 0
    },
    is_active: true,
    is_featured: false,
    sort_order: 0,
    bedrooms: 2,
    bathrooms: 2,
    area_sqm: 100.00,
    is_rented: false,
    appreciation_percentage: 20.00,
    amenities: [],
    documents: {
      brochure: null,
      floorPlan: null,
      compliance: []
    },
    property_features: [],
    listing_price_formatted: '$0'
  });

  const [newUnitType, setNewUnitType] = useState({ type: '', size: '', count: '' });
  const [editingUnitIndex, setEditingUnitIndex] = useState(null);
  const [editingUnit, setEditingUnit] = useState({ type: '', size: '', count: '' });
  const [newFeature, setNewFeature] = useState('');
  const [newAmenity, setNewAmenity] = useState('');
  const [newDocument, setNewDocument] = useState({ 
    name: '', 
    url: '', 
    type: '', // 'brochure', 'floorPlan', or 'compliance'
    notes: '', // For brochure
    version: '', // For floorPlan
    issuedAt: '', // For compliance
    issuedBy: '' // For compliance
  });
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const documentFileInputRef = useRef(null);
  const [newPropertyFeature, setNewPropertyFeature] = useState('');
  const [newImage, setNewImage] = useState({ url: '', alt: '', type: 'main' });
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageFileInputRef = useRef(null);
  const [seoData, setSeoData] = useState({ title: '', description: '', keywords: '' });
  const [organizations, setOrganizations] = useState([]);
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [fullPropertyData, setFullPropertyData] = useState(null);
  const [loadingPropertyData, setLoadingPropertyData] = useState(false);
  const formDataLoadedForPropertyRef = useRef(null); // Track which property ID has had its form data loaded
  const fetchedPropertyIdRef = useRef(null); // Track which property ID we've fetched from API
  
  // Token Tier Management State (for creating new property)
  const [tokenTiers, setTokenTiers] = useState([]); // Array of token tiers to create
  const [showTokenTierForm, setShowTokenTierForm] = useState(false);
  const [editingTierIndex, setEditingTierIndex] = useState(null);
  const [tokenTierFormData, setTokenTierFormData] = useState({
    name: '',
    color: '#CD7F32',
    tokenSymbol: '',
    totalValueUSDT: '', // Total value of the tier (input field)
    totalTokens: '',
    expectedROI: '',
    apartmentType: '',
    apartmentFeatures: {},
    description: '',
    displayOrder: 0,
    isActive: true,
  });
  const [tokenTierValidationError, setTokenTierValidationError] = useState('');
  const [tokenTierValueValidationError, setTokenTierValueValidationError] = useState('');

  // Token Tier Management State (for existing property)
  const [propertyTokens, setPropertyTokens] = useState([]);
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [showTokenForm, setShowTokenForm] = useState(false);
  const [editingToken, setEditingToken] = useState(null);
  const [tokenFormData, setTokenFormData] = useState({
    name: '',
    color: '#CD7F32',
    tokenSymbol: '',
    pricePerTokenUSDT: '',
    totalTokens: '',
    expectedROI: '',
    apartmentType: '',
    apartmentFeatures: {},
    description: '',
    displayOrder: 0,
    isActive: true,
  });

  // Fetch full property data from backend when editing
  useEffect(() => {
    const fetchFullProperty = async () => {
      if (property && (property.id || property.displayCode)) {
        const propertyId = property.id || property.displayCode;
        
        // Only fetch if this is a different property than what we've already fetched
        if (fetchedPropertyIdRef.current === propertyId) {
          console.log('⏭️ PropertyForm: Skipping fetch - same property already fetched');
          return;
        }
        
        setLoadingPropertyData(true);
        try {
          console.log('📥 PropertyForm: Fetching full property data from backend:', propertyId);
          const response = await propertiesAPI.getById(propertyId);
          const fullData = response?.data?.data || response?.data || response;
          console.log('✅ PropertyForm: Received full property data:', fullData);
          setFullPropertyData(fullData);
          fetchedPropertyIdRef.current = propertyId; // Mark this property as fetched
        } catch (error) {
          console.error('❌ PropertyForm: Failed to fetch property data:', error);
          setFullPropertyData(property); // Use provided property as fallback
          fetchedPropertyIdRef.current = propertyId; // Mark as fetched even with fallback
        } finally {
          setLoadingPropertyData(false);
        }
      } else {
        // Reset when no property (creating new)
        setFullPropertyData(null);
        fetchedPropertyIdRef.current = null;
        formDataLoadedForPropertyRef.current = null;
        setLoadingPropertyData(false);
      }
    };
    
    fetchFullProperty();
  }, [property?.id, property?.displayCode]);

  // Fetch property tokens when editing existing property
  useEffect(() => {
    const fetchTokens = async () => {
      if (property && (property.id || property.displayCode)) {
        const propertyId = property.id || property.displayCode;
        setLoadingTokens(true);
        try {
          const response = await propertyTokensAPI.getByProperty(propertyId, true);
          const tokens = response?.data?.data || response?.data || response || [];
          setPropertyTokens(Array.isArray(tokens) ? tokens : []);
        } catch (error) {
          console.error('Failed to load property tokens:', error);
          setPropertyTokens([]);
        } finally {
          setLoadingTokens(false);
        }
      } else {
        setPropertyTokens([]);
      }
    };
    
    fetchTokens();
  }, [property?.id, property?.displayCode]);

  // Fetch organizations from database
  useEffect(() => {
    const fetchOrganizations = async () => {
      setLoadingOrgs(true);
      try {
        const response = await adminAPI.getOrganizations({ limit: 100 });
        const orgs = response?.data?.data?.organizations || response?.data?.organizations || response?.data || [];
        setOrganizations(orgs);
        console.log('📋 Loaded organizations:', orgs);
        
        // Auto-select first organization ONLY for new properties (not when editing)
        // Check if we're creating a new property (no property prop passed)
        if (orgs.length > 0 && !property && !formData.organizationId) {
          setFormData(prev => ({
            ...prev,
            organizationId: orgs[0].displayCode || orgs[0].id
          }));
        }
      } catch (error) {
        console.error('Failed to load organizations:', error);
        // If API fails, user can still manually enter org ID
      } finally {
        setLoadingOrgs(false);
      }
    };
    
    fetchOrganizations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [property]);

  // Update organizationId when organizations finish loading (for editing mode)
  useEffect(() => {
    // Only update if we're editing a property and organizations are loaded
    if (property && organizations.length > 0 && formDataLoadedForPropertyRef.current) {
      const propertyToLoad = fullPropertyData || property;
      const rawOrgId = propertyToLoad?.organizationId || 
                      propertyToLoad?.organization_id || 
                      propertyToLoad?.organization?.displayCode ||
                      propertyToLoad?.organization?.id ||
                      '';
      
      if (rawOrgId) {
        // Try to find matching organization
        const matchedOrg = organizations.find(org => 
          org.displayCode === rawOrgId || 
          org.id === rawOrgId ||
          org.displayCode === rawOrgId?.toString() ||
          org.id === rawOrgId?.toString()
        );
        
        if (matchedOrg) {
          const correctOrgId = matchedOrg.displayCode || matchedOrg.id;
          // Only update if it's different from current value
          if (formData.organizationId !== correctOrgId) {
            console.log('🔄 Updating organizationId after organizations loaded:', correctOrgId);
            setFormData(prev => ({
              ...prev,
              organizationId: correctOrgId
            }));
          }
        } else if (rawOrgId && !formData.organizationId) {
          // If no match but we have rawOrgId and form doesn't have it, use rawOrgId
          console.log('📝 Setting organizationId from raw value:', rawOrgId);
          setFormData(prev => ({
            ...prev,
            organizationId: rawOrgId
          }));
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizations, property, fullPropertyData]);

  useEffect(() => {
    // Get the property ID from either fullPropertyData or property prop
    const propertyIdFromProp = property?.id || property?.displayCode;
    const propertyIdFromFull = fullPropertyData?.id || fullPropertyData?.displayCode;
    const currentPropertyId = propertyIdFromFull || propertyIdFromProp;
    
    // CRITICAL: Skip if we've already loaded form data for this exact property ID
    // This prevents ANY resetting of user edits, even on re-renders
    if (currentPropertyId && formDataLoadedForPropertyRef.current === currentPropertyId) {
      console.log('⏭️ SKIPPING - Form data already loaded for property:', currentPropertyId);
      return; // EXIT EARLY - don't touch form data at all
    }
    
    // Use fullPropertyData if available (from backend), otherwise use property prop
    const propertyToLoad = fullPropertyData || property;
    
    // If we're creating a new property (no propertyToLoad), don't reset unless switching from edit mode
    if (!propertyToLoad || !currentPropertyId) {
      // Only reset ref if we were previously editing a property
      if (formDataLoadedForPropertyRef.current !== null) {
        console.log('🔄 Switching from edit to create mode');
        formDataLoadedForPropertyRef.current = null;
      }
      return; // Don't proceed with loading
    }
    
    // At this point, we know:
    // 1. We have a property to load
    // 2. We have a property ID
    // 3. We haven't loaded form data for this property yet
    // So we can safely load the data
    
    // Load property data into form (we know propertyToLoad exists at this point)
    console.log('📥 ====== LOADING PROPERTY DATA FOR EDITING ======');
    console.log('📥 Property ID:', currentPropertyId);
    console.log('📥 Full property data received:', JSON.stringify(propertyToLoad, null, 2));
    console.log('📋 Available organizations for matching:', organizations);
      
      // Log all keys in the property object to see what fields exist
      console.log('🔑 All property keys:', Object.keys(propertyToLoad));
      
      // Handle images - can be JSON string, array, or object with urls
      let imagesArray = [];
      if (propertyToLoad.images) {
        let imageData = propertyToLoad.images;
        
        // If it's a string, try to parse it as JSON
        if (typeof imageData === 'string') {
          try {
            imageData = JSON.parse(imageData);
          } catch (e) {
            console.warn('Failed to parse images JSON:', e);
            imageData = null;
          }
        }
        
        if (imageData) {
          if (Array.isArray(imageData)) {
            // Direct array of URLs or objects
            imagesArray = imageData.map(img => {
              if (typeof img === 'string') return img;
              if (typeof img === 'object' && img.url) return img.url;
              return null;
            }).filter(Boolean);
          } else if (typeof imageData === 'object') {
            // Object format - could be { urls: [...] } or { main: { url: '...' } }
            if (Array.isArray(imageData.urls)) {
              // Format: { urls: ['url1', 'url2', ...] }
              imagesArray = imageData.urls.filter(url => typeof url === 'string' && url.length > 0);
            } else {
              // Format: { main: { url: '...' }, gallery: { url: '...' } }
              imagesArray = Object.values(imageData)
                .map(img => {
                  if (typeof img === 'string') return img;
                  if (typeof img === 'object' && img.url) return img.url;
                  return null;
                })
                .filter(Boolean);
            }
          }
        }
        
        console.log('🖼️ Parsed images:', { raw: propertyToLoad.images, parsed: imagesArray });
      }
      
      // Extract amenities and unit_types from features object (if nested)
      let amenities = [];
      let unit_types = [];
      
      if (propertyToLoad.features) {
        if (typeof propertyToLoad.features === 'object' && !Array.isArray(propertyToLoad.features)) {
          // Features is an object: { amenities: [...], unit_types: [...] }
          amenities = Array.isArray(propertyToLoad.features.amenities) ? propertyToLoad.features.amenities : [];
          unit_types = Array.isArray(propertyToLoad.features.unit_types) ? propertyToLoad.features.unit_types : [];
        } else if (Array.isArray(propertyToLoad.features)) {
          // Features is an array (old format)
          amenities = propertyToLoad.features;
        }
      }
      
      // If amenities/unit_types exist at top level, use those instead
      if (Array.isArray(propertyToLoad.amenities) && propertyToLoad.amenities.length > 0) {
        amenities = propertyToLoad.amenities;
      }
      if (Array.isArray(propertyToLoad.unit_types) && propertyToLoad.unit_types.length > 0) {
        unit_types = propertyToLoad.unit_types;
      }
      
      // Map location fields (database might have various field name structures)
      // Check multiple possible field names from backend
      const locationObj = propertyToLoad.location || {};
      const location_city = propertyToLoad.location_city || 
                           propertyToLoad.city || 
                           locationObj.city ||
                           (typeof locationObj === 'string' ? locationObj.split(',')[0]?.trim() : null) ||
                           '';
      const location_state = propertyToLoad.location_state || 
                            propertyToLoad.state || 
                            locationObj.state ||
                            (typeof locationObj === 'string' ? locationObj.split(',')[1]?.trim() : null) ||
                            '';
      const location_country = propertyToLoad.location_country || 
                              propertyToLoad.country || 
                              locationObj.country ||
                              '';
      const location_address = propertyToLoad.location_address || 
                              propertyToLoad.address || 
                              locationObj.address ||
                              '';
      const location_latitude = propertyToLoad.location_latitude || 
                               propertyToLoad.latitude || 
                               locationObj.latitude ||
                               locationObj.lat ||
                               '';
      const location_longitude = propertyToLoad.location_longitude || 
                                propertyToLoad.longitude || 
                                locationObj.longitude ||
                                locationObj.lng ||
                                '';
      
      // Map pricing fields (might be nested in pricing object)
      const pricingObj = propertyToLoad.pricing || {};
      const pricing_market_value = propertyToLoad.pricing_market_value || 
                                   propertyToLoad.marketValue ||
                                   propertyToLoad.market_value ||
                                   pricingObj.marketValue ||
                                   pricingObj.market_value ||
                                   pricingObj.total_value ||
                                   '';
      const pricing_appreciation = propertyToLoad.pricing_appreciation || 
                                   propertyToLoad.appreciation ||
                                   pricingObj.appreciation ||
                                   '';
      const pricing_min_investment = propertyToLoad.pricing_min_investment || 
                                     propertyToLoad.minInvestment ||
                                     propertyToLoad.min_investment ||
                                     pricingObj.minInvestment ||
                                     pricingObj.min_investment ||
                                     '';
      const pricing_expected_roi = propertyToLoad.pricing_expected_roi || 
                                   propertyToLoad.expected_roi ||
                                   propertyToLoad.expectedROI ||
                                   pricingObj.expected_roi ||
                                   pricingObj.expectedROI ||
                                   '';
      
      // Map tokenization fields (might be nested in tokenization object)
      const tokenObj = propertyToLoad.tokenization || {};
      const tokenization_available_tokens = propertyToLoad.tokenization_available_tokens || 
                                            propertyToLoad.availableTokens ||
                                            propertyToLoad.available_tokens ||
                                            tokenObj.availableTokens ||
                                            tokenObj.available_tokens ||
                                            propertyToLoad.totalTokens ||
                                            1000;
      const tokenization_price_per_token = propertyToLoad.tokenization_price_per_token || 
                                           propertyToLoad.pricePerToken ||
                                           propertyToLoad.price_per_token ||
                                           tokenObj.pricePerToken ||
                                           tokenObj.price_per_token ||
                                           '';
      const tokenization_token_price = propertyToLoad.tokenization_token_price || 
                                       propertyToLoad.tokenPrice ||
                                       propertyToLoad.token_price ||
                                       tokenObj.tokenPrice ||
                                       tokenObj.token_price ||
                                       '';
      
      console.log('📍 Location fields mapped:', { location_city, location_state, location_country, location_address, location_latitude, location_longitude });
      console.log('💰 Pricing fields mapped:', { pricing_market_value, pricing_appreciation, pricing_min_investment, pricing_expected_roi });
      console.log('🪙 Tokenization fields mapped:', { tokenization_available_tokens, tokenization_price_per_token, tokenization_token_price });
      
      // Map organizationId (could be organizationId, organization_id, or organization.displayCode)
      // The backend might store UUID but form dropdown uses displayCode
      let rawOrgId = propertyToLoad.organizationId || 
                     propertyToLoad.organization_id || 
                     propertyToLoad.organization?.displayCode ||
                     propertyToLoad.organization?.id ||
                     '';
      
      // Try to find matching organization and use its displayCode for the dropdown
      let organizationId = rawOrgId;
      if (organizations.length > 0 && rawOrgId) {
        // First try to find by displayCode, then by id
        let matchedOrg = organizations.find(org => 
          org.displayCode === rawOrgId || 
          org.id === rawOrgId ||
          org.displayCode === rawOrgId?.toString() ||
          org.id === rawOrgId?.toString()
        );
        if (matchedOrg) {
          organizationId = matchedOrg.displayCode || matchedOrg.id;
          console.log('✅ Matched organization:', matchedOrg.displayCode || matchedOrg.id, 'from raw:', rawOrgId);
        } else {
          console.warn('⚠️ Could not find organization matching:', rawOrgId);
          // If no match found, still use rawOrgId (might be a valid ID that's not in the list)
          organizationId = rawOrgId;
        }
      } else if (rawOrgId && organizations.length === 0) {
        // Organizations not loaded yet, but we have a rawOrgId - use it for now
        console.log('⏳ Organizations not loaded yet, using rawOrgId:', rawOrgId);
        organizationId = rawOrgId;
      }
      console.log('🏢 Organization ID for form:', organizationId, '(raw:', rawOrgId, ')');
      
      // Map construction progress
      const construction_progress = (propertyToLoad.construction_progress !== undefined && propertyToLoad.construction_progress !== null && propertyToLoad.construction_progress !== '')
        ? String(propertyToLoad.construction_progress)
        : (propertyToLoad.constructionProgress !== undefined && propertyToLoad.constructionProgress !== null && propertyToLoad.constructionProgress !== '')
          ? String(propertyToLoad.constructionProgress)
          : (propertyToLoad.progress !== undefined && propertyToLoad.progress !== null && propertyToLoad.progress !== '')
            ? String(propertyToLoad.progress)
            : '';
      
      // Map expected ROI - preserve empty if not set
      const expectedROI = (propertyToLoad.expectedROI !== undefined && propertyToLoad.expectedROI !== null && propertyToLoad.expectedROI !== '')
        ? String(propertyToLoad.expectedROI)
        : (propertyToLoad.expected_roi !== undefined && propertyToLoad.expected_roi !== null && propertyToLoad.expected_roi !== '')
          ? String(propertyToLoad.expected_roi)
          : (propertyToLoad.roi !== undefined && propertyToLoad.roi !== null && propertyToLoad.roi !== '')
            ? String(propertyToLoad.roi)
            : '';
      
      // Map total value - preserve empty if not set
      const totalValueUSDT = (propertyToLoad.totalValueUSDT !== undefined && propertyToLoad.totalValueUSDT !== null && propertyToLoad.totalValueUSDT !== '') 
        ? String(propertyToLoad.totalValueUSDT)
        : (propertyToLoad.total_value_usdt !== undefined && propertyToLoad.total_value_usdt !== null && propertyToLoad.total_value_usdt !== '')
          ? String(propertyToLoad.total_value_usdt)
          : (propertyToLoad.totalValue !== undefined && propertyToLoad.totalValue !== null && propertyToLoad.totalValue !== '')
            ? String(propertyToLoad.totalValue)
            : (propertyToLoad.total_value !== undefined && propertyToLoad.total_value !== null && propertyToLoad.total_value !== '')
              ? String(propertyToLoad.total_value)
              : (pricingObj.totalValue !== undefined && pricingObj.totalValue !== null && pricingObj.totalValue !== '')
                ? String(pricingObj.totalValue)
                : '';
      
      // Map total tokens - preserve empty if not set
      const totalTokens = (propertyToLoad.totalTokens !== undefined && propertyToLoad.totalTokens !== null && propertyToLoad.totalTokens !== '')
        ? String(propertyToLoad.totalTokens)
        : (propertyToLoad.total_tokens !== undefined && propertyToLoad.total_tokens !== null && propertyToLoad.total_tokens !== '')
          ? String(propertyToLoad.total_tokens)
          : (tokenObj.totalTokens !== undefined && tokenObj.totalTokens !== null && tokenObj.totalTokens !== '')
            ? String(tokenObj.totalTokens)
            : (tokenObj.total_tokens !== undefined && tokenObj.total_tokens !== null && tokenObj.total_tokens !== '')
              ? String(tokenObj.total_tokens)
              : '';
      
      // Map property details
      const floors = propertyToLoad.floors || propertyToLoad.totalFloors || propertyToLoad.total_floors || '';
      const total_units = propertyToLoad.total_units || propertyToLoad.totalUnits || propertyToLoad.units || '';
      const project_type = propertyToLoad.project_type || propertyToLoad.projectType || '';
      
      // Map dates
      const start_date = propertyToLoad.start_date || propertyToLoad.startDate || '';
      const expected_completion = propertyToLoad.expected_completion || propertyToLoad.expectedCompletion || propertyToLoad.completion_date || '';
      const handover_date = propertyToLoad.handover_date || propertyToLoad.handoverDate || '';
      
      // Map specifications
      const bedrooms = propertyToLoad.bedrooms || propertyToLoad.beds || 2;
      const bathrooms = propertyToLoad.bathrooms || propertyToLoad.baths || 2;
      const area_sqm = propertyToLoad.area_sqm || propertyToLoad.area || propertyToLoad.size || 100;
      const appreciation_percentage = propertyToLoad.appreciation_percentage || propertyToLoad.appreciation || pricing_appreciation || 20;
      
      console.log('🏗️ Property details mapped:', { construction_progress, floors, total_units, project_type });
      console.log('📅 Dates mapped:', { start_date, expected_completion, handover_date });
      console.log('🏠 Specifications mapped:', { bedrooms, bathrooms, area_sqm, appreciation_percentage });
      
      // Load all form data from property
      setFormData({
        // Required backend fields
        organizationId: organizationId,
        type: propertyToLoad.type || 'residential',
        status: propertyToLoad.status || 'active',
        totalValueUSDT: totalValueUSDT,
        totalTokens: totalTokens,
        expectedROI: expectedROI,
        // Calculate full ROI: if construction is 100%, full ROI = expected ROI
        // Otherwise, full ROI = expected ROI / (construction progress / 100)
        fullROI: (() => {
          const progress = parseFloat(construction_progress);
          const roi = parseFloat(expectedROI);
          if (!isNaN(progress) && !isNaN(roi)) {
            if (progress === 100) {
              return String(roi);
            } else if (progress > 0 && roi > 0) {
              return String((roi / (progress / 100)).toFixed(2));
            }
          }
          return expectedROI || ''; // Preserve empty if not set
        })(),
        
        // Basic information
        title: propertyToLoad.title || propertyToLoad.name || '',
        slug: propertyToLoad.slug || '',
        description: propertyToLoad.description || '',
        short_description: propertyToLoad.short_description || propertyToLoad.shortDescription || propertyToLoad.summary || '',
        
        // Location - map from database format to form format
        location_address: location_address,
        location_city: location_city,
        location_state: location_state,
        location_country: location_country,
        location_latitude: location_latitude ? String(location_latitude) : '',
        location_longitude: location_longitude ? String(location_longitude) : '',
        
        // Property details
        property_type: propertyToLoad.property_type || propertyToLoad.propertyType || propertyToLoad.type || 'residential',
        project_type: project_type,
        floors: floors ? String(floors) : '',
        total_units: total_units ? String(total_units) : '',
        construction_progress: construction_progress,
        start_date: start_date,
        expected_completion: expected_completion,
        handover_date: handover_date,
        
        // Pricing - use mapped variables
        pricing_total_value: totalValueUSDT ? String(totalValueUSDT) : '',
        pricing_market_value: pricing_market_value ? String(pricing_market_value) : '',
        pricing_appreciation: pricing_appreciation ? String(pricing_appreciation) : '',
        pricing_expected_roi: pricing_expected_roi ? String(pricing_expected_roi) : '',
        pricing_min_investment: pricing_min_investment ? String(pricing_min_investment) : '',
        
        // Tokenization - use mapped variables
        tokenization_total_tokens: totalTokens,
        tokenization_available_tokens: tokenization_available_tokens,
        tokenization_price_per_token: tokenization_price_per_token ? String(tokenization_price_per_token) : '',
        tokenization_token_price: tokenization_token_price ? String(tokenization_token_price) : '',
        
        // Specifications - use mapped variables
        bedrooms: bedrooms,
        bathrooms: bathrooms,
        area_sqm: area_sqm,
        is_rented: propertyToLoad.is_rented || propertyToLoad.isRented || false,
        appreciation_percentage: appreciation_percentage,
        
        // Features and amenities (extracted from nested structure)
        features: Array.isArray(propertyToLoad.features) ? propertyToLoad.features : [],
        amenities: amenities,
        unit_types: unit_types,
        
        // Documents - new object structure: { brochure, floorPlan, compliance }
        documents: (() => {
          const docs = propertyToLoad.documents;
          if (!docs) {
            return { brochure: null, floorPlan: null, compliance: [] };
          }
          // If it's the old array format, convert it
          if (Array.isArray(docs)) {
            // Try to map old array to new structure
            const brochure = docs.find(d => d.type === 'brochure' || d.name?.toLowerCase().includes('brochure'));
            const floorPlan = docs.find(d => d.type === 'floor_plan' || d.type === 'floor-plan' || d.name?.toLowerCase().includes('floor'));
            const compliance = docs.filter(d => 
              d.type === 'compliance' || 
              d.type === 'legal' || 
              d.type === 'noc' ||
              (d.name?.toLowerCase().includes('permit') || d.name?.toLowerCase().includes('clearance'))
            );
            return {
              brochure: brochure ? {
                url: brochure.url,
                name: brochure.name || 'Brochure',
                notes: brochure.notes || '',
                uploadedAt: brochure.uploadedAt || new Date().toISOString(),
                uploadedBy: brochure.uploadedBy || 'admin'
              } : null,
              floorPlan: floorPlan ? {
                url: floorPlan.url,
                version: floorPlan.version || 'A',
                mimeType: floorPlan.mimeType || 'application/pdf'
              } : null,
              compliance: compliance.map(c => ({
                url: c.url,
                type: c.type === 'compliance' ? c.name : c.type,
                issuedAt: c.issuedAt || '',
                issuedBy: c.issuedBy || ''
              }))
            };
          }
          // If it's already the new object structure, use it
          if (typeof docs === 'object' && !Array.isArray(docs)) {
            return {
              brochure: docs.brochure || null,
              floorPlan: docs.floorPlan || null,
              compliance: Array.isArray(docs.compliance) ? docs.compliance : []
            };
          }
          return { brochure: null, floorPlan: null, compliance: [] };
        })(),
        
        // Property features
        property_features: Array.isArray(propertyToLoad.property_features) ? propertyToLoad.property_features : [],
        
        // Images (parsed from JSON string)
        images: imagesArray,
        
        // Status
        is_active: propertyToLoad.is_active !== undefined ? propertyToLoad.is_active : (propertyToLoad.status === 'active'),
        is_featured: propertyToLoad.is_featured || false,
        sort_order: propertyToLoad.sort_order || 0,
        
        // Not sent to backend but kept for form state
        investment_stats: propertyToLoad.investment_stats || {
          totalInvestors: 0,
          totalInvestment: 0,
          averageInvestment: 0
        },
        listing_price_formatted: propertyToLoad.listing_price_formatted || '$0'
      });
      
      console.log('✅ ====== FORM DATA LOADED ======');
      
      // Load SEO data
      const seoObj = propertyToLoad.seo || {};
      if (propertyToLoad.seo || propertyToLoad.seoTitle || propertyToLoad.seo_title) {
        setSeoData({
          title: seoObj.title || propertyToLoad.seoTitle || propertyToLoad.seo_title || '',
          description: seoObj.description || propertyToLoad.seoDescription || propertyToLoad.seo_description || '',
          keywords: seoObj.keywords || propertyToLoad.seoKeywords || propertyToLoad.seo_keywords || ''
        });
      } else {
        setSeoData({ title: '', description: '', keywords: '' });
      }
      
    console.log('✅ Property data loaded into form');
    
    // CRITICAL: Mark this property's form data as loaded IMMEDIATELY
    // This prevents ANY future resets for this property
    formDataLoadedForPropertyRef.current = currentPropertyId;
    console.log('📌 Form data marked as loaded for property:', currentPropertyId);
    console.log('🔒 Form is now LOCKED - no more resets will happen for this property');
  }, [property?.id, property?.displayCode, fullPropertyData?.id, fullPropertyData?.displayCode]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setFormData(prev => {
      const newData = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      };

      // Re-validate token tiers when property totalTokens changes
      if (name === 'totalTokens' && showTokenTierForm && tokenTierFormData.totalTokens) {
        setTimeout(() => {
          validateTokenTierCount(tokenTierFormData.totalTokens);
        }, 0);
      }

      // Re-validate token tiers when property totalValueUSDT changes
      if (name === 'totalValueUSDT' && showTokenTierForm && tokenTierFormData.totalValueUSDT) {
        setTimeout(() => {
          validateTokenTierValue(tokenTierFormData.totalValueUSDT);
        }, 0);
      }

      // Auto-sync pricing_total_value from totalValueUSDT
      if (name === 'totalValueUSDT' && value) {
        const totalValue = parseFloat(value);
        if (!isNaN(totalValue)) {
          newData.pricing_total_value = totalValue.toString();
        }
      }
      
      // Auto-sync tokenization_total_tokens from totalTokens
      if (name === 'totalTokens' && value) {
        const totalTokens = parseFloat(value);
        if (!isNaN(totalTokens)) {
          newData.tokenization_total_tokens = totalTokens;
          // If Available Tokens exceeds new Total Tokens, cap it at Total Tokens
          const currentAvailable = parseFloat(prev.tokenization_available_tokens) || 0;
          if (currentAvailable > totalTokens) {
            newData.tokenization_available_tokens = totalTokens;
          }
        }
      }
      
      // Validate Available Tokens doesn't exceed Total Tokens
      if (name === 'tokenization_available_tokens' && value) {
        const availableTokens = parseFloat(value);
        const totalTokens = parseFloat(prev.totalTokens) || parseFloat(prev.tokenization_total_tokens) || 0;
        if (!isNaN(availableTokens) && !isNaN(totalTokens)) {
          if (availableTokens > totalTokens) {
            // Cap at Total Tokens
            newData.tokenization_available_tokens = totalTokens;
          } else if (availableTokens < 0) {
            // Don't allow negative values
            newData.tokenization_available_tokens = '';
          }
        }
      }
      
      // Auto-calculate Expected ROI based on Construction Progress
      if (name === 'construction_progress' && value !== undefined) {
        const constructionProgress = parseFloat(value);
        const fullROI = parseFloat(prev.fullROI) || parseFloat(prev.expectedROI) || 0;
        if (!isNaN(constructionProgress) && !isNaN(fullROI) && fullROI > 0) {
          // Calculate ROI as percentage of construction progress
          const calculatedROI = (constructionProgress / 100) * fullROI;
          newData.expectedROI = parseFloat(calculatedROI.toFixed(2));
          newData.pricing_expected_roi = calculatedROI.toFixed(2).toString();
        } else if (constructionProgress === 100 && fullROI > 0) {
          // At 100%, ROI equals full ROI
          newData.expectedROI = fullROI;
          newData.pricing_expected_roi = fullROI.toString();
        }
      }
      
      // When full ROI is set, recalculate expected ROI based on construction progress
      if (name === 'fullROI' && value) {
        const fullROI = parseFloat(value);
        const constructionProgress = parseFloat(prev.construction_progress) || 0;
        if (!isNaN(fullROI) && !isNaN(constructionProgress)) {
          const calculatedROI = (constructionProgress / 100) * fullROI;
          newData.expectedROI = parseFloat(calculatedROI.toFixed(2));
          newData.pricing_expected_roi = calculatedROI.toFixed(2).toString();
        }
      }
      
      // Auto-sync pricing_expected_roi from expectedROI (for manual edits)
      if (name === 'expectedROI' && value) {
        const expectedROI = parseFloat(value);
        if (!isNaN(expectedROI)) {
          newData.pricing_expected_roi = expectedROI.toString();
          // If construction is 100%, update full ROI
          const constructionProgress = parseFloat(prev.construction_progress) || 0;
          if (constructionProgress === 100) {
            newData.fullROI = expectedROI;
          }
        }
      }

      // Auto-calculate Expected ROI when Total Value changes
      if (name === 'pricing_total_value' && value) {
        const totalValue = parseFloat(value);
        if (totalValue > 0) {
          // Calculate ROI based on total value (higher value = higher ROI)
          const calculatedROI = Math.min(25, Math.max(5, (totalValue / 1000000000) * 2 + 8)).toFixed(1);
          newData.pricing_expected_roi = calculatedROI;
        }
      }

      // Auto-calculate Price Per Token when Total Tokens changes
      if (name === 'totalTokens' && value && prev.totalValueUSDT) {
        const totalTokens = parseFloat(value);
        const totalValue = parseFloat(prev.totalValueUSDT);
        if (totalTokens > 0 && totalValue > 0) {
          const pricePerToken = (totalValue / totalTokens).toFixed(2);
          newData.tokenization_price_per_token = pricePerToken;
          newData.tokenization_token_price = pricePerToken;
        }
      }

      // Auto-calculate Price Per Token when Total Value changes (if Total Tokens is set)
      if (name === 'totalValueUSDT' && value && prev.totalTokens) {
        const totalValue = parseFloat(value);
        const totalTokens = parseFloat(prev.totalTokens);
        if (totalValue > 0 && totalTokens > 0) {
          const pricePerToken = (totalValue / totalTokens).toFixed(2);
          newData.tokenization_price_per_token = pricePerToken;
          newData.tokenization_token_price = pricePerToken;
        }
      }
      
      // Auto-calculate Price Per Token when pricing_total_value changes (if tokenization_total_tokens is set)
      if (name === 'pricing_total_value' && value && prev.tokenization_total_tokens) {
        const totalValue = parseFloat(value);
        const totalTokens = parseFloat(prev.tokenization_total_tokens);
        if (totalValue > 0 && totalTokens > 0) {
          const pricePerToken = (totalValue / totalTokens).toFixed(2);
          newData.tokenization_price_per_token = pricePerToken;
          newData.tokenization_token_price = pricePerToken;
        }
      }
      
      // Auto-calculate Price Per Token when tokenization_total_tokens changes (if pricing_total_value is set)
      if (name === 'tokenization_total_tokens' && value && prev.pricing_total_value) {
        const totalTokens = parseFloat(value);
        const totalValue = parseFloat(prev.pricing_total_value);
        if (totalTokens > 0 && totalValue > 0) {
          const pricePerToken = (totalValue / totalTokens).toFixed(2);
          newData.tokenization_price_per_token = pricePerToken;
          newData.tokenization_token_price = pricePerToken;
        }
      }

      // Auto-generate Unit Types when Total Units changes
      if (name === 'total_units' && value) {
        const totalUnits = parseInt(value);
        if (totalUnits > 0 && totalUnits <= 10) {
          const generatedUnitTypes = [];
          for (let i = 1; i <= totalUnits; i++) {
            generatedUnitTypes.push({
              type: `${i} Bedroom`,
              size: `${800 + (i * 400)} sq ft`,
              count: `${i}`
            });
          }
          newData.unit_types = generatedUnitTypes;
        }
      }

      return newData;
    });
  };

  const handleLocationChange = (latitude, longitude) => {
    setFormData(prev => ({
      ...prev,
      location_latitude: latitude.toFixed(6),
      location_longitude: longitude.toFixed(6)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    console.log('📝 ====== FORM SUBMISSION STARTED ======');
    console.log('📊 Full form data:', formData);
    
    // Comprehensive validation with detailed error messages
    const validationErrors = [];
    
    // Required backend fields
    if (!formData.organizationId || formData.organizationId.trim() === '') {
      validationErrors.push('Organization ID is required');
    }
    if (!formData.type || formData.type.trim() === '') {
      validationErrors.push('Asset Type is required');
    }
    if (!formData.totalValueUSDT || parseFloat(formData.totalValueUSDT) <= 0) {
      validationErrors.push('Total Value (USDT) must be greater than 0');
    }
    // If token tiers are provided, calculate totals from tiers; otherwise require fields
    if (tokenTiers.length > 0) {
      // Validate token tiers
      if (tokenTiers.length === 0) {
        validationErrors.push('At least one token tier is required');
      }
      tokenTiers.forEach((tier, index) => {
        // Check for either totalValueUSDT (new format) or pricePerTokenUSDT (old format)
        const hasValue = tier.totalValueUSDT !== undefined || tier.pricePerTokenUSDT !== undefined;
        if (!tier.name || !tier.tokenSymbol || !hasValue || !tier.totalTokens || !tier.expectedROI) {
          validationErrors.push(`Token tier ${index + 1} is missing required fields`);
        }
      });

      // Validate that tier values sum to property totalValueUSDT
      if (tokenTiers.length > 0) {
        const totalValueFromTiers = tokenTiers.reduce((sum, tier) => {
          // Calculate tier value: use totalValueUSDT if available, otherwise calculate from pricePerTokenUSDT
          const tierValue = tier.totalValueUSDT !== undefined 
            ? (parseFloat(tier.totalValueUSDT) || 0)
            : (parseFloat(tier.pricePerTokenUSDT) || 0) * (parseFloat(tier.totalTokens) || 0);
          return sum + tierValue;
        }, 0);
        const propertyTotalValue = parseFloat(formData.totalValueUSDT) || 0;
        if (propertyTotalValue > 0 && Math.abs(totalValueFromTiers - propertyTotalValue) > 0.01) {
          validationErrors.push(
            `Token tier total value (${totalValueFromTiers.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) must equal property total value (${propertyTotalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`
          );
        }
      }
    } else {
      // Legacy: require totalTokens and expectedROI if no token tiers
      if (!formData.totalTokens || parseInt(formData.totalTokens) <= 0) {
        validationErrors.push('Total Tokens must be greater than 0 (or add token tiers)');
      }
      if (formData.expectedROI === undefined || formData.expectedROI === null || formData.expectedROI === '') {
        validationErrors.push('Expected ROI is required (or add token tiers)');
      }
    }
    if (!formData.status || formData.status.trim() === '') {
      validationErrors.push('Status is required');
    }
    
    // Required display fields
    if (!formData.title || formData.title.trim() === '') {
      validationErrors.push('Asset Title is required');
    }
    if (!formData.description || formData.description.trim() === '') {
      validationErrors.push('Description is required');
    }
    
    // Location validation - Only city and country are in DB
    if (!formData.location_city || formData.location_city.trim() === '') {
      validationErrors.push('Custody city is required');
    }
    if (!formData.location_country || formData.location_country.trim() === '') {
      validationErrors.push('Custody country is required');
    }
    // COMMENTED OUT: Address and State validation - Not in DB
    // if (!formData.location_address || formData.location_address.trim() === '') {
    //   validationErrors.push('Address is required');
    // }
    // if (!formData.location_state || formData.location_state.trim() === '') {
    //   validationErrors.push('State is required');
    // }
    
    // Check if any documents exist
    const hasDocuments = formData.documents?.brochure || 
                         formData.documents?.floorPlan || 
                         (Array.isArray(formData.documents?.compliance) && formData.documents.compliance.length > 0);
    if (!hasDocuments) {
      validationErrors.push('At least one document (brochure, floor plan, or compliance) is required');
    }
    
    // Show validation errors if any
    if (validationErrors.length > 0) {
      const errorMessage = 'Please fix: ' + validationErrors.join(', ');
      toast.error(errorMessage);
      console.error('❌ Validation errors:', validationErrors);
      return;
    }
    
    console.log('✅ All validations passed');
    
    // Format data to match backend structure - ONLY FIELDS IN DATABASE
    const selectedTypeOption = ASSET_TYPE_OPTIONS.find((o) => o.value === formData.type);
    const finalData = {
      // Required backend fields (ensure they are numbers, not strings)
      organizationId: formData.organizationId,
      assetCategory: selectedTypeOption?.categoryKey || 'real_estate',
      type: formData.type,
      status: formData.status,
      totalValueUSDT: parseFloat(formData.totalValueUSDT) || 0,
      // Calculate totalTokens from token tiers if provided, otherwise use formData
      totalTokens: tokenTiers.length > 0 
        ? tokenTiers.reduce((sum, tier) => sum + (parseFloat(tier.totalTokens) || 0), 0)
        : (parseInt(formData.totalTokens) || 1000),
      // Use average ROI from token tiers if provided, otherwise use formData
      expectedROI: tokenTiers.length > 0
        ? (tokenTiers.reduce((sum, tier) => sum + (parseFloat(tier.expectedROI) || 0), 0) / tokenTiers.length)
        : (parseFloat(formData.expectedROI) || 0),
      
      // Basic information - ensure required fields are not empty
      title: (formData.title && formData.title.trim()) || '',
      slug: (formData.slug && formData.slug.trim()) || '',
      description: (formData.description && formData.description.trim()) || '',
      
      // Location - Only city and country are in DB
      city: (formData.location_city && formData.location_city.trim()) || 'Karachi',
      country: (formData.location_country && formData.location_country.trim()) || 'Pakistan',
      
      // Features - backend expects object with amenities array
      features: {
        amenities: formData.amenities || [],
        unit_types: formData.unit_types || []
      },
      
      // Images - backend expects object (JSONB), not array
      // Backend validation requires object format
      images: (() => {
        // If already an object (from edit mode), keep it
        if (formData.images && typeof formData.images === 'object' && !Array.isArray(formData.images)) {
          return formData.images;
        }
        // Convert array to object format
        const imageArray = Array.isArray(formData.images) ? formData.images : [];
        if (imageArray.length === 0) {
          return {}; // Empty object if no images (backend requires object, not array)
        }
        // Convert array to object - backend expects object with array inside
        return { urls: imageArray };
      })(),
      
      // Documents - new object structure: only include fields that have data
      documents: (() => {
        const docs = formData.documents || { brochure: null, floorPlan: null, compliance: [] };
        
        // Build the object structure - only include fields with actual data
        const result = {};
        
        // Add brochure only if it exists and has a URL
        if (docs.brochure && docs.brochure.url) {
          result.brochure = {
            url: docs.brochure.url,
            name: docs.brochure.name || 'Brochure',
            notes: docs.brochure.notes || '',
            uploadedAt: docs.brochure.uploadedAt || new Date().toISOString(),
            uploadedBy: docs.brochure.uploadedBy || 'admin'
          };
        }
        
        // Add floorPlan only if it exists and has a URL
        if (docs.floorPlan && docs.floorPlan.url) {
          result.floorPlan = {
            url: docs.floorPlan.url,
            version: docs.floorPlan.version || 'A',
            mimeType: docs.floorPlan.mimeType || 'application/pdf'
          };
        }
        
        // Add compliance array only if it has items
        if (Array.isArray(docs.compliance) && docs.compliance.length > 0) {
          const validCompliance = docs.compliance
            .filter(c => c && c.url) // Only include valid compliance docs
            .map(c => ({
              url: c.url,
              type: c.type || 'Compliance Document',
              issuedAt: c.issuedAt || '',
              issuedBy: c.issuedBy || ''
            }));
          
          // Only add compliance if there are valid items
          if (validCompliance.length > 0) {
            result.compliance = validCompliance;
          }
        }
        
        // Return empty object if no documents, or only include fields with data
        return result;
      })()
      
      // COMMENTED OUT: Fields not in database schema (commented out in form, so not sent)
      // short_description: (formData.short_description && formData.short_description.trim()) || '',
      // address: (formData.location_address && formData.location_address.trim()) || '',
      // state: (formData.location_state && formData.location_state.trim()) || 'Sindh',
      // latitude: formData.location_latitude ? parseFloat(formData.location_latitude) : null,
      // longitude: formData.location_longitude ? parseFloat(formData.location_longitude) : null,
      // property_type: formData.property_type || 'residential',
      // project_type: (formData.project_type && formData.project_type.trim()) || null,
      // floors: formData.floors ? String(formData.floors).trim() : null,
      // total_units: formData.total_units ? String(formData.total_units).trim() : null,
      // construction_progress: parseInt(formData.construction_progress) || 0,
      // start_date: (formData.start_date && formData.start_date.trim()) || null,
      // expected_completion: (formData.expected_completion && formData.expected_completion.trim()) || null,
      // handover_date: (formData.handover_date && formData.handover_date.trim()) || null,
      // pricing_total_value: formData.pricing_total_value ? String(formData.pricing_total_value).trim() : null,
      // pricing_market_value: formData.pricing_market_value ? String(formData.pricing_market_value).trim() : null,
      // pricing_appreciation: formData.pricing_appreciation ? String(formData.pricing_appreciation).trim() : null,
      // pricing_expected_roi: formData.pricing_expected_roi ? String(formData.pricing_expected_roi).trim() : null,
      // pricing_min_investment: formData.pricing_min_investment ? String(formData.pricing_min_investment).trim() : null,
      // tokenization_total_tokens: parseInt(formData.tokenization_total_tokens) || parseInt(formData.totalTokens) || 1000,
      // tokenization_available_tokens: Math.min(
      //   parseInt(formData.tokenization_available_tokens) || parseInt(formData.totalTokens) || 1000,
      //   parseInt(formData.totalTokens) || 1000
      // ),
      // tokenization_price_per_token: formData.tokenization_price_per_token ? String(formData.tokenization_price_per_token).trim() : null,
      // tokenization_token_price: formData.tokenization_token_price ? String(formData.tokenization_token_price).trim() : null,
      // bedrooms: parseInt(formData.bedrooms) || 0,
      // bathrooms: parseInt(formData.bathrooms) || 0,
      // area_sqm: parseFloat(formData.area_sqm) || 0,
      // is_rented: formData.is_rented || false,
      // appreciation_percentage: parseFloat(formData.appreciation_percentage) || 0,
      // property_features: formData.property_features || [],
      // seo: seoData || {},
      // is_active: formData.is_active !== undefined ? formData.is_active : true,
      // is_featured: formData.is_featured || false,
      // sort_order: parseInt(formData.sort_order) || 0
    };
    
    // No need to delete fields - we're only sending DB fields now
    // All commented-out fields are already excluded from finalData
    
    // For documents - keep it if it has data, otherwise don't send it (backend might handle null/undefined)
    // Don't send empty documents object as it might cause validation errors
    if (finalData.documents && Object.keys(finalData.documents).length === 0) {
      delete finalData.documents;
    }
    
    // Remove null/empty optional fields to avoid validation issues
    // But keep required fields even if they're empty strings (backend will validate)
    const cleanData = { ...finalData };
    
    // Ensure images field is always an object (not array) - backend validation requires object
    // Backend expects JSONB object, so convert array to object format
    if (Array.isArray(cleanData.images)) {
      const imageArray = cleanData.images;
      if (imageArray.length === 0) {
        cleanData.images = {}; // Empty object if no images (backend requires object, not array)
      } else {
        // Convert array to object - backend expects object format
        // Try { urls: [...] } format
        cleanData.images = { urls: imageArray };
      }
    } else if (!cleanData.images || typeof cleanData.images !== 'object') {
      // If not an object, make it an empty object
      cleanData.images = {};
    }
    const requiredFields = ['organizationId', 'type', 'status', 'totalValueUSDT', 'totalTokens', 
                           'expectedROI', 'title', 'description', 'city', 'country', 'images'];
    
    // Calculate missing required DB fields
    // availableTokens = totalTokens - soldTokens (for now, assume all are available initially)
    if (!cleanData.availableTokens && cleanData.totalTokens) {
      cleanData.availableTokens = cleanData.totalTokens; // Initially all tokens are available
    }
    
    // pricePerTokenUSDT = totalValueUSDT / totalTokens
    if (!cleanData.pricePerTokenUSDT && cleanData.totalValueUSDT && cleanData.totalTokens) {
      cleanData.pricePerTokenUSDT = parseFloat((cleanData.totalValueUSDT / cleanData.totalTokens).toFixed(6));
    }
    
    Object.keys(cleanData).forEach(key => {
      const value = cleanData[key];
      
      // Skip required fields - they should be sent even if empty
      if (requiredFields.includes(key)) {
        return;
      }
      
      // Remove null, undefined, empty strings, and empty arrays (except images which is handled above)
      if (value === null || value === undefined || 
          (typeof value === 'string' && value.trim() === '') ||
          (Array.isArray(value) && value.length === 0)) {
        delete cleanData[key];
      }
    });
    
    // Ensure numeric fields are actually numbers, not strings
    if (cleanData.totalValueUSDT !== undefined) {
      cleanData.totalValueUSDT = parseFloat(cleanData.totalValueUSDT) || 0;
    }
    if (cleanData.totalTokens !== undefined) {
      cleanData.totalTokens = parseInt(cleanData.totalTokens) || 0;
    }
    if (cleanData.expectedROI !== undefined) {
      cleanData.expectedROI = parseFloat(cleanData.expectedROI) || 0;
    }
    
    // Use cleaned data
    const dataToSend = cleanData;
    
    // Log all data being sent
    console.log('📤 ====== FINAL DATA BEING SENT TO BACKEND ======');
    console.log('📤 Cleaned data to send:', JSON.stringify(dataToSend, null, 2));
    
    // Log required fields specifically
    console.log('🔍 Required fields check:', {
      organizationId: dataToSend.organizationId,
      type: dataToSend.type,
      status: dataToSend.status,
      totalValueUSDT: dataToSend.totalValueUSDT,
      totalTokens: dataToSend.totalTokens,
      expectedROI: dataToSend.expectedROI,
      title: dataToSend.title,
      description: dataToSend.description,
      address: dataToSend.address,
      city: dataToSend.city,
      state: dataToSend.state,
      country: dataToSend.country,
      hasDocuments: !!dataToSend.documents && Object.keys(dataToSend.documents).length > 0
    });
    
    console.log('🖼️ Images being sent:', {
      count: dataToSend.images?.length || 0,
      isArray: Array.isArray(dataToSend.images),
      value: dataToSend.images
    });
    
    console.log('📄 Documents being sent:', {
      hasBrochure: !!dataToSend.documents?.brochure,
      hasFloorPlan: !!dataToSend.documents?.floorPlan,
      complianceCount: dataToSend.documents?.compliance?.length || 0,
      value: dataToSend.documents
    });
    
    // Verify documents format for JSONB compatibility (new object structure)
    // Only check if documents object has any keys (meaning at least one document type exists)
    const hasDocumentsInData = dataToSend.documents && Object.keys(dataToSend.documents).length > 0;
    if (hasDocumentsInData) {
      // Validate structure
      const isValidFormat = (
        (!dataToSend.documents.brochure || (dataToSend.documents.brochure.url && dataToSend.documents.brochure.name)) &&
        (!dataToSend.documents.floorPlan || dataToSend.documents.floorPlan.url) &&
        (!Array.isArray(dataToSend.documents.compliance) || dataToSend.documents.compliance.every(c => c && c.url && c.type))
      );
      console.log('✅ Documents format valid for JSONB:', isValidFormat);
      if (!isValidFormat) {
        console.error('❌ Invalid document format! Each document must have: name, url, type');
        console.error('❌ Documents that failed validation:', dataToSend.documents);
      } else {
        console.log('✅ All documents are properly formatted for backend JSONB column');
      }
    } else {
      // For updates, documents might already exist in backend, so don't require them
      if (!property) {
        // Only require documents for new properties
        console.error('❌ CRITICAL: No documents found! Documents are required for new properties.');
        toast.error('Documents are required. Please add at least one document.');
        return;
      } else {
        console.log('ℹ️ No documents in update - existing documents in backend will be preserved');
      }
    }
    
    // Final validation - ensure required fields are present and valid
    const finalValidationErrors = [];
    if (!dataToSend.organizationId) finalValidationErrors.push('Organization ID is required');
    if (!dataToSend.type) finalValidationErrors.push('Property type is required');
    if (!dataToSend.status) finalValidationErrors.push('Status is required');
    if (!dataToSend.totalValueUSDT || dataToSend.totalValueUSDT <= 0) finalValidationErrors.push('Total Value USDT must be greater than 0');
    // Validate totals - either from token tiers or form fields
    if (tokenTiers.length > 0) {
      const totalTokensFromTiers = tokenTiers.reduce((sum, tier) => sum + (parseFloat(tier.totalTokens) || 0), 0);
      if (totalTokensFromTiers <= 0) {
        finalValidationErrors.push('Token tiers must have at least one token');
      }
      
      // Validate that tier values sum to property totalValueUSDT
      const totalValueFromTiers = tokenTiers.reduce((sum, tier) => {
        // Calculate tier value: use totalValueUSDT if available, otherwise calculate from pricePerTokenUSDT
        const tierValue = tier.totalValueUSDT !== undefined 
          ? (parseFloat(tier.totalValueUSDT) || 0)
          : (parseFloat(tier.pricePerTokenUSDT) || 0) * (parseFloat(tier.totalTokens) || 0);
        return sum + tierValue;
      }, 0);
      const propertyTotalValue = parseFloat(dataToSend.totalValueUSDT) || 0;
      if (propertyTotalValue > 0 && Math.abs(totalValueFromTiers - propertyTotalValue) > 0.01) {
        finalValidationErrors.push(
          `Token tier total value (${totalValueFromTiers.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) must equal property total value (${propertyTotalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`
        );
      }
    } else {
      if (!dataToSend.totalTokens || dataToSend.totalTokens <= 0) finalValidationErrors.push('Total Tokens must be greater than 0 (or add token tiers)');
      if (dataToSend.expectedROI === undefined || dataToSend.expectedROI === null) finalValidationErrors.push('Expected ROI is required (or add token tiers)');
    }
    if (!dataToSend.title || dataToSend.title.trim() === '') finalValidationErrors.push('Title is required');
    if (!dataToSend.description || dataToSend.description.trim() === '') finalValidationErrors.push('Description is required');
    
    if (finalValidationErrors.length > 0) {
      const errorMsg = 'Validation: ' + finalValidationErrors.join(', ');
      toast.error(errorMsg);
      console.error('❌ Validation failed:', finalValidationErrors);
      return;
    }
    
    console.log('✅ ====== SENDING DATA TO BACKEND ======');
    console.log('📤 Final payload:', JSON.stringify(dataToSend, null, 2));
    
    // If creating new property with token tiers, store them to create after property is saved
    if (!property && tokenTiers.length > 0) {
      dataToSend._tokenTiers = tokenTiers;
      console.log(`📦 Attaching ${tokenTiers.length} token tier(s) to property creation`);
    }
    
    // Call onSave - the parent component (PropertiesManagement) will handle token tier creation
    onSave(dataToSend);
  };

  // Helper function to check if a value is empty
  const isEmpty = (value) => {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string' && (value.trim() === '' || value === 'null' || value === 'undefined')) return true;
    // For numbers, only consider 0 as empty if it's explicitly 0 (not a valid value)
    // But we'll allow 0 for some fields, so we'll check more carefully
    if (typeof value === 'number' && isNaN(value)) return true;
    if (Array.isArray(value) && value.length === 0) return true;
    if (typeof value === 'object' && Object.keys(value).length === 0) return true;
    return false;
  };
  
  // Helper to check if a field should be filled (more lenient for edit mode)
  const shouldFill = (value, fieldName) => {
    // Always fill if completely empty
    if (isEmpty(value)) return true;
    
    // For specific fields, also fill if they have default/placeholder values
    const defaultValues = {
      'title': ['', 'Untitled', 'New Property'],
      'description': ['', 'No description'],
      'location_address': ['', 'Address not set'],
      'location_city': ['', 'City not set'],
      'pricing_total_value': ['0', '0.00', ''],
      'pricing_market_value': ['0', '0.00', ''],
      'pricing_min_investment': ['0', '0.00', ''],
      'tokenization_price_per_token': ['0', '0.00', ''],
      'tokenization_token_price': ['0', '0.00', ''],
    };
    
    if (defaultValues[fieldName]) {
      const strValue = String(value).toLowerCase().trim();
      return defaultValues[fieldName].some(def => strValue === def.toLowerCase());
    }
    
    return false;
  };

  const fillRandomValues = () => {
    console.log('🎲 Fill Random Values clicked');
    console.log('📊 Current form data before fill:', formData);
    
    const randomTitles = [
      'Luxury Heights Residency',
      'Golden Gate Apartments',
      'Skyline Towers',
      'Emerald Gardens',
      'Royal Plaza Complex',
      'Diamond Heights',
      'Crystal Residences',
      'Pearl Towers',
      'Sapphire Gardens',
      'Platinum Heights'
    ];
    
    const randomDescriptions = [
      'A premium residential complex offering modern amenities and luxury living in the heart of the city.',
      'State-of-the-art residential development with world-class facilities and breathtaking views.',
      'Exclusive residential project featuring contemporary design and premium lifestyle amenities.',
      'Luxury residential complex with modern architecture and comprehensive lifestyle facilities.',
      'Premium residential development offering sophisticated living with world-class amenities.'
    ];
    
    const randomAddresses = [
      'DHA Phase 8, Karachi',
      'Clifton Block 2, Karachi',
      'Gulshan-e-Iqbal Block 13D, Karachi',
      'North Nazimabad Block H, Karachi',
      'PECHS Block 6, Karachi',
      'Defence Phase 5, Karachi',
      'Malir Cantt, Karachi',
      'Korangi Industrial Area, Karachi'
    ];
    
    const randomPropertyTypes = ['residential', 'commercial'];
    
    const randomTitle = randomTitles[Math.floor(Math.random() * randomTitles.length)];
    const randomDescription = randomDescriptions[Math.floor(Math.random() * randomDescriptions.length)];
    const randomAddress = randomAddresses[Math.floor(Math.random() * randomAddresses.length)];
    const randomPropertyType = randomPropertyTypes[Math.floor(Math.random() * randomPropertyTypes.length)];
    
    // Get random organization from loaded organizations
    const randomOrg = organizations.length > 0 
      ? organizations[Math.floor(Math.random() * organizations.length)]
      : null;
    const orgId = randomOrg ? (randomOrg.displayCode || randomOrg.id) : 'ORG-000001';
    
    // Generate random pricing values (used if existing values are empty)
    const totalValueUSDT = Math.floor(Math.random() * 70000000) + 3500000;
    const totalValue = totalValueUSDT;
    const minInvestment = Math.floor(Math.random() * 1000000) + 100000;
    const roi = (Math.random() * 15 + 5).toFixed(1);
    const totalTokens = Math.floor(Math.random() * 200000) + 10000;
    const availableTokens = Math.floor(totalTokens * (Math.random() * 0.8 + 0.2));
    
    // Generate random dates
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() + Math.floor(Math.random() * 12));
    const completionDate = new Date(startDate);
    completionDate.setMonth(completionDate.getMonth() + Math.floor(Math.random() * 24) + 12);
    
    // Track which fields are being filled
    const filledFields = [];
    
    // ONLY fill empty fields - preserve existing values!
    setFormData(prev => {
      const updated = { ...prev };
      
      // Required backend fields - only fill if empty
      if (shouldFill(prev.organizationId, 'organizationId') || isEmpty(prev.organizationId)) {
        updated.organizationId = orgId;
        filledFields.push('organizationId');
      }
      if (shouldFill(prev.type, 'type') || isEmpty(prev.type)) {
        updated.type = randomPropertyType;
        filledFields.push('type');
      }
      if (shouldFill(prev.status, 'status') || isEmpty(prev.status)) {
        updated.status = 'active';
        filledFields.push('status');
      }
      if (shouldFill(prev.totalValueUSDT, 'totalValueUSDT') || (prev.totalValueUSDT === 0 || isEmpty(prev.totalValueUSDT))) {
        updated.totalValueUSDT = totalValueUSDT;
        filledFields.push('totalValueUSDT');
      }
      if (shouldFill(prev.totalTokens, 'totalTokens') || (prev.totalTokens === 0 || isEmpty(prev.totalTokens))) {
        updated.totalTokens = totalTokens;
        filledFields.push('totalTokens');
      }
      if (shouldFill(prev.expectedROI, 'expectedROI') || (prev.expectedROI === 0 || isEmpty(prev.expectedROI))) {
        updated.expectedROI = parseFloat(roi);
        filledFields.push('expectedROI');
      }
      if (shouldFill(prev.fullROI, 'fullROI') || (prev.fullROI === 0 || isEmpty(prev.fullROI))) {
        updated.fullROI = parseFloat(roi);
        filledFields.push('fullROI');
      }
      
      // Basic information - only fill if empty
      if (shouldFill(prev.title, 'title') || isEmpty(prev.title)) {
        updated.title = randomTitle;
        updated.slug = generateSlug(randomTitle);
        filledFields.push('title');
      }
      if (shouldFill(prev.description, 'description') || isEmpty(prev.description)) {
        updated.description = randomDescription;
        filledFields.push('description');
      }
      if (shouldFill(prev.short_description, 'short_description') || isEmpty(prev.short_description)) {
        updated.short_description = `Premium ${prev.type || randomPropertyType} development in ${randomAddress.split(',')[0]}`;
        filledFields.push('short_description');
      }
      
      // Location - only fill if empty
      if (shouldFill(prev.location_address, 'location_address') || isEmpty(prev.location_address)) {
        updated.location_address = randomAddress;
        filledFields.push('location_address');
      }
      if (shouldFill(prev.location_city, 'location_city') || isEmpty(prev.location_city)) {
        updated.location_city = 'Karachi';
        filledFields.push('location_city');
      }
      if (shouldFill(prev.location_state, 'location_state') || isEmpty(prev.location_state)) {
        updated.location_state = 'Sindh';
        filledFields.push('location_state');
      }
      if (shouldFill(prev.location_country, 'location_country') || isEmpty(prev.location_country)) {
        updated.location_country = 'Pakistan';
        filledFields.push('location_country');
      }
      if (shouldFill(prev.location_latitude, 'location_latitude') || isEmpty(prev.location_latitude)) {
        updated.location_latitude = (24.8 + Math.random() * 0.2).toFixed(6);
        filledFields.push('location_latitude');
      }
      if (shouldFill(prev.location_longitude, 'location_longitude') || isEmpty(prev.location_longitude)) {
        updated.location_longitude = (67.0 + Math.random() * 0.2).toFixed(6);
        filledFields.push('location_longitude');
      }
      
      // Property details - only fill if empty
      if (shouldFill(prev.property_type, 'property_type') || isEmpty(prev.property_type)) {
        updated.property_type = prev.type || randomPropertyType;
        filledFields.push('property_type');
      }
      if (shouldFill(prev.project_type, 'project_type') || isEmpty(prev.project_type)) {
        updated.project_type = ['residential', 'commercial', 'mixed-use', 'residential-commercial', 'retail', 'office'][Math.floor(Math.random() * 6)];
        filledFields.push('project_type');
      }
      if (shouldFill(prev.floors, 'floors') || isEmpty(prev.floors)) {
        updated.floors = Math.floor(Math.random() * 20) + 5;
        filledFields.push('floors');
      }
      if (shouldFill(prev.total_units, 'total_units') || isEmpty(prev.total_units)) {
        updated.total_units = Math.floor(Math.random() * 10) + 1;
        filledFields.push('total_units');
      }
      if (shouldFill(prev.construction_progress, 'construction_progress') || (prev.construction_progress === 0 || isEmpty(prev.construction_progress))) {
        updated.construction_progress = [25, 50, 75, 100][Math.floor(Math.random() * 4)];
        filledFields.push('construction_progress');
      }
      if (shouldFill(prev.start_date, 'start_date') || isEmpty(prev.start_date)) {
        updated.start_date = startDate.toISOString().split('T')[0];
        filledFields.push('start_date');
      }
      if (shouldFill(prev.expected_completion, 'expected_completion') || isEmpty(prev.expected_completion)) {
        updated.expected_completion = completionDate.toISOString().split('T')[0];
        filledFields.push('expected_completion');
      }
      if (shouldFill(prev.handover_date, 'handover_date') || isEmpty(prev.handover_date)) {
        updated.handover_date = new Date(completionDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        filledFields.push('handover_date');
      }
      
      // Pricing - only fill if empty (use existing totalValueUSDT if available)
      const existingTotalValue = prev.totalValueUSDT || totalValue;
      if (shouldFill(prev.pricing_total_value, 'pricing_total_value') || isEmpty(prev.pricing_total_value)) {
        updated.pricing_total_value = existingTotalValue.toString();
        filledFields.push('pricing_total_value');
      }
      if (shouldFill(prev.pricing_market_value, 'pricing_market_value') || isEmpty(prev.pricing_market_value)) {
        updated.pricing_market_value = Math.floor(existingTotalValue * 0.9).toString();
        filledFields.push('pricing_market_value');
      }
      if (shouldFill(prev.pricing_appreciation, 'pricing_appreciation') || isEmpty(prev.pricing_appreciation)) {
        updated.pricing_appreciation = (Math.random() * 20 + 10).toFixed(1);
        filledFields.push('pricing_appreciation');
      }
      if (shouldFill(prev.pricing_expected_roi, 'pricing_expected_roi') || isEmpty(prev.pricing_expected_roi)) {
        updated.pricing_expected_roi = prev.expectedROI || roi;
        filledFields.push('pricing_expected_roi');
      }
      if (shouldFill(prev.pricing_min_investment, 'pricing_min_investment') || isEmpty(prev.pricing_min_investment)) {
        updated.pricing_min_investment = minInvestment.toString();
        filledFields.push('pricing_min_investment');
      }
      
      // Tokenization - only fill if empty (use existing tokens if available)
      const existingTotalTokens = prev.totalTokens || totalTokens;
      const existingTotalValueForCalc = prev.totalValueUSDT || totalValue;
      if (shouldFill(prev.tokenization_total_tokens, 'tokenization_total_tokens') || (prev.tokenization_total_tokens === 0 || isEmpty(prev.tokenization_total_tokens))) {
        updated.tokenization_total_tokens = existingTotalTokens;
        filledFields.push('tokenization_total_tokens');
      }
      if (shouldFill(prev.tokenization_available_tokens, 'tokenization_available_tokens') || (prev.tokenization_available_tokens === 0 || isEmpty(prev.tokenization_available_tokens))) {
        updated.tokenization_available_tokens = Math.floor(existingTotalTokens * 0.9);
        filledFields.push('tokenization_available_tokens');
      }
      if (shouldFill(prev.tokenization_price_per_token, 'tokenization_price_per_token') || isEmpty(prev.tokenization_price_per_token)) {
        updated.tokenization_price_per_token = (existingTotalValueForCalc / existingTotalTokens).toFixed(2);
        filledFields.push('tokenization_price_per_token');
      }
      if (shouldFill(prev.tokenization_token_price, 'tokenization_token_price') || isEmpty(prev.tokenization_token_price)) {
        updated.tokenization_token_price = (existingTotalValueForCalc / existingTotalTokens).toFixed(2);
        filledFields.push('tokenization_token_price');
      }
      
      // Unit types - only fill if empty
      if (isEmpty(prev.unit_types)) {
        updated.unit_types = [
          { type: '1 Bedroom', size: '800 sq ft', count: '1' },
          { type: '2 Bedroom', size: '1200 sq ft', count: '2' },
          { type: '3 Bedroom', size: '1800 sq ft', count: '3' }
        ];
        filledFields.push('unit_types');
      }
      
      // Features - only fill if empty
      if (isEmpty(prev.features)) {
        updated.features = [
          'Swimming Pool', 'Gymnasium', 'Parking', 'Security',
          'Garden', 'Elevator', 'Power Backup', 'Water Treatment'
        ];
        filledFields.push('features');
      }
      
      // Amenities - only fill if empty
      if (isEmpty(prev.amenities)) {
        updated.amenities = [
          'Swimming Pool', 'Gymnasium', 'Parking', '24/7 Security',
          'Garden', 'Elevator', 'Power Backup', 'Water Treatment',
          'Club House', 'Playground'
        ];
        filledFields.push('amenities');
      }
      
      // Specifications - only fill if using defaults (2, 2, 100)
      if (prev.bedrooms === 2 || isEmpty(prev.bedrooms)) {
        updated.bedrooms = Math.floor(Math.random() * 4) + 1;
        filledFields.push('bedrooms');
      }
      if (prev.bathrooms === 2 || isEmpty(prev.bathrooms)) {
        updated.bathrooms = Math.floor(Math.random() * 3) + 1;
        filledFields.push('bathrooms');
      }
      if (prev.area_sqm === 100 || isEmpty(prev.area_sqm)) {
        updated.area_sqm = Math.floor(Math.random() * 200) + 100;
        filledFields.push('area_sqm');
      }
      if (isEmpty(prev.appreciation_percentage) || prev.appreciation_percentage === 20) {
        updated.appreciation_percentage = (Math.random() * 30 + 10).toFixed(2);
        filledFields.push('appreciation_percentage');
      }
      
      // Property features - only fill if empty
      if (isEmpty(prev.property_features)) {
        updated.property_features = [
          'Smart Home Features', 'Premium Finishes', 'High Ceilings',
          'Balcony Access', 'Modern Kitchen', 'Walk-in Closet'
        ];
        filledFields.push('property_features');
      }
      
      // DON'T touch images - user must upload them
      // DON'T touch documents - user must upload them
      
      console.log('✅ Fill Random: Filled', filledFields.length, 'fields:', filledFields);
      console.log('📊 Updated form data:', updated);
      return updated;
    });
  };

  const generateSlug = (title) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleTitleChange = (e) => {
    const title = e.target.value;
    setFormData(prev => ({
      ...prev,
      title,
      slug: generateSlug(title)
    }));
  };

  // Unit Types Management
  const addUnitType = () => {
    if (newUnitType.type && newUnitType.size && newUnitType.count) {
      setFormData(prev => ({
        ...prev,
        unit_types: [...prev.unit_types, { ...newUnitType }]
      }));
      setNewUnitType({ type: '', size: '', count: '' });
    }
  };

  const removeUnitType = (index) => {
    setFormData(prev => ({
      ...prev,
      unit_types: prev.unit_types.filter((_, i) => i !== index)
    }));
  };

  const editUnitType = (index) => {
    const unit = formData.unit_types[index];
    setEditingUnitIndex(index);
    setEditingUnit({ ...unit });
  };

  const saveUnitType = () => {
    if (editingUnitIndex !== null) {
      setFormData(prev => ({
        ...prev,
        unit_types: prev.unit_types.map((unit, index) => 
          index === editingUnitIndex ? editingUnit : unit
        )
      }));
      setEditingUnitIndex(null);
      setEditingUnit({ type: '', size: '', price: '' });
    }
  };

  const cancelEditUnitType = () => {
    setEditingUnitIndex(null);
    setEditingUnit({ type: '', size: '', price: '' });
  };

  // Features Management
  const addFeature = () => {
    if (newFeature.trim()) {
      setFormData(prev => ({
        ...prev,
        features: [...prev.features, newFeature.trim()]
      }));
      setNewFeature('');
    }
  };

  const removeFeature = (index) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }));
  };

  // Token Tier Management Functions
  const handleTokenFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setTokenFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleCreateToken = async () => {
    if (!property || (!property.id && !property.displayCode)) {
      toast.error('Please save the property first before adding token tiers');
      return;
    }

    const propertyId = property.id || property.displayCode;
    
    try {
      const tokenData = {
        propertyId,
        name: tokenFormData.name,
        color: tokenFormData.color,
        tokenSymbol: tokenFormData.tokenSymbol.toUpperCase(),
        pricePerTokenUSDT: parseFloat(tokenFormData.pricePerTokenUSDT),
        totalTokens: parseFloat(tokenFormData.totalTokens),
        expectedROI: parseFloat(tokenFormData.expectedROI),
        apartmentType: tokenFormData.apartmentType || null,
        apartmentFeatures: tokenFormData.apartmentFeatures || null,
        description: tokenFormData.description || null,
        displayOrder: parseInt(tokenFormData.displayOrder) || 0,
        isActive: tokenFormData.isActive,
      };

      if (editingToken) {
        // Update existing token
        await propertyTokensAPI.update(editingToken.id || editingToken.displayCode, tokenData);
        toast.success('Token tier updated successfully');
      } else {
        // Create new token
        await propertyTokensAPI.create(tokenData);
        toast.success('Token tier created successfully');
      }

      // Refresh tokens list
      const response = await propertyTokensAPI.getByProperty(propertyId, true);
      const tokens = response?.data?.data || response?.data || response || [];
      setPropertyTokens(Array.isArray(tokens) ? tokens : []);

      // Reset form
      setTokenFormData({
        name: '',
        color: '#CD7F32',
        tokenSymbol: '',
        pricePerTokenUSDT: '',
        totalTokens: '',
        expectedROI: '',
        apartmentType: '',
        apartmentFeatures: {},
        description: '',
        displayOrder: 0,
        isActive: true,
      });
      setShowTokenForm(false);
      setEditingToken(null);
    } catch (error) {
      console.error('Failed to save token tier:', error);
      toast.error(error?.response?.data?.message || 'Failed to save token tier');
    }
  };

  const handleEditToken = (token) => {
    setEditingToken(token);
    setTokenFormData({
      name: token.name || '',
      color: token.color || '#CD7F32',
      tokenSymbol: token.tokenSymbol || token.displayCode || '',
      pricePerTokenUSDT: token.pricePerTokenUSDT || '',
      totalTokens: token.totalTokens || '',
      expectedROI: token.expectedROI || '',
      apartmentType: token.apartmentType || '',
      apartmentFeatures: token.apartmentFeatures || {},
      description: token.description || '',
      displayOrder: token.displayOrder || 0,
      isActive: token.isActive !== undefined ? token.isActive : true,
    });
    setShowTokenForm(true);
  };

  const handleDeleteToken = async (token) => {
    if (!window.confirm(`Delete token tier "${token.name}" (${token.displayCode})?`)) {
      return;
    }

    try {
      await propertyTokensAPI.delete(token.id || token.displayCode);
      toast.success('Token tier deleted successfully');
      
      // Refresh tokens list
      const propertyId = property.id || property.displayCode;
      const response = await propertyTokensAPI.getByProperty(propertyId, true);
      const tokens = response?.data?.data || response?.data || response || [];
      setPropertyTokens(Array.isArray(tokens) ? tokens : []);
    } catch (error) {
      console.error('Failed to delete token tier:', error);
      toast.error(error?.response?.data?.message || 'Failed to delete token tier');
    }
  };

  // Token Tier Management for Property Creation
  const handleTokenTierFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setTokenTierFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Real-time validation for totalTokens field
    if (name === 'totalTokens') {
      validateTokenTierCount(value);
    }

    // Real-time validation for totalValueUSDT field
    if (name === 'totalValueUSDT') {
      validateTokenTierValue(value);
    }
  };

  // Validate token tier count against property total tokens
  const validateTokenTierCount = (newTokenCount) => {
    const propertyTotalTokens = parseFloat(formData.totalTokens) || 0;
    
    if (!propertyTotalTokens || propertyTotalTokens <= 0) {
      setTokenTierValidationError('Please set Total Tokens for the property first.');
      return false;
    }

    const newCount = parseFloat(newTokenCount) || 0;
    if (newCount <= 0) {
      setTokenTierValidationError('');
      return true; // Allow empty/zero while typing
    }

    // Calculate sum of all other tiers (excluding the one being edited)
    const otherTiersSum = tokenTiers.reduce((sum, tier, index) => {
      if (editingTierIndex !== null && index === editingTierIndex) {
        return sum; // Skip the tier being edited
      }
      return sum + (parseFloat(tier.totalTokens) || 0);
    }, 0);

    const totalWithNewTier = otherTiersSum + newCount;

    if (totalWithNewTier > propertyTotalTokens) {
      const remaining = propertyTotalTokens - otherTiersSum;
      setTokenTierValidationError(
        `Total tokens (${totalWithNewTier.toLocaleString()}) exceeds property limit (${propertyTotalTokens.toLocaleString()}). ` +
        `Remaining available: ${remaining > 0 ? remaining.toLocaleString() : 0} tokens.`
      );
      return false;
    } else {
      setTokenTierValidationError('');
      return true;
    }
  };

  // Validate token tier value against property total value
  const validateTokenTierValue = (newTierValue) => {
    const propertyTotalValue = parseFloat(formData.totalValueUSDT) || 0;
    
    if (!propertyTotalValue || propertyTotalValue <= 0) {
      setTokenTierValueValidationError('Please set Total Value (USDT) for the property first.');
      return false;
    }

    const newValue = parseFloat(newTierValue) || 0;
    if (newValue <= 0) {
      setTokenTierValueValidationError('');
      return true; // Allow empty/zero while typing
    }

    // Calculate sum of all other tiers' total values (excluding the one being edited)
    // For existing tiers, calculate totalValue from pricePerTokenUSDT * totalTokens
    const otherTiersSum = tokenTiers.reduce((sum, tier, index) => {
      if (editingTierIndex !== null && index === editingTierIndex) {
        return sum; // Skip the tier being edited
      }
      // If tier has totalValueUSDT (new format), use it; otherwise calculate from pricePerTokenUSDT
      const tierValue = tier.totalValueUSDT !== undefined 
        ? (parseFloat(tier.totalValueUSDT) || 0)
        : (parseFloat(tier.pricePerTokenUSDT) || 0) * (parseFloat(tier.totalTokens) || 0);
      return sum + tierValue;
    }, 0);

    const totalWithNewTier = otherTiersSum + newValue;

    if (totalWithNewTier > propertyTotalValue) {
      const remaining = propertyTotalValue - otherTiersSum;
      setTokenTierValueValidationError(
        `Total value (${totalWithNewTier.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) exceeds property limit (${propertyTotalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}). ` +
        `Remaining available: ${remaining > 0 ? remaining.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 0} USDT.`
      );
      return false;
    } else {
      setTokenTierValueValidationError('');
      return true;
    }
  };

  const addTokenTier = () => {
    if (!tokenTierFormData.name || !tokenTierFormData.tokenSymbol || !tokenTierFormData.totalValueUSDT || !tokenTierFormData.totalTokens || !tokenTierFormData.expectedROI) {
      toast.error('Please fill in all required fields (Name, Symbol, Total Value, Tokens, ROI)');
      return;
    }

    // Validate token count before adding/updating
    const isValidCount = validateTokenTierCount(tokenTierFormData.totalTokens);
    if (!isValidCount) {
      toast.error('Cannot add token tier: Total tokens exceed property limit. Please adjust the number of tokens.');
      return;
    }

    // Validate USDT value before adding/updating
    const isValidValue = validateTokenTierValue(tokenTierFormData.totalValueUSDT);
    if (!isValidValue) {
      toast.error('Cannot add token tier: Total value exceeds property limit. Please adjust the total value.');
      return;
    }

    // Calculate price per token from total value and total tokens
    const totalValue = parseFloat(tokenTierFormData.totalValueUSDT);
    const totalTokens = parseFloat(tokenTierFormData.totalTokens);
    const pricePerToken = totalTokens > 0 ? (totalValue / totalTokens) : 0;

    const newTier = {
      ...tokenTierFormData,
      tokenSymbol: tokenTierFormData.tokenSymbol.toUpperCase(),
      totalValueUSDT: totalValue, // Store total value for validation
      pricePerTokenUSDT: pricePerToken, // Calculate and store for backend
      totalTokens: totalTokens,
      expectedROI: parseFloat(tokenTierFormData.expectedROI),
      displayOrder: tokenTiers.length,
    };

    if (editingTierIndex !== null) {
      // Update existing tier
      const updated = [...tokenTiers];
      updated[editingTierIndex] = newTier;
      setTokenTiers(updated);
      setEditingTierIndex(null);
    } else {
      // Add new tier
      setTokenTiers([...tokenTiers, newTier]);
    }

    // Reset form
    setTokenTierFormData({
      name: '',
      color: '#CD7F32',
      tokenSymbol: '',
      totalValueUSDT: '',
      totalTokens: '',
      expectedROI: '',
      apartmentType: '',
      apartmentFeatures: {},
      description: '',
      displayOrder: tokenTiers.length + 1,
      isActive: true,
    });
    setTokenTierValidationError('');
    setTokenTierValueValidationError('');
    setShowTokenTierForm(false);
  };

  const editTokenTier = (index) => {
    const tier = tokenTiers[index];
    // Calculate totalValueUSDT from pricePerTokenUSDT * totalTokens if not already stored
    const totalValueUSDT = tier.totalValueUSDT !== undefined 
      ? tier.totalValueUSDT 
      : (parseFloat(tier.pricePerTokenUSDT) || 0) * (parseFloat(tier.totalTokens) || 0);
    
    setTokenTierFormData({
      name: tier.name || '',
      color: tier.color || '#CD7F32',
      tokenSymbol: tier.tokenSymbol || '',
      totalValueUSDT: totalValueUSDT > 0 ? totalValueUSDT.toString() : '',
      totalTokens: tier.totalTokens || '',
      expectedROI: tier.expectedROI || '',
      apartmentType: tier.apartmentType || '',
      apartmentFeatures: tier.apartmentFeatures || {},
      description: tier.description || '',
      displayOrder: tier.displayOrder || index,
      isActive: tier.isActive !== undefined ? tier.isActive : true,
    });
    setEditingTierIndex(index);
    setTokenTierValidationError(''); // Reset validation error when opening edit form
    setTokenTierValueValidationError(''); // Reset value validation error
    setShowTokenTierForm(true);
    // Validate the existing values when editing
    if (tier.totalTokens) {
      validateTokenTierCount(tier.totalTokens);
    }
    if (totalValueUSDT > 0) {
      validateTokenTierValue(totalValueUSDT.toString());
    }
  };

  const removeTokenTier = (index) => {
    if (window.confirm(`Remove token tier "${tokenTiers[index].name}"?`)) {
      const updated = tokenTiers.filter((_, i) => i !== index);
      setTokenTiers(updated);
    }
  };

  // Amenities Management
  const addAmenity = () => {
    if (newAmenity.trim()) {
      setFormData(prev => ({
        ...prev,
        amenities: [...prev.amenities, newAmenity.trim()]
      }));
      setNewAmenity('');
    }
  };

  const removeAmenity = (index) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.filter((_, i) => i !== index)
    }));
  };

  // Documents Management - New object structure
  const addDocument = () => {
    if (!newDocument.url || !newDocument.type) {
      toast.warning('Please provide a URL and select a document type.');
      return;
    }

    const type = newDocument.type;
    
    if (type === 'brochure') {
      if (!newDocument.name) {
        toast.warning('Please provide a name for the brochure.');
        return;
      }
      setFormData(prev => ({
        ...prev,
        documents: {
          ...prev.documents,
          brochure: {
            url: newDocument.url.trim(),
            name: newDocument.name.trim(),
            notes: newDocument.notes || '',
            uploadedAt: new Date().toISOString(),
            uploadedBy: 'admin' // TODO: Get from auth context
          }
        }
      }));
    } else if (type === 'floorPlan') {
      setFormData(prev => ({
        ...prev,
        documents: {
          ...prev.documents,
          floorPlan: {
            url: newDocument.url.trim(),
            version: newDocument.version || 'A',
            mimeType: newDocument.mimeType || 'application/pdf'
          }
        }
      }));
    } else if (type === 'compliance') {
      if (!newDocument.name) {
        toast.warning('Please provide a type for the compliance document (e.g., Building Permit).');
        return;
      }
      setFormData(prev => ({
        ...prev,
        documents: {
          ...prev.documents,
          compliance: [
            ...prev.documents.compliance,
            {
              url: newDocument.url.trim(),
              type: newDocument.name.trim(),
              issuedAt: newDocument.issuedAt || '',
              issuedBy: newDocument.issuedBy || ''
            }
          ]
        }
      }));
    }
    
    // Reset form
    setNewDocument({ 
      name: '', 
      url: '', 
      type: '', 
      notes: '', 
      version: '', 
      issuedAt: '', 
      issuedBy: '',
      mimeType: ''
    });
  };

  const removeDocument = (type, index = null) => {
    if (type === 'brochure') {
      setFormData(prev => ({
        ...prev,
        documents: {
          ...prev.documents,
          brochure: null
        }
      }));
    } else if (type === 'floorPlan') {
      setFormData(prev => ({
        ...prev,
        documents: {
          ...prev.documents,
          floorPlan: null
        }
      }));
    } else if (type === 'compliance' && index !== null) {
      setFormData(prev => ({
        ...prev,
        documents: {
          ...prev.documents,
          compliance: prev.documents.compliance.filter((_, i) => i !== index)
        }
      }));
    }
  };

  const handleDocumentFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['.pdf', '.doc', '.docx', '.txt', '.xls', '.xlsx', '.ppt', '.pptx'];
    const fileExt = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowedTypes.includes(fileExt)) {
      toast.error('Invalid file type. Please upload PDF, DOC, DOCX, TXT, XLS, XLSX, PPT, or PPTX files.');
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size exceeds 10MB limit.');
      return;
    }

    // Auto-fill document name from filename
    const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
    const mimeType = file.type || 'application/pdf';
    
    setNewDocument(prev => ({ 
      ...prev, 
      name: fileNameWithoutExt,
      mimeType: mimeType
    }));

    setUploadingDocument(true);
    try {
      console.log('🚀 handleDocumentFileUpload called - Using Supabase!');
      
      // Get property ID for folder organization
      const propertyId = property?.id || property?.displayCode || null;
      
      // Upload to Supabase Storage (property-documents bucket)
      console.log('📤 Uploading document to Supabase...', { fileName: file.name, propertyId, fileSize: file.size });
      
      const result = await supabaseUpload.uploadDocument(file, 'properties', propertyId);
      
      console.log('✅ Document uploaded to Supabase successfully:', result);
      
      // Extract URL from Supabase response
      // Response format: { url: string, path: string, success: boolean }
      const documentUrl = result?.url;
      
      if (!documentUrl) {
        throw new Error('No URL returned from Supabase upload');
      }
      
      console.log('🔗 Supabase document URL:', documentUrl);
      
      // Set the uploaded file URL in the form
        setNewDocument(prev => ({ 
          ...prev, 
        url: documentUrl, // This is the Supabase public URL
        mimeType: mimeType
      }));
      
      console.log('📄 Document URL set in form:', documentUrl);
      console.log('📄 Current newDocument state:', { ...newDocument, url: documentUrl });
      
      toast.success('Document uploaded! Select type and add it.');
    } catch (error) {
      console.error('❌ Document upload error:', error);
      let errorMessage = 'Failed to upload document. Please try again.';
      
      if (error.message?.includes('Storage bucket') || error.message?.includes('property-documents')) {
        errorMessage += '\n\n💡 Solution: Check your Supabase storage. Make sure the "property-documents" bucket exists and has proper policies.';
      } else if (error.message?.includes('row-level security') || error.message?.includes('policy')) {
        errorMessage += '\n\n💡 Solution: Check your Supabase storage policies. You need an INSERT policy for the "anon" role on the "property-documents" bucket.';
      } else if (error.message?.includes('No URL returned')) {
        errorMessage += ' Check Supabase config.';
      }
      
      toast.error(errorMessage);
    } finally {
      setUploadingDocument(false);
      // Reset file input
      if (documentFileInputRef.current) {
        documentFileInputRef.current.value = '';
      }
    }
  };

  // Property Features Management
  const addPropertyFeature = () => {
    if (newPropertyFeature.trim()) {
      setFormData(prev => ({
        ...prev,
        property_features: [...prev.property_features, newPropertyFeature.trim()]
      }));
      setNewPropertyFeature('');
    }
  };

  const removePropertyFeature = (index) => {
    setFormData(prev => ({
      ...prev,
      property_features: prev.property_features.filter((_, i) => i !== index)
    }));
  };

  // Images Management
  const addImage = () => {
    if (newImage.url) {
      // Add URL to images array
      setFormData(prev => {
        // Ensure images is always an array
        const currentImages = Array.isArray(prev.images) 
          ? prev.images 
          : (typeof prev.images === 'string' 
              ? (() => {
                  try {
                    const parsed = JSON.parse(prev.images);
                    return Array.isArray(parsed) ? parsed : [];
                  } catch {
                    return [];
                  }
                })()
              : []);
        
        return {
          ...prev,
          images: [...currentImages, newImage.url]
        };
      });
      setNewImage({ url: '', alt: '', type: 'main' });
      toast.success('Image added successfully!');
    } else {
      toast.warning('Please upload an image first.');
    }
  };

  const handleImageFileUpload = async (event) => {
    console.log('🚀 handleImageFileUpload called - Using Supabase!');
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Use JPG, PNG, GIF, or WEBP.');
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size exceeds 10MB limit.');
      return;
    }

    // Auto-fill alt text from filename
    const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
    setNewImage(prev => ({ ...prev, alt: fileNameWithoutExt }));

    setUploadingImage(true);
    try {
      // Get property ID if editing
      const propertyId = property?.id || property?.displayCode || null;
      
      console.log('🖼️ Uploading image to Supabase...', { fileName: file.name, propertyId, fileSize: file.size });
      console.log('📦 supabaseUpload object:', supabaseUpload);
      
      // IMPORTANT: Using Supabase, NOT the old uploadAPI
      // Upload to Supabase
      const result = await supabaseUpload.uploadImage(file, 'properties', propertyId);
      
      console.log('✅ Upload result:', result);
      
      // Set the uploaded file URL
      setNewImage(prev => ({ 
        ...prev, 
        url: result.url // This is the Supabase public URL
      }));
      
      toast.success('Image uploaded! Click "Add Image" to add it.');
    } catch (error) {
      console.error('❌ Image upload error:', error);
      toast.error('Failed to upload image. Check console for details.');
    } finally {
      setUploadingImage(false);
      // Reset file input
      if (imageFileInputRef.current) {
        imageFileInputRef.current.value = '';
      }
    }
  };

  const removeImage = (index) => {
    setFormData(prev => {
      // Ensure images is always an array
      const currentImages = Array.isArray(prev.images) ? prev.images : [];
      return {
        ...prev,
        images: currentImages.filter((_, i) => i !== index)
      };
    });
  };

  // Step navigation functions
  const validateStep = (step) => {
    if (step === 1) {
      // Validate Step 1: Basic & Location
      if (!formData.organizationId) {
        toast.warning('Please select an organization');
        return false;
      }
      if (!formData.type) {
        toast.warning('Please select property type');
        return false;
      }
      if (!formData.totalValueUSDT || formData.totalValueUSDT <= 0) {
        toast.warning('Please enter total value (USDT)');
        return false;
      }
      if (!formData.totalTokens || formData.totalTokens <= 0) {
        toast.warning('Please enter total tokens');
        return false;
      }
    } else if (step === 2) {
      // Validate Step 2: Financial & Project Details (optional validations)
      // Can add specific validation if needed
    } else if (step === 3) {
      // Validate Step 3: Documents required
      const hasDocuments = formData.documents?.brochure || 
                          formData.documents?.floorPlan || 
                          (formData.documents?.compliance && formData.documents.compliance.length > 0);
      if (!hasDocuments) {
        toast.warning('Please add at least one document');
        return false;
      }
    }
    return true;
  };

  const handleNextStep = () => {
    // Allow navigation without validation - users should be able to edit both tabs freely
    // Skip step 2 (commented out) - go directly from 1 to 3
    if (currentStep === 1) {
      setCurrentStep(3);
    } else {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    }
    // Scroll to top of form
    setTimeout(() => {
      const formContent = document.querySelector('.form-scrollable-content');
      if (formContent) {
        formContent.scrollTop = 0;
      }
    }, 100);
  };

  const handlePreviousStep = () => {
    // Skip step 2 (commented out) - go directly from 3 to 1
    if (currentStep === 3) {
      setCurrentStep(1);
    } else {
      setCurrentStep(prev => Math.max(prev - 1, 1));
    }
    // Scroll to top of form
    setTimeout(() => {
      const formContent = document.querySelector('.form-scrollable-content');
      if (formContent) {
        formContent.scrollTop = 0;
      }
    }, 100);
  };

  const goToStep = (step) => {
    // If clicking on current step, do nothing
    if (step === currentStep) {
      return;
    }
    
    // Step 2 is commented out, so we only have steps 1 and 3
    // Allow free navigation between steps - no validation required
    // Users should be able to edit both tabs freely
    setCurrentStep(step);
    
    setTimeout(() => {
      const formContent = document.querySelector('.form-scrollable-content');
      if (formContent) {
        formContent.scrollTop = 0;
      }
    }, 100);
  };

  // Show loading state when editing and waiting for property data OR organizations
  if (property && (loadingPropertyData || loadingOrgs)) {
    if (inline) {
      return (
        <div className="bg-card rounded-lg p-8 shadow-lg text-center border border-border">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-card-foreground font-medium">Loading property data...</p>
          <p className="text-muted-foreground text-sm mt-2">
            {loadingPropertyData ? 'Fetching property details...' : 'Loading organizations...'}
          </p>
        </div>
      );
    }
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 h-full w-full z-50 flex items-center justify-center">
        <div className="bg-card rounded-lg p-8 shadow-lg text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-card-foreground font-medium">Loading property data...</p>
          <p className="text-muted-foreground text-sm mt-2">
            {loadingPropertyData ? 'Fetching property details...' : 'Loading organizations...'}
          </p>
        </div>
      </div>
    );
  }

  // Form content (shared between modal and inline)
  const formContent = (
    <div className={`${inline ? 'w-full' : 'relative myb-4 mx-auto w-11/12 max-w-7xl'} bg-gradient-to-br from-card via-card to-card/95 backdrop-blur-xl ${inline ? 'min-h-[600px]' : 'max-h-[95vh]'} flex flex-col rounded-xl shadow-2xl border border-border/50 overflow-hidden `}>
        {/* Sticky Header with Close Button */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-card via-card/95 to-card backdrop-blur-xl border-b border-border/50 px-6 py-5 rounded-t-xl shadow-sm">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl md:text-2xl font-bold text-card-foreground tracking-tight">
                {property ? (
                  <>
                    Editing{' '}
                    <span className="font-bold text-blue-800">{property.title}</span>
                  </>
                ) : (
                  'Add New Asset'
                )}
              </h3>
              <p className="text-xs md:text-sm text-muted-foreground mt-1">
                {property ? 'Update asset information' : 'Create a new asset listing'}
              </p>
            </div>
            <button
              onClick={onCancel}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-200"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Step Indicator - Step 2 commented out (not in DB) */}
          <div className="flex items-center justify-center gap-4 md:gap-6 py-3 border-b border-border/30 bg-accent/30">
            {[1, 3].map((step) => (
              <React.Fragment key={step}>
                <button
                  type="button"
                  onClick={() => goToStep(step)}
                  className="flex items-center gap-2 md:gap-3 transition-all cursor-pointer hover:opacity-80"
                >
                  <div className={`flex items-center gap-2 md:gap-3 transition-all ${
                    step === currentStep
                      ? 'scale-105'
                      : ''
                  }`}>
                    <div className={`flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full font-semibold text-sm md:text-base transition-all flex-shrink-0 ${
                      step < currentStep
                        ? 'bg-green-500 text-white'
                        : step === currentStep
                        ? 'bg-primary text-white ring-2 ring-primary/30'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    }`}>
                      {step < currentStep ? (
                        <Check className="w-4 h-4 md:w-5 md:h-5" />
                      ) : (
                        <span>{step === 1 ? 1 : 2}</span>
                      )}
                    </div>
                    <div className="text-left min-w-0">
                      <div className={`text-xs md:text-sm font-semibold whitespace-nowrap ${
                        step === currentStep
                          ? 'text-card-foreground'
                          : 'text-muted-foreground'
                      }`}>
                        {step === 1 && 'Basic & Custody'}
                        {step === 3 && 'Media & Settings'}
                      </div>
                      <div className="text-[10px] md:text-xs text-muted-foreground whitespace-nowrap">
                        Step {step === 1 ? 1 : 2} of 2
                      </div>
                    </div>
                  </div>
                </button>
                {step === 1 && (
                  <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground flex-shrink-0" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
        
        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 px-5 md:px-8 py-6 md:py-8 form-scrollable-content scroll-smooth bg-gradient-to-b from-transparent to-accent/5">
          <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8 max-w-none">
          {/* STEP 1: Basic & Location Details */}
          {currentStep === 1 && (
            <>
          {/* Basic Information */}
          <Card className="p-6 md:p-8 bg-card/80 backdrop-blur-sm border border-border/60 shadow-sm hover:shadow-lg transition-all duration-300 rounded-xl">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border/40">
              <div className="p-2 rounded-lg bg-primary/10">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-card-foreground">
                  Basic Information
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">Essential asset details</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
              {/* Required Backend Fields */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                  <span>Organization ID</span>
                  <span className="text-red-500 text-xs">*</span>
                  {loadingOrgs && <span className="ml-auto text-xs text-muted-foreground font-normal animate-pulse">Loading...</span>}
                </label>
                {organizations.length > 0 ? (
                  <select
                    name="organizationId"
                    value={formData.organizationId}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 text-sm border border-input/70 bg-card/50 text-card-foreground placeholder:text-muted-foreground rounded-xl transition-all duration-200 focus:ring-2 focus:ring-primary/30 focus:border-primary hover:border-input hover:bg-card shadow-sm"
                  >
                    <option value="">Select Organization</option>
                    {organizations.map((org) => (
                      <option key={org.id} value={org.displayCode || org.id}>
                        {org.displayCode || org.id} - {org.name || 'Organization'}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    name="organizationId"
                    value={formData.organizationId}
                    onChange={handleChange}
                    required
                    placeholder="ORG-000001"
                    className="w-full px-4 py-3 text-sm border border-input/70 bg-card/50 text-card-foreground placeholder:text-muted-foreground rounded-xl transition-all duration-200 focus:ring-2 focus:ring-primary/30 focus:border-primary hover:border-input hover:bg-card shadow-sm"
                  />
                )}
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                  <span>Asset Type</span>
                  <span className="text-red-500 text-xs">*</span>
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 text-sm border border-input/70 bg-card/50 text-card-foreground placeholder:text-muted-foreground rounded-xl transition-all duration-200 focus:ring-2 focus:ring-primary/30 focus:border-primary hover:border-input hover:bg-card shadow-sm"
                >
                  {ASSET_TYPE_OPTIONS.map((option) => (
                    <option key={`${option.categoryKey}-${option.value}`} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                  <span>Total Value (USDT)</span>
                  <span className="text-red-500 text-xs">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    name="totalValueUSDT"
                    value={formData.totalValueUSDT}
                    onChange={handleChange}
                    required
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full px-4 py-3 text-sm border border-input/70 bg-card/50 text-card-foreground placeholder:text-muted-foreground rounded-xl transition-all duration-200 focus:ring-2 focus:ring-primary/30 focus:border-primary hover:border-input hover:bg-card shadow-sm"
                  />
                </div>
              </div>
              {/* Total Tokens - Show calculated value if token tiers exist, otherwise show input */}
              {tokenTiers.length > 0 ? (
                <div className="space-y-2 md:col-span-2">
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    <span>Total Tokens (Calculated from Tiers)</span>
                  </label>
                  <div className="px-4 py-3 text-sm border border-input/70 bg-accent/20 text-card-foreground rounded-xl font-semibold">
                    {tokenTiers.reduce((sum, tier) => sum + (parseFloat(tier.totalTokens) || 0), 0).toLocaleString()} tokens
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    This is automatically calculated from the sum of all token tiers below
                  </p>
                  {/* Hidden input for backend validation */}
                  <input type="hidden" name="totalTokens" value={tokenTiers.reduce((sum, tier) => sum + (parseFloat(tier.totalTokens) || 0), 0)} />
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                    <span>Total Tokens</span>
                    <span className="text-red-500 text-xs">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      name="totalTokens"
                      value={formData.totalTokens}
                      onChange={handleChange}
                      required
                      min="1"
                      step="1"
                      placeholder="1000"
                      className="w-full px-4 py-3 text-sm border border-input/70 bg-card/50 text-card-foreground placeholder:text-muted-foreground rounded-xl transition-all duration-200 focus:ring-2 focus:ring-primary/30 focus:border-primary hover:border-input hover:bg-card shadow-sm"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed flex items-start gap-1.5">
                    <span className="text-primary mt-0.5">ℹ️</span>
                    <span>Total token supply for this asset (e.g., 20000) - OR add token tiers below</span>
                  </p>
                </div>
              )}
              {/* COMMENTED OUT: Construction Progress - Not in DB */}
              {/* <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Construction Progress (%) *
                </label>
                <div className="space-y-3">
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => handleChange({ target: { name: 'construction_progress', value: '25' } })}
                      className={`px-3 py-1 text-sm rounded-md border ${
                        formData.construction_progress === 25
                          ? 'bg-accent0 text-white border-blue-500'
                          : 'bg-card text-foreground border-input hover:bg-accent'
                      }`}
                    >
                      25%
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChange({ target: { name: 'construction_progress', value: '50' } })}
                      className={`px-3 py-1 text-sm rounded-md border ${
                        formData.construction_progress === 50
                          ? 'bg-accent0 text-white border-blue-500'
                          : 'bg-card text-foreground border-input hover:bg-accent'
                      }`}
                    >
                      50%
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChange({ target: { name: 'construction_progress', value: '75' } })}
                      className={`px-3 py-1 text-sm rounded-md border ${
                        formData.construction_progress === 75
                          ? 'bg-accent0 text-white border-blue-500'
                          : 'bg-card text-foreground border-input hover:bg-accent'
                      }`}
                    >
                      75%
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChange({ target: { name: 'construction_progress', value: '100' } })}
                      className={`px-3 py-1 text-sm rounded-md border ${
                        formData.construction_progress === 100
                          ? 'bg-accent0 text-white border-blue-500'
                          : 'bg-card text-foreground border-input hover:bg-accent'
                      }`}
                    >
                      100%
                    </button>
                  </div>
                  
                  <input
                    type="number"
                    min="0"
                    max="100"
                    name="construction_progress"
                    value={formData.construction_progress}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-input bg-card text-card-foreground placeholder:text-muted-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-ring"
                    placeholder="Enter custom progress (0-100)"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Used to calculate Expected ROI below
                </p>
              </div> */}
              {/* COMMENTED OUT: Full ROI - Not in DB */}
              {/* <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Full ROI (%) *
                  <span className="text-xs text-muted-foreground ml-2">
                    (ROI at 100% completion)
                  </span>
                </label>
                <input
                  type="number"
                  name="fullROI"
                  value={formData.fullROI}
                  onChange={handleChange}
                  required
                  min="0"
                  step="0.1"
                  className="w-full px-3 py-2 border border-input bg-card text-card-foreground placeholder:text-muted-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-ring"
                  placeholder="Enter full ROI (e.g., 11.5)"
                />
              </div> */}
              {/* Expected ROI - Show average if token tiers exist, otherwise show input */}
              {tokenTiers.length > 0 ? (
                <div className="space-y-2 md:col-span-2">
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    <span>Expected ROI (Average from Tiers)</span>
                  </label>
                  <div className="px-4 py-3 text-sm border border-input/70 bg-accent/20 text-card-foreground rounded-xl font-semibold">
                    {tokenTiers.length > 0 
                      ? (tokenTiers.reduce((sum, tier) => sum + (parseFloat(tier.expectedROI) || 0), 0) / tokenTiers.length).toFixed(2)
                      : '0.00'}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Average ROI calculated from all token tiers (each tier has its own ROI)
                  </p>
                  {/* Hidden input for backend validation */}
                  <input 
                    type="hidden" 
                    name="expectedROI" 
                    value={tokenTiers.length > 0 
                      ? (tokenTiers.reduce((sum, tier) => sum + (parseFloat(tier.expectedROI) || 0), 0) / tokenTiers.length)
                      : formData.expectedROI} 
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                    <span>Expected ROI (%)</span>
                    <span className="text-red-500 text-xs">*</span>
                  </label>
                  <input
                    type="number"
                    name="expectedROI"
                    value={formData.expectedROI}
                    onChange={handleChange}
                    required
                    min="0"
                    step="0.1"
                    placeholder="11.5"
                    className="w-full px-4 py-3 text-sm border border-input/70 bg-card/50 text-card-foreground placeholder:text-muted-foreground rounded-xl transition-all duration-200 focus:ring-2 focus:ring-primary/30 focus:border-primary hover:border-input hover:bg-card shadow-sm"
                  />
                </div>
              )}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                  <span>Status</span>
                  <span className="text-red-500 text-xs">*</span>
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 text-sm border border-input/70 bg-card/50 text-card-foreground placeholder:text-muted-foreground rounded-xl transition-all duration-200 focus:ring-2 focus:ring-primary/30 focus:border-primary hover:border-input hover:bg-card shadow-sm"
                >
                  <option value="active">✅ Active</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Token Tiers Section - For Property Creation */}
          {!property && (
            <Card className="p-6 md:p-8 bg-card/80 backdrop-blur-sm border border-border/60 shadow-sm hover:shadow-lg transition-all duration-300 rounded-xl">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-border/40">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <Hash className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-card-foreground">
                      Token Tiers
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">Define multiple token tiers for this property</p>
                  </div>
                </div>
                {!showTokenTierForm && (
                  <Button
                    type="button"
                    onClick={() => {
                      setShowTokenTierForm(true);
                      setEditingTierIndex(null);
                      setTokenTierFormData({
                        name: '',
                        color: '#CD7F32',
                        tokenSymbol: '',
                        totalValueUSDT: '',
                        totalTokens: '',
                        expectedROI: '',
                        apartmentType: '',
                        apartmentFeatures: {},
                        description: '',
                        displayOrder: tokenTiers.length,
                        isActive: true,
                      });
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Token Tier</span>
                  </Button>
                )}
              </div>

              {showTokenTierForm ? (
                <div className="space-y-4 p-4 bg-accent/10 rounded-xl border border-border/40 mb-4">
                  <div className="flex items-center justify-between mb-4">
                    <h5 className="text-base font-semibold text-card-foreground">
                      {editingTierIndex !== null ? 'Edit Token Tier' : 'Create New Token Tier'}
                    </h5>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowTokenTierForm(false);
                        setEditingTierIndex(null);
                        setTokenTierValidationError('');
                        setTokenTierValueValidationError('');
                      }}
                      className="px-3 py-1.5"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        Token Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={tokenTierFormData.name}
                        onChange={handleTokenTierFormChange}
                        placeholder="e.g., Bronze Token"
                        className="w-full px-4 py-2 text-sm border border-input/70 bg-card/50 text-card-foreground rounded-xl"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        Token Symbol <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="tokenSymbol"
                        value={tokenTierFormData.tokenSymbol}
                        onChange={handleTokenTierFormChange}
                        placeholder="e.g., MBT (must be unique)"
                        className="w-full px-4 py-2 text-sm border border-input/70 bg-card/50 text-card-foreground rounded-xl uppercase"
                        required
                        maxLength={20}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        Color <span className="text-red-500">*</span>
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          name="color"
                          value={tokenTierFormData.color}
                          onChange={handleTokenTierFormChange}
                          className="w-16 h-10 rounded-xl border border-input/70"
                        />
                        <input
                          type="text"
                          name="color"
                          value={tokenTierFormData.color}
                          onChange={handleTokenTierFormChange}
                          placeholder="#CD7F32"
                          className="flex-1 px-4 py-2 text-sm border border-input/70 bg-card/50 text-card-foreground rounded-xl"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        Total Value of Tier (USDT) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        name="totalValueUSDT"
                        value={tokenTierFormData.totalValueUSDT}
                        onChange={handleTokenTierFormChange}
                        placeholder="200000.00"
                        min="0.01"
                        step="0.01"
                        className={`w-full px-4 py-2 text-sm border rounded-xl ${
                          tokenTierValueValidationError 
                            ? 'border-red-500 bg-red-50/10 focus:ring-red-500 focus:border-red-500' 
                            : 'border-input/70 bg-card/50 focus:ring-primary/30 focus:border-primary'
                        } text-card-foreground`}
                        required
                      />
                      {tokenTierValueValidationError && (
                        <p className="text-red-500 text-xs mt-1.5 flex items-start gap-1.5">
                          <span>⚠️</span>
                          <span>{tokenTierValueValidationError}</span>
                        </p>
                      )}
                      {!tokenTierValueValidationError && tokenTierFormData.totalValueUSDT && formData.totalValueUSDT && (
                        (() => {
                          // Calculate sum of all other tiers' values (excluding the one being edited)
                          const otherTiersSum = tokenTiers.reduce((sum, tier, index) => {
                            if (editingTierIndex !== null && index === editingTierIndex) {
                              return sum;
                            }
                            // Calculate tier value: use totalValueUSDT if available, otherwise calculate from pricePerTokenUSDT
                            const tierValue = tier.totalValueUSDT !== undefined 
                              ? (parseFloat(tier.totalValueUSDT) || 0)
                              : (parseFloat(tier.pricePerTokenUSDT) || 0) * (parseFloat(tier.totalTokens) || 0);
                            return sum + tierValue;
                          }, 0);
                          const currentValue = parseFloat(tokenTierFormData.totalValueUSDT) || 0;
                          const totalUsed = otherTiersSum + currentValue;
                          const remaining = (parseFloat(formData.totalValueUSDT) || 0) - totalUsed;
                          return remaining >= 0 ? (
                            <p className="text-green-500 text-xs mt-1.5 flex items-start gap-1.5">
                              <span>✓</span>
                              <span>Remaining: {remaining.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT available</span>
                            </p>
                          ) : null;
                        })()
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        Number of Tokens <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        name="totalTokens"
                        value={tokenTierFormData.totalTokens}
                        onChange={handleTokenTierFormChange}
                        placeholder="1000"
                        min="1"
                        step="1"
                        className={`w-full px-4 py-2 text-sm border rounded-xl ${
                          tokenTierValidationError 
                            ? 'border-red-500 bg-red-50/10 focus:ring-red-500 focus:border-red-500' 
                            : 'border-input/70 bg-card/50 focus:ring-primary/30 focus:border-primary'
                        } text-card-foreground`}
                        required
                      />
                      {tokenTierValidationError && (
                        <p className="text-red-500 text-xs mt-1.5 flex items-start gap-1.5">
                          <span>⚠️</span>
                          <span>{tokenTierValidationError}</span>
                        </p>
                      )}
                      {!tokenTierValidationError && tokenTierFormData.totalTokens && formData.totalTokens && (
                        (() => {
                          const otherTiersSum = tokenTiers.reduce((sum, tier, index) => {
                            if (editingTierIndex !== null && index === editingTierIndex) {
                              return sum;
                            }
                            return sum + (parseFloat(tier.totalTokens) || 0);
                          }, 0);
                          const currentCount = parseFloat(tokenTierFormData.totalTokens) || 0;
                          const totalUsed = otherTiersSum + currentCount;
                          const remaining = (parseFloat(formData.totalTokens) || 0) - totalUsed;
                          return remaining >= 0 ? (
                            <p className="text-green-500 text-xs mt-1.5 flex items-start gap-1.5">
                              <span>✓</span>
                              <span>Remaining: {remaining.toLocaleString()} tokens available</span>
                            </p>
                          ) : null;
                        })()
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        Price per Token (USDT) <span className="text-xs text-primary ml-1">(Auto-calculated)</span>
                      </label>
                      <input
                        type="text"
                        value={
                          tokenTierFormData.totalValueUSDT && tokenTierFormData.totalTokens
                            ? (parseFloat(tokenTierFormData.totalValueUSDT) / parseFloat(tokenTierFormData.totalTokens)).toFixed(6)
                            : '0.00'
                        }
                        readOnly
                        className="w-full px-4 py-2 text-sm border border-input/70 bg-accent/50 text-card-foreground rounded-xl cursor-not-allowed"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Calculated from: Total Value ÷ Number of Tokens
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        Expected ROI (%) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        name="expectedROI"
                        value={tokenTierFormData.expectedROI}
                        onChange={handleTokenTierFormChange}
                        placeholder="12.5"
                        min="0"
                        step="0.1"
                        className="w-full px-4 py-2 text-sm border border-input/70 bg-card/50 text-card-foreground rounded-xl"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        Apartment Type
                      </label>
                      <input
                        type="text"
                        name="apartmentType"
                        value={tokenTierFormData.apartmentType}
                        onChange={handleTokenTierFormChange}
                        placeholder="e.g., Studio, 1BR, 2BR"
                        className="w-full px-4 py-2 text-sm border border-input/70 bg-card/50 text-card-foreground rounded-xl"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        Display Order
                      </label>
                      <input
                        type="number"
                        name="displayOrder"
                        value={tokenTierFormData.displayOrder}
                        onChange={handleTokenTierFormChange}
                        placeholder="0"
                        min="0"
                        step="1"
                        className="w-full px-4 py-2 text-sm border border-input/70 bg-card/50 text-card-foreground rounded-xl"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        Description
                      </label>
                      <textarea
                        name="description"
                        value={tokenTierFormData.description}
                        onChange={handleTokenTierFormChange}
                        placeholder="Token tier description..."
                        rows="3"
                        className="w-full px-4 py-2 text-sm border border-input/70 bg-card/50 text-card-foreground rounded-xl"
                      />
                    </div>

                    <div className="md:col-span-2 flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="isActive"
                        checked={tokenTierFormData.isActive}
                        onChange={handleTokenTierFormChange}
                        className="h-4 w-4 text-primary focus:ring-ring border-input rounded"
                      />
                      <label className="text-sm text-foreground">Active (available for investment)</label>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      onClick={addTokenTier}
                      disabled={!!tokenTierValidationError || !!tokenTierValueValidationError}
                      className="flex-1 bg-purple-500 hover:bg-purple-600 text-white"
                    >
                      {editingTierIndex !== null ? 'Update Token Tier' : 'Add Token Tier'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowTokenTierForm(false);
                        setEditingTierIndex(null);
                        setTokenTierValidationError('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : null}

              {tokenTiers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Hash className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No token tiers added yet</p>
                  <p className="text-xs mt-1">Add token tiers to define different investment options for this asset</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tokenTiers
                    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
                    .map((tier, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-4 bg-accent/10 rounded-xl border border-border/40 hover:border-border/60 transition-all"
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div
                            className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm"
                            style={{ backgroundColor: tier.color || '#CD7F32' }}
                          >
                            {tier.tokenSymbol}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h6 className="text-base font-semibold text-card-foreground">
                                {tier.name}
                              </h6>
                              {!tier.isActive && (
                                <span className="px-2 py-0.5 text-xs bg-red-500/10 text-red-600 rounded">Inactive</span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-4 mt-1 text-sm text-muted-foreground">
                              {(() => {
                                // Calculate price per token: use stored pricePerTokenUSDT or calculate from totalValueUSDT
                                const pricePerToken = tier.pricePerTokenUSDT !== undefined
                                  ? parseFloat(tier.pricePerTokenUSDT)
                                  : (tier.totalValueUSDT && tier.totalTokens 
                                      ? parseFloat(tier.totalValueUSDT) / parseFloat(tier.totalTokens)
                                      : 0);
                                // Calculate total value: use totalValueUSDT or calculate from pricePerTokenUSDT
                                const totalValue = tier.totalValueUSDT !== undefined
                                  ? parseFloat(tier.totalValueUSDT)
                                  : (tier.pricePerTokenUSDT && tier.totalTokens
                                      ? parseFloat(tier.pricePerTokenUSDT) * parseFloat(tier.totalTokens)
                                      : 0);
                                return (
                                  <>
                                    <span>Total Value: ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    <span>Price/Token: ${pricePerToken.toFixed(2)}</span>
                                    <span>ROI: {parseFloat(tier.expectedROI || 0).toFixed(2)}%</span>
                                    <span>Tokens: {parseFloat(tier.totalTokens || 0).toLocaleString()}</span>
                                    {tier.apartmentType && <span>Type: {tier.apartmentType}</span>}
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => editTokenTier(index)}
                            className="px-3 py-1.5"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => removeTokenTier(index)}
                            className="px-3 py-1.5 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </Card>
          )}

          {/* Optional Display Information */}
          <Card className="p-6 md:p-8 bg-card/60 backdrop-blur-sm border border-border/40 shadow-sm hover:shadow-lg transition-all duration-300 rounded-xl">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border/30">
              <div className="p-2 rounded-lg bg-muted/50">
                <Edit className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-card-foreground">
                  Display Information
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">Optional details for public display</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Asset Title
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleTitleChange}
                  placeholder="Enter property title"
                  className="w-full px-4 py-3 text-sm border border-input/70 bg-card/50 text-card-foreground placeholder:text-muted-foreground rounded-xl transition-all duration-200 focus:ring-2 focus:ring-primary/30 focus:border-primary hover:border-input hover:bg-card shadow-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Slug
                </label>
                <input
                  type="text"
                  name="slug"
                  value={formData.slug}
                  onChange={handleChange}
                  placeholder="property-slug"
                  className="w-full px-4 py-3 text-sm border border-input/70 bg-card/50 text-card-foreground placeholder:text-muted-foreground rounded-xl transition-all duration-200 focus:ring-2 focus:ring-primary/30 focus:border-primary hover:border-input hover:bg-card shadow-sm"
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="block text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                  <span>Description</span>
                  <span className="text-red-500 text-xs">*</span>
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  required
                  rows={4}
                  placeholder="Enter a detailed description of the property..."
                  className="w-full px-4 py-3 text-sm border border-input/70 bg-card/50 text-card-foreground placeholder:text-muted-foreground rounded-xl transition-all duration-200 focus:ring-2 focus:ring-primary/30 focus:border-primary hover:border-input hover:bg-card shadow-sm resize-y"
                />
              </div>
              {/* COMMENTED OUT: Short Description - Not in DB */}
              {/* <div className="md:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-1">
                  Short Description *
                </label>
                <textarea
                  name="short_description"
                  value={formData.short_description}
                  onChange={handleChange}
                  required
                  rows={2}
                  className="w-full px-3 py-2 border border-input bg-card text-card-foreground placeholder:text-muted-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-ring"
                />
              </div> */}
            </div>
          </Card>

          {/* Custody Location */}
          <Card className="p-6">
            <h4 className="text-lg font-semibold text-card-foreground mb-4 flex items-center">
              <MapPin className="w-5 h-5 mr-2" />
              Custody Location
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* COMMENTED OUT: Address - Not in DB */}
              {/* <div className="md:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-1">
                  Address *
                </label>
                <textarea
                  name="location_address"
                  value={formData.location_address}
                  onChange={handleChange}
                  required
                  rows={2}
                  className="w-full px-3 py-2 border border-input bg-card text-card-foreground placeholder:text-muted-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-ring"
                />
              </div> */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Custody City *
                </label>
                <input
                  type="text"
                  name="location_city"
                  value={formData.location_city}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-input bg-card text-card-foreground placeholder:text-muted-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-ring"
                />
              </div>
              {/* COMMENTED OUT: State - Not in DB */}
              {/* <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  State *
                </label>
                <input
                  type="text"
                  name="location_state"
                  value={formData.location_state}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-input bg-card text-card-foreground placeholder:text-muted-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-ring"
                />
              </div> */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Custody Country *
                </label>
                <input
                  type="text"
                  name="location_country"
                  value={formData.location_country}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-input bg-card text-card-foreground placeholder:text-muted-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-ring"
                />
              </div>
              {/* COMMENTED OUT: Latitude/Longitude - Not in DB */}
              {/* <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Latitude
                </label>
                <input
                  type="number"
                  step="any"
                  name="location_latitude"
                  value={formData.location_latitude}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-input bg-card text-card-foreground placeholder:text-muted-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-ring"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Longitude
                </label>
                <input
                  type="number"
                  step="any"
                  name="location_longitude"
                  value={formData.location_longitude}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-input bg-card text-card-foreground placeholder:text-muted-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-ring"
                />
              </div> */}
            </div>
            
            {/* COMMENTED OUT: Location Map - Not in DB */}
            {/* <div className="mt-4">
              <label className="block text-sm font-medium text-foreground mb-2">
                Property Location Map
              </label>
              <p className="text-sm text-muted-foreground mb-3">
                Enter coordinates manually or use the map links to verify location. The latitude and longitude will be updated automatically.
              </p>
              <SimpleMap
                latitude={formData.location_latitude}
                longitude={formData.location_longitude}
                onLocationChange={handleLocationChange}
                height="400px"
              />
            </div> */}
          </Card>
            </>
          )}

          {/* STEP 2: Financial & Project Details - COMMENTED OUT (Not in DB) */}
          {/* All fields in Step 2 (Property Details, Pricing, Tokenization, Specifications, Unit Types) are not in database schema */}
          {false && currentStep === 2 && (
            <>
          {/* Property Details */}
          <Card className="p-6">
            <h4 className="text-lg font-semibold text-card-foreground mb-4 flex items-center">
              <Building2 className="w-5 h-5 mr-2" />
              Property Details
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Property Type *
                </label>
                <select
                  name="property_type"
                  value={formData.property_type}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-input bg-card text-card-foreground placeholder:text-muted-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-ring"
                >
                  <option value="residential">Residential</option>
                  <option value="commercial">Commercial</option>
                  <option value="mixed-use">Mixed Use</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Project Type *
                </label>
                <select
                  name="project_type"
                  value={formData.project_type}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-input bg-card text-card-foreground placeholder:text-muted-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-ring"
                >
                  <option value="">Select Project Type</option>
                  <option value="residential">Residential</option>
                  <option value="commercial">Commercial</option>
                  <option value="mixed-use">Mixed Use</option>
                  <option value="residential-commercial">Residential-Commercial</option>
                  <option value="retail">Retail</option>
                  <option value="office">Office</option>
                  <option value="industrial">Industrial</option>
                  <option value="hospitality">Hospitality</option>
                  <option value="healthcare">Healthcare</option>
                  <option value="educational">Educational</option>
                  <option value="recreational">Recreational</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Status *
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-input bg-card text-card-foreground placeholder:text-muted-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-ring"
                >
                  <option value="active">✅ Active</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Floors *
                </label>
                <input
                  type="text"
                  name="floors"
                  value={formData.floors}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-input bg-card text-card-foreground placeholder:text-muted-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-ring"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Total Units *
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  name="total_units"
                  value={formData.total_units}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-input bg-card text-card-foreground placeholder:text-muted-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-ring"
                  placeholder="Enter number of units (1-10)"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Unit types will be automatically generated based on this number
                </p>
              </div>
              {/* Date fields - only show when construction is below 100% */}
              {formData.construction_progress < 100 && (
                <>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-input bg-card text-card-foreground placeholder:text-muted-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-ring"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Expected Completion
                </label>
                <input
                  type="date"
                  name="expected_completion"
                  value={formData.expected_completion}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-input bg-card text-card-foreground placeholder:text-muted-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-ring"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Handover Date
                </label>
                <input
                  type="date"
                  name="handover_date"
                  value={formData.handover_date}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-input bg-card text-card-foreground placeholder:text-muted-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-ring"
                />
              </div>
                </>
              )}
            </div>
          </Card>

          {/* Pricing Information */}
          <Card className="p-6">
            <h4 className="text-lg font-semibold text-card-foreground mb-4 flex items-center">
              <DollarSign className="w-5 h-5 mr-2" />
              Pricing Information
            </h4>
            <p className="text-sm text-muted-foreground mb-4">
              💡 Note: Total Value and Expected ROI are set in Basic Information above and will auto-sync here.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Market Value (USD) *
                </label>
                <input
                  type="text"
                  name="pricing_market_value"
                  value={formData.pricing_market_value}
                  onChange={handleChange}
                  required
                  placeholder="e.g., 12000000000"
                  className="w-full px-3 py-2 border border-input bg-card text-card-foreground placeholder:text-muted-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-ring"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Appreciation (%)
                </label>
                <input
                  type="text"
                  name="pricing_appreciation"
                  value={formData.pricing_appreciation}
                  onChange={handleChange}
                  placeholder="e.g., 20"
                  className="w-full px-3 py-2 border border-input bg-card text-card-foreground placeholder:text-muted-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-ring"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Min Investment (USD) *
                </label>
                <input
                  type="text"
                  name="pricing_min_investment"
                  value={formData.pricing_min_investment}
                  onChange={handleChange}
                  required
                  placeholder="e.g., 400000"
                  className="w-full px-3 py-2 border border-input bg-card text-card-foreground placeholder:text-muted-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-ring"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Listing Price Formatted
                </label>
                <input
                  type="text"
                  name="listing_price_formatted"
                  value={formData.listing_price_formatted}
                  onChange={handleChange}
                  placeholder="e.g., $12B"
                  className="w-full px-3 py-2 border border-input bg-card text-card-foreground placeholder:text-muted-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-ring"
                />
              </div>
            </div>
          </Card>

          {/* Tokenization Information */}
          <Card className="p-6">
            <h4 className="text-lg font-semibold text-card-foreground mb-4 flex items-center">
              <Hash className="w-5 h-5 mr-2" />
              Tokenization Information
            </h4>
            <p className="text-sm text-muted-foreground mb-4">
              💡 Note: Total Tokens is set in Basic Information above. Available Tokens cannot exceed Total Tokens. You can increase Available Tokens over time (up to Total Tokens limit). Price Per Token is auto-calculated.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Available Tokens *
                  {formData.totalTokens && formData.tokenization_available_tokens && (
                    <span className={`ml-2 text-xs ${parseFloat(formData.tokenization_available_tokens) > parseFloat(formData.totalTokens) ? 'text-red-500' : 'text-green-500'}`}>
                      ({formData.tokenization_available_tokens} / {formData.totalTokens})
                    </span>
                  )}
                </label>
                <input
                  type="number"
                  name="tokenization_available_tokens"
                  value={formData.tokenization_available_tokens}
                  onChange={handleChange}
                  required
                  min="0"
                  max={formData.totalTokens || undefined}
                  step="1"
                  className={`w-full px-3 py-2 border ${
                    formData.totalTokens && formData.tokenization_available_tokens && 
                    parseFloat(formData.tokenization_available_tokens) > parseFloat(formData.totalTokens)
                      ? 'border-red-500 focus:ring-red-500' 
                      : 'border-input focus:ring-ring'
                  } bg-card text-card-foreground placeholder:text-muted-foreground rounded-lg focus:ring-2 focus:border-ring`}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Tokens available to the public (cannot exceed {formData.totalTokens || 'Total Tokens'})
                </p>
                {formData.totalTokens && formData.tokenization_available_tokens && 
                 parseFloat(formData.tokenization_available_tokens) > parseFloat(formData.totalTokens) && (
                  <p className="text-xs text-red-500 mt-1">
                    ⚠️ Available Tokens cannot exceed Total Tokens. It will be automatically capped.
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Price Per Token (USD) * 
                  <span className="text-xs text-primary ml-1">(Auto-calculated)</span>
                </label>
                <input
                  type="text"
                  name="tokenization_price_per_token"
                  value={formData.tokenization_price_per_token}
                  onChange={handleChange}
                  required
                  placeholder="e.g., 100000"
                  className="w-full px-3 py-2 border border-input bg-card text-card-foreground placeholder:text-muted-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-ring bg-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Token Price (USD) * 
                  <span className="text-xs text-primary ml-1">(Auto-calculated)</span>
                </label>
                <input
                  type="text"
                  name="tokenization_token_price"
                  value={formData.tokenization_token_price}
                  onChange={handleChange}
                  required
                  placeholder="e.g., 100000"
                  className="w-full px-3 py-2 border border-input bg-card text-card-foreground placeholder:text-muted-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-ring bg-accent"
                />
              </div>
            </div>
          </Card>

          {/* Property Specifications */}
          <Card className="p-6">
            <h4 className="text-lg font-semibold text-card-foreground mb-4 flex items-center">
              <Building2 className="w-5 h-5 mr-2" />
              Property Specifications
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Bedrooms
                </label>
                <input
                  type="number"
                  name="bedrooms"
                  value={formData.bedrooms}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-input bg-card text-card-foreground placeholder:text-muted-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-ring"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Bathrooms
                </label>
                <input
                  type="number"
                  name="bathrooms"
                  value={formData.bathrooms}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-input bg-card text-card-foreground placeholder:text-muted-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-ring"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Area (sqm)
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="area_sqm"
                  value={formData.area_sqm}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-input bg-card text-card-foreground placeholder:text-muted-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-ring"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Appreciation Percentage
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="appreciation_percentage"
                  value={formData.appreciation_percentage}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-input bg-card text-card-foreground placeholder:text-muted-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-ring"
                />
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="is_rented"
                    checked={formData.is_rented}
                    onChange={handleChange}
                    className="h-4 w-4 text-primary focus:ring-ring border-input rounded"
                  />
                  <span className="ml-2 text-sm text-foreground">Is Rented</span>
                </label>
              </div>
            </div>
          </Card>

          {/* Unit Types */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-card-foreground">Unit Types</h4>
              <p className="text-sm text-muted-foreground">
                {formData.unit_types.length > 0 ? `${formData.unit_types.length} units generated` : 'Enter Total Units above to auto-generate'}
              </p>
            </div>
            {formData.unit_types.length > 0 && (
              <p className="text-xs text-muted-foreground mb-4">
                💡 Click the edit button to modify any unit type. You can change the type, size, or count.
              </p>
            )}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <input
                  type="text"
                  placeholder="Unit Type (e.g., 2 Bedroom)"
                  value={newUnitType.type}
                  onChange={(e) => setNewUnitType(prev => ({ ...prev, type: e.target.value }))}
                  className="px-3 py-2 border border-input bg-card text-card-foreground placeholder:text-muted-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-ring"
                />
                <input
                  type="text"
                  placeholder="Size (e.g., 1200 sq ft)"
                  value={newUnitType.size}
                  onChange={(e) => setNewUnitType(prev => ({ ...prev, size: e.target.value }))}
                  className="px-3 py-2 border border-input bg-card text-card-foreground placeholder:text-muted-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-ring"
                />
                <input
                  type="text"
                  placeholder="Count (e.g., 1)"
                  value={newUnitType.count}
                  onChange={(e) => setNewUnitType(prev => ({ ...prev, count: e.target.value }))}
                  className="px-3 py-2 border border-input bg-card text-card-foreground placeholder:text-muted-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-ring"
                />
                <Button type="button" onClick={addUnitType} className="flex items-center space-x-2">
                  <Plus className="w-4 h-4" />
                  <span>Add</span>
                </Button>
              </div>
              {Array.isArray(formData.unit_types) && formData.unit_types.map((unit, index) => (
                <div key={index} className="p-3 bg-accent rounded-lg">
                  {editingUnitIndex === index ? (
                    // Edit Mode
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <input
                          type="text"
                          placeholder="Unit Type (e.g., 2 Bedroom)"
                          value={editingUnit.type}
                          onChange={(e) => setEditingUnit(prev => ({ ...prev, type: e.target.value }))}
                          className="px-3 py-2 border border-input bg-card text-card-foreground placeholder:text-muted-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-ring"
                        />
                        <input
                          type="text"
                          placeholder="Size (e.g., 1200 sq ft)"
                          value={editingUnit.size}
                          onChange={(e) => setEditingUnit(prev => ({ ...prev, size: e.target.value }))}
                          className="px-3 py-2 border border-input bg-card text-card-foreground placeholder:text-muted-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-ring"
                        />
                        <input
                          type="text"
                          placeholder="Count (e.g., 1)"
                          value={editingUnit.count}
                          onChange={(e) => setEditingUnit(prev => ({ ...prev, count: e.target.value }))}
                          className="px-3 py-2 border border-input bg-card text-card-foreground placeholder:text-muted-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-ring"
                        />
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          type="button"
                          onClick={saveUnitType}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Save
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={cancelEditUnitType}
                          size="sm"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // Display Mode
                    <div className="flex items-center justify-between">
                      <div className="flex space-x-4">
                        <span className="font-medium">{unit.type}</span>
                        <span className="text-muted-foreground">{unit.size}</span>
                        <span className="text-primary">Count: {unit.count}</span>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => editUnitType(index)}
                          className="text-primary hover:text-blue-700"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeUnitType(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
            </>
          )}

          {/* Token Tiers Management (Only for existing properties) - Show in Step 3 */}
          {currentStep === 3 && property && (property.id || property.displayCode) && (
            <Card className="p-6 md:p-8 bg-card/80 backdrop-blur-sm border border-border/60 shadow-sm hover:shadow-lg transition-all duration-300 rounded-xl">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-border/40">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <Hash className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-card-foreground">
                      Token Tiers
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">Manage multiple token tiers for this property</p>
                  </div>
                </div>
                {!showTokenForm && (
                  <Button
                    type="button"
                    onClick={() => {
                      setShowTokenForm(true);
                      setEditingToken(null);
                      setTokenFormData({
                        name: '',
                        color: '#CD7F32',
                        tokenSymbol: '',
                        pricePerTokenUSDT: '',
                        totalTokens: '',
                        expectedROI: '',
                        apartmentType: '',
                        apartmentFeatures: {},
                        description: '',
                        displayOrder: propertyTokens.length,
                        isActive: true,
                      });
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Token Tier</span>
                  </Button>
                )}
              </div>

              {showTokenForm ? (
                <div className="space-y-4 p-4 bg-accent/10 rounded-xl border border-border/40">
                  <div className="flex items-center justify-between mb-4">
                    <h5 className="text-base font-semibold text-card-foreground">
                      {editingToken ? 'Edit Token Tier' : 'Create New Token Tier'}
                    </h5>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowTokenForm(false);
                        setEditingToken(null);
                      }}
                      className="px-3 py-1.5"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        Token Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={tokenFormData.name}
                        onChange={handleTokenFormChange}
                        placeholder="e.g., Bronze Token"
                        className="w-full px-4 py-2 text-sm border border-input/70 bg-card/50 text-card-foreground rounded-xl"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        Token Symbol <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="tokenSymbol"
                        value={tokenFormData.tokenSymbol}
                        onChange={handleTokenFormChange}
                        placeholder="e.g., MBT (must be unique)"
                        className="w-full px-4 py-2 text-sm border border-input/70 bg-card/50 text-card-foreground rounded-xl uppercase"
                        required
                        maxLength={20}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        Color <span className="text-red-500">*</span>
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          name="color"
                          value={tokenFormData.color}
                          onChange={handleTokenFormChange}
                          className="w-16 h-10 rounded-xl border border-input/70"
                        />
                        <input
                          type="text"
                          name="color"
                          value={tokenFormData.color}
                          onChange={handleTokenFormChange}
                          placeholder="#CD7F32"
                          className="flex-1 px-4 py-2 text-sm border border-input/70 bg-card/50 text-card-foreground rounded-xl"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        Price per Token (USDT) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        name="pricePerTokenUSDT"
                        value={tokenFormData.pricePerTokenUSDT}
                        onChange={handleTokenFormChange}
                        placeholder="200.00"
                        min="0.000001"
                        step="0.01"
                        className="w-full px-4 py-2 text-sm border border-input/70 bg-card/50 text-card-foreground rounded-xl"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        Total Tokens <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        name="totalTokens"
                        value={tokenFormData.totalTokens}
                        onChange={handleTokenFormChange}
                        placeholder="1000"
                        min="1"
                        step="1"
                        className="w-full px-4 py-2 text-sm border border-input/70 bg-card/50 text-card-foreground rounded-xl"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        Expected ROI (%) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        name="expectedROI"
                        value={tokenFormData.expectedROI}
                        onChange={handleTokenFormChange}
                        placeholder="12.5"
                        min="0"
                        step="0.1"
                        className="w-full px-4 py-2 text-sm border border-input/70 bg-card/50 text-card-foreground rounded-xl"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        Apartment Type
                      </label>
                      <input
                        type="text"
                        name="apartmentType"
                        value={tokenFormData.apartmentType}
                        onChange={handleTokenFormChange}
                        placeholder="e.g., Studio, 1BR, 2BR"
                        className="w-full px-4 py-2 text-sm border border-input/70 bg-card/50 text-card-foreground rounded-xl"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        Display Order
                      </label>
                      <input
                        type="number"
                        name="displayOrder"
                        value={tokenFormData.displayOrder}
                        onChange={handleTokenFormChange}
                        placeholder="0"
                        min="0"
                        step="1"
                        className="w-full px-4 py-2 text-sm border border-input/70 bg-card/50 text-card-foreground rounded-xl"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        Description
                      </label>
                      <textarea
                        name="description"
                        value={tokenFormData.description}
                        onChange={handleTokenFormChange}
                        placeholder="Token tier description..."
                        rows="3"
                        className="w-full px-4 py-2 text-sm border border-input/70 bg-card/50 text-card-foreground rounded-xl"
                      />
                    </div>

                    <div className="md:col-span-2 flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="isActive"
                        checked={tokenFormData.isActive}
                        onChange={handleTokenFormChange}
                        className="h-4 w-4 text-primary focus:ring-ring border-input rounded"
                      />
                      <label className="text-sm text-foreground">Active (available for investment)</label>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      onClick={handleCreateToken}
                      className="flex-1 bg-purple-500 hover:bg-purple-600 text-white"
                    >
                      {editingToken ? 'Update Token Tier' : 'Create Token Tier'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowTokenForm(false);
                        setEditingToken(null);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {loadingTokens ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p className="text-sm">Loading token tiers...</p>
                    </div>
                  ) : propertyTokens.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Hash className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No token tiers created yet</p>
                      <p className="text-xs mt-1">Add token tiers to enable multi-token investments</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {propertyTokens
                        .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
                        .map((token) => (
                          <div
                            key={token.id}
                            className="flex items-center justify-between p-4 bg-accent/10 rounded-xl border border-border/40 hover:border-border/60 transition-all"
                          >
                            <div className="flex items-center gap-4 flex-1">
                              <div
                                className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm"
                                style={{ backgroundColor: token.color || '#CD7F32' }}
                              >
                                {token.tokenSymbol || token.displayCode}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h6 className="text-base font-semibold text-card-foreground">
                                    {token.name}
                                  </h6>
                                  {!token.isActive && (
                                    <span className="px-2 py-0.5 text-xs bg-red-500/10 text-red-600 rounded">Inactive</span>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-4 mt-1 text-sm text-muted-foreground">
                                  <span>Price: ${parseFloat(token.pricePerTokenUSDT || 0).toFixed(2)}</span>
                                  <span>ROI: {parseFloat(token.expectedROI || 0).toFixed(2)}%</span>
                                  <span>Available: {parseFloat(token.availableTokens || 0).toFixed(0)} / {parseFloat(token.totalTokens || 0).toFixed(0)}</span>
                                  {token.apartmentType && <span>Type: {token.apartmentType}</span>}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleEditToken(token)}
                                className="px-3 py-1.5"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleDeleteToken(token)}
                                className="px-3 py-1.5 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </>
              )}
            </Card>
          )}

          {/* STEP 3: Features, Media & Settings */}
          {currentStep === 3 && (
            <>
          {/* Features */}
          <Card className="p-6 md:p-8 bg-card/80 backdrop-blur-sm border border-border/60 shadow-sm hover:shadow-lg transition-all duration-300 rounded-xl">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border/40">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Settings className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-card-foreground">
                  Key Terms
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">Optional asset / offering terms</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
              Add key terms such as Shariah Compliant, Government-Backed, Fixed Profit Rate, Semi-Annual Distributions, etc.
            </p>
            <div className="space-y-4">
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Add a term (e.g., Shariah Compliant)"
                  value={newFeature}
                  onChange={(e) => setNewFeature(e.target.value)}
                  className="flex-1 px-4 py-3 text-sm border border-input/70 bg-card/50 text-card-foreground placeholder:text-muted-foreground rounded-xl transition-all duration-200 focus:ring-2 focus:ring-primary/30 focus:border-primary hover:border-input hover:bg-card shadow-sm"
                />
                <Button 
                  type="button" 
                  onClick={addFeature} 
                  className="flex items-center gap-2 px-5 bg-primary hover:bg-primary/90 text-white rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add</span>
                </Button>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {Array.isArray(formData.features) && formData.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2 bg-blue-500/10 text-blue-700 dark:text-blue-400 px-3 py-1.5 rounded-lg border border-blue-500/20 shadow-sm">
                    <span className="text-sm font-medium">{feature}</span>
                    <button
                      type="button"
                      onClick={() => removeFeature(index)}
                      className="text-blue-600 hover:text-blue-800 dark:hover:text-blue-300 transition-colors p-0.5 rounded hover:bg-blue-500/20"
                      aria-label="Remove feature"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Amenities */}
          <Card className="p-6 md:p-8 bg-card/80 backdrop-blur-sm border border-border/60 shadow-sm hover:shadow-lg transition-all duration-300 rounded-xl">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border/40">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Award className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-card-foreground">
                  Highlights
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">Optional investor-facing highlights</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
              Add highlights such as Investment Grade, Held to Maturity, Asset-Backed Sukuk, Tradable Secondary Market, etc.
            </p>
            <div className="space-y-4">
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Add a highlight (e.g., Investment Grade)"
                  value={newAmenity}
                  onChange={(e) => setNewAmenity(e.target.value)}
                  className="flex-1 px-4 py-3 text-sm border border-input/70 bg-card/50 text-card-foreground placeholder:text-muted-foreground rounded-xl transition-all duration-200 focus:ring-2 focus:ring-primary/30 focus:border-primary hover:border-input hover:bg-card shadow-sm"
                />
                <Button 
                  type="button" 
                  onClick={addAmenity} 
                  className="flex items-center gap-2 px-5 bg-primary hover:bg-primary/90 text-white rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add</span>
                </Button>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {Array.isArray(formData.amenities) && formData.amenities.map((amenity, index) => (
                  <div key={index} className="flex items-center gap-2 bg-green-500/10 text-green-700 dark:text-green-400 px-3 py-1.5 rounded-lg border border-green-500/20 shadow-sm">
                    <span className="text-sm font-medium">{amenity}</span>
                    <button
                      type="button"
                      onClick={() => removeAmenity(index)}
                      className="text-green-600 hover:text-green-800 dark:hover:text-green-300 transition-colors p-0.5 rounded hover:bg-green-500/20"
                      aria-label="Remove amenity"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Documents - Simplified Single Section */}
          <Card className="p-6 md:p-8 bg-card/80 backdrop-blur-sm border border-border/60 shadow-sm hover:shadow-lg transition-all duration-300 rounded-xl">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border/40">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <FileText className="w-5 h-5 text-purple-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-lg font-semibold text-card-foreground">
                      Documents <span className="text-red-500 text-sm">*</span>
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">At least one document is required</p>
                  </div>
                  <span className="text-sm font-semibold text-primary bg-primary/10 px-3 py-1 rounded-lg">
                    {(() => {
                      const count = (formData.documents.brochure ? 1 : 0) + 
                                   (formData.documents.floorPlan ? 1 : 0) + 
                                   (Array.isArray(formData.documents.compliance) ? formData.documents.compliance.length : 0);
                      return `${count} document${count !== 1 ? 's' : ''}`;
                    })()}
                  </span>
                </div>
              </div>
            </div>

              {/* File Upload Option */}
              <div className="mb-5 p-5 bg-gradient-to-br from-accent/50 to-accent/30 rounded-xl border border-border/50 shadow-sm">
                <label className="block text-sm font-semibold text-foreground mb-3">
                  Upload Document File
                </label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <input
                    ref={documentFileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx"
                    onChange={handleDocumentFileUpload}
                    className="hidden"
                    id="document-file-upload"
                    disabled={uploadingDocument}
                  />
                  <label
                    htmlFor="document-file-upload"
                    className="cursor-pointer inline-flex items-center px-5 py-3 border border-primary bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                  >
                    {uploadingDocument ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Choose File
                      </>
                    )}
                  </label>
                  <span className="text-xs text-muted-foreground leading-relaxed">
                    Supported: PDF, DOC, DOCX, TXT, XLS, XLSX, PPT, PPTX (Max 10MB)
                  </span>
                </div>
              </div>

            {/* Add Document Form */}
            <div className="mb-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <select
                  value={newDocument.type}
                  onChange={(e) => setNewDocument(prev => ({ ...prev, type: e.target.value }))}
                  className="px-4 py-3 text-sm border border-input/70 bg-card/50 text-card-foreground rounded-xl transition-all duration-200 focus:ring-2 focus:ring-primary/30 focus:border-primary hover:border-input hover:bg-card shadow-sm"
                >
                  <option value="">Select Document Type</option>
                  <option value="brochure">Brochure</option>
                  <option value="floorPlan">Floor Plan</option>
                  <option value="compliance">Compliance Document</option>
                </select>
                <input
                  type="url"
                  placeholder="Document URL (or upload file above)"
                  value={newDocument.url}
                  onChange={(e) => setNewDocument(prev => ({ ...prev, url: e.target.value }))}
                  className="px-4 py-3 text-sm border border-input/70 bg-card/50 text-card-foreground placeholder:text-muted-foreground rounded-xl transition-all duration-200 focus:ring-2 focus:ring-primary/30 focus:border-primary hover:border-input hover:bg-card shadow-sm"
                />
                {newDocument.type === 'brochure' && (
                <input
                  type="text"
                    placeholder="Brochure Name"
                  value={newDocument.name}
                  onChange={(e) => setNewDocument(prev => ({ ...prev, name: e.target.value }))}
                  className="px-4 py-3 text-sm border border-input/70 bg-card/50 text-card-foreground placeholder:text-muted-foreground rounded-xl transition-all duration-200 focus:ring-2 focus:ring-primary/30 focus:border-primary hover:border-input hover:bg-card shadow-sm"
                />
                )}
                {newDocument.type === 'floorPlan' && (
                <input
                    type="text"
                    placeholder="Version (e.g., A, B)"
                    value={newDocument.version}
                    onChange={(e) => setNewDocument(prev => ({ ...prev, version: e.target.value }))}
                  className="px-4 py-3 text-sm border border-input/70 bg-card/50 text-card-foreground placeholder:text-muted-foreground rounded-xl transition-all duration-200 focus:ring-2 focus:ring-primary/30 focus:border-primary hover:border-input hover:bg-card shadow-sm"
                />
                )}
                {newDocument.type === 'compliance' && (
                  <input
                    type="text"
                    placeholder="Type (e.g., Building Permit)"
                    value={newDocument.name}
                    onChange={(e) => setNewDocument(prev => ({ ...prev, name: e.target.value }))}
                  className="px-4 py-3 text-sm border border-input/70 bg-card/50 text-card-foreground placeholder:text-muted-foreground rounded-xl transition-all duration-200 focus:ring-2 focus:ring-primary/30 focus:border-primary hover:border-input hover:bg-card shadow-sm"
                  />
                )}
              </div>
              {(newDocument.type === 'brochure' || newDocument.type === 'compliance') && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {newDocument.type === 'brochure' && (
                    <input
                      type="text"
                      placeholder="Notes (optional)"
                      value={newDocument.notes}
                      onChange={(e) => setNewDocument(prev => ({ ...prev, notes: e.target.value }))}
                      className="px-4 py-3 text-sm border border-input/70 bg-card/50 text-card-foreground placeholder:text-muted-foreground rounded-xl transition-all duration-200 focus:ring-2 focus:ring-primary/30 focus:border-primary hover:border-input hover:bg-card shadow-sm"
                    />
                  )}
                  {newDocument.type === 'compliance' && (
                    <>
                      <input
                        type="text"
                        placeholder="Issued At (optional)"
                        value={newDocument.issuedAt}
                        onChange={(e) => setNewDocument(prev => ({ ...prev, issuedAt: e.target.value }))}
                        className="px-4 py-3 text-sm border border-input/70 bg-card/50 text-card-foreground placeholder:text-muted-foreground rounded-xl transition-all duration-200 focus:ring-2 focus:ring-primary/30 focus:border-primary hover:border-input hover:bg-card shadow-sm"
                      />
                      <input
                        type="text"
                        placeholder="Issued By (optional)"
                        value={newDocument.issuedBy}
                        onChange={(e) => setNewDocument(prev => ({ ...prev, issuedBy: e.target.value }))}
                        className="px-4 py-3 text-sm border border-input/70 bg-card/50 text-card-foreground placeholder:text-muted-foreground rounded-xl transition-all duration-200 focus:ring-2 focus:ring-primary/30 focus:border-primary hover:border-input hover:bg-card shadow-sm"
                      />
                    </>
                  )}
                </div>
              )}
                <Button 
                  type="button" 
                  onClick={addDocument} 
                disabled={!newDocument.url || !newDocument.type || (newDocument.type === 'brochure' && !newDocument.name) || (newDocument.type === 'compliance' && !newDocument.name)}
                className="w-full md:w-auto px-5 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                <Plus className="w-4 h-4 mr-2" />
                Add Document
                </Button>
              </div>

            {/* List of Added Documents */}
            <div className="space-y-3 mt-6">
              {formData.documents.brochure && (
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-accent/50 to-accent/30 rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-all duration-200">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="p-2 rounded-lg bg-purple-500/10 flex-shrink-0">
                      <FileText className="w-5 h-5 text-purple-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-card-foreground truncate">Brochure: {formData.documents.brochure.name}</p>
                      {formData.documents.brochure.notes && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">{formData.documents.brochure.notes}</p>
                      )}
                    </div>
                    <a 
                      href={formData.documents.brochure.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-primary hover:text-primary/80 text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-primary/10 transition-colors flex-shrink-0"
                    >
                      View
                    </a>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeDocument('brochure')}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 ml-2 flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
              {formData.documents.floorPlan && (
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-accent/50 to-accent/30 rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-all duration-200">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="p-2 rounded-lg bg-purple-500/10 flex-shrink-0">
                      <FileText className="w-5 h-5 text-purple-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-card-foreground">Floor Plan (Version {formData.documents.floorPlan.version})</p>
                    </div>
                    <a 
                      href={formData.documents.floorPlan.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-primary hover:text-primary/80 text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-primary/10 transition-colors flex-shrink-0"
                    >
                      View
                    </a>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeDocument('floorPlan')}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 ml-2 flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
              {Array.isArray(formData.documents.compliance) && formData.documents.compliance.map((comp, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-accent/50 to-accent/30 rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-all duration-200">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="p-2 rounded-lg bg-purple-500/10 flex-shrink-0">
                      <FileText className="w-5 h-5 text-purple-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-card-foreground truncate">{comp.type || comp.name}</p>
                      {comp.issuedAt && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">Issued: {comp.issuedAt} {comp.issuedBy ? `by ${comp.issuedBy}` : ''}</p>
                      )}
                    </div>
                    <a 
                      href={comp.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-primary hover:text-primary/80 text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-primary/10 transition-colors flex-shrink-0"
                    >
                      View
                    </a>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeDocument('compliance', index)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 ml-2 flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </Card>

          {/* COMMENTED OUT: Property Features - Not in DB */}
          {/* <Card className="p-6">
            <h4 className="text-lg font-semibold text-card-foreground mb-4">Property Features (optional)</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Add specific property features like premium finishes, high ceilings, balcony access, etc. This field is optional.
            </p>
            <div className="space-y-4">
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="Add a property feature"
                  value={newPropertyFeature}
                  onChange={(e) => setNewPropertyFeature(e.target.value)}
                  className="flex-1 px-3 py-2 border border-input bg-card text-card-foreground placeholder:text-muted-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-ring"
                />
                <Button type="button" onClick={addPropertyFeature} className="flex items-center space-x-2">
                  <Plus className="w-4 h-4" />
                  <span>Add</span>
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {Array.isArray(formData.property_features) && formData.property_features.map((feature, index) => (
                  <div key={index} className="flex items-center space-x-2 bg-purple-100 text-purple-800 px-3 py-1 rounded-full">
                    <span>{feature}</span>
                    <button
                      type="button"
                      onClick={() => removePropertyFeature(index)}
                      className="text-purple-600 hover:text-purple-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </Card> */}

          {/* Images */}
          <Card className="p-6 md:p-8 bg-card/80 backdrop-blur-sm border border-border/60 shadow-sm hover:shadow-lg transition-all duration-300 rounded-xl">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border/40">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <ImageIcon className="w-5 h-5 text-orange-500" />
              </div>
              <div className="flex-1">
                <h4 className="text-lg font-semibold text-card-foreground">
                  Images
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">Property photos and visuals</p>
              </div>
              {formData.images && formData.images.length > 0 && (
                <span className="text-sm font-semibold text-primary bg-primary/10 px-3 py-1 rounded-lg">
                  {formData.images.length} image{formData.images.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="space-y-5">
              {/* File Upload Option */}
              <div className="p-5 bg-gradient-to-br from-accent/50 to-accent/30 rounded-xl border border-border/50 shadow-sm">
                <label className="block text-sm font-semibold text-foreground mb-3">
                  Upload Image File
                </label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <input
                    ref={imageFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileUpload}
                    className="hidden"
                    id="image-file-upload"
                    disabled={uploadingImage}
                  />
                  <label
                    htmlFor="image-file-upload"
                    className="cursor-pointer inline-flex items-center px-5 py-3 border border-primary bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                  >
                    {uploadingImage ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Choose Image
                      </>
                    )}
                  </label>
                  <span className="text-xs text-muted-foreground leading-relaxed">
                    Supported: JPG, PNG, GIF, WEBP, SVG (Max 10MB)
                  </span>
                </div>
              </div>

              {/* Manual URL Entry or Upload Result */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="url"
                  placeholder="Image URL (auto-filled after upload or enter manually)"
                  value={newImage.url}
                  onChange={(e) => setNewImage(prev => ({ ...prev, url: e.target.value }))}
                  className="px-4 py-3 text-sm border border-input/70 bg-card/50 text-card-foreground placeholder:text-muted-foreground rounded-xl transition-all duration-200 focus:ring-2 focus:ring-primary/30 focus:border-primary hover:border-input hover:bg-card shadow-sm md:col-span-2"
                />
                <Button 
                  type="button" 
                  onClick={addImage} 
                  className="flex items-center justify-center gap-2 px-5 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={uploadingImage || !newImage.url}
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Image</span>
                </Button>
              </div>
              {newImage.url && (
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <p className="text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    <span>Image URL ready. Click "Add Image" to add it to the property.</span>
                  </p>
                </div>
              )}
              {formData.images && formData.images.length > 0 ? (
                <div className="space-y-3 mt-6">
                  {formData.images.map((imageUrl, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-accent/50 to-accent/30 rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-all duration-200">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="p-2 rounded-lg bg-orange-500/10 flex-shrink-0">
                          <ImageIcon className="w-5 h-5 text-orange-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-semibold text-sm text-card-foreground">Image {index + 1}</span>
                          <a 
                            href={imageUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="block text-primary hover:text-primary/80 text-xs mt-1 truncate max-w-md"
                          >
                            {imageUrl}
                          </a>
                        </div>
                        <a 
                          href={imageUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-primary hover:text-primary/80 text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-primary/10 transition-colors flex-shrink-0"
                        >
                          View
                        </a>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeImage(index)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 ml-2 flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center border border-dashed border-border/50 rounded-xl bg-accent/20">
                  <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground text-sm">No images added yet. Upload images above.</p>
                </div>
              )}
            </div>
          </Card>

          {/* COMMENTED OUT: SEO Information - Not in DB */}
          {/* <Card className="p-6">
            <h4 className="text-lg font-semibold text-card-foreground mb-4">SEO Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  SEO Title
                </label>
                <input
                  type="text"
                  value={seoData.title}
                  onChange={(e) => setSeoData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-input bg-card text-card-foreground placeholder:text-muted-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-ring"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  SEO Keywords
                </label>
                <input
                  type="text"
                  value={seoData.keywords}
                  onChange={(e) => setSeoData(prev => ({ ...prev, keywords: e.target.value }))}
                  className="w-full px-3 py-2 border border-input bg-card text-card-foreground placeholder:text-muted-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-ring"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-1">
                  SEO Description
                </label>
                <textarea
                  value={seoData.description}
                  onChange={(e) => setSeoData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-input bg-card text-card-foreground placeholder:text-muted-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-ring"
                />
              </div>
            </div>
          </Card> */}

          {/* COMMENTED OUT: Status and Visibility - Not in DB */}
          {/* <Card className="p-6">
            <h4 className="text-lg font-semibold text-card-foreground mb-4 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" />
              Status and Visibility
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Sort Order
                </label>
                <input
                  type="number"
                  name="sort_order"
                  value={formData.sort_order}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-input bg-card text-card-foreground placeholder:text-muted-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-ring"
                />
              </div>
              <div className="md:col-span-2">
                <div className="flex space-x-6">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="is_active"
                      checked={formData.is_active}
                      onChange={handleChange}
                      className="h-4 w-4 text-primary focus:ring-ring border-input rounded"
                    />
                    <span className="ml-2 text-sm text-foreground">Active Property</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="is_featured"
                      checked={formData.is_featured}
                      onChange={handleChange}
                      className="h-4 w-4 text-primary focus:ring-ring border-input rounded"
                    />
                    <span className="ml-2 text-sm text-foreground">Featured Property</span>
                  </label>
                </div>
              </div>
            </div>
          </Card> */}
            </>
          )}

          {/* Form Navigation Actions */}
          <div className="flex justify-between items-center pt-6 border-t border-border/50 mt-8 bg-gradient-to-r from-transparent via-accent/20 to-transparent px-2 -mx-2 py-4 rounded-lg">
            <div className="flex items-center gap-3">
              {/* Previous Button */}
              {currentStep > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePreviousStep}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl transition-all duration-200 hover:shadow-md"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </Button>
              )}
              
              {/* Cancel Button */}
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
                className="px-5 py-3 rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all duration-200 hover:shadow-md border-red-200 dark:border-red-900/30"
              >
                Cancel
              </Button>

              {/* Fill Random Values (Only on Step 1) */}
              {currentStep === 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={fillRandomValues}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl transition-all duration-200 hover:shadow-md"
                >
                  <Settings className="w-4 h-4" />
                  <span>Fill Random</span>
                </Button>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              {/* Step Progress Indicator */}
              <div className="text-sm text-muted-foreground font-medium hidden sm:block px-3 py-1.5 bg-accent/50 rounded-lg">
                Step {currentStep === 1 ? 1 : 2} of {totalSteps}
              </div>

              {/* Next Button or Submit Button - Hide Next button when editing, show only Submit */}
              {property ? (
                // When editing: Always show Submit button (users navigate via step indicators at top)
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isLoading ? 'Saving...' : 'Update Property'}</span>
                </Button>
              ) : currentStep < totalSteps ? (
                // When creating new: Show Next button until last step
                <Button
                  type="button"
                  onClick={handleNextStep}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50"
                >
                  <span>Next Step</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              ) : (
                // When creating new: Show Submit button on last step
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isLoading ? 'Saving...' : 'Create Property'}</span>
                </Button>
              )}
            </div>
          </div>
        </form>
        </div>
      </div>
  );

  // Return inline or modal based on prop
  if (inline) {
    return formContent;
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 h-full w-full z-50 flex items-start justify-center p-4 overflow-y-auto">
      {formContent}
    </div>
  );
};

export default PropertyForm;
