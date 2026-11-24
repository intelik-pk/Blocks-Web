import React, { useState, useEffect } from 'react';
import { X, Save, Building2, MapPin, DollarSign, TrendingUp, Hash, Plus, Trash2, Upload, FileText, ChevronRight, ChevronLeft, Check, Image as ImageIcon } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { propertyRequestsAPI, uploadAPI } from '../../services/api';
import { supabaseUpload } from '../../services/supabaseUpload';
import { useToast } from '../ui/Toast';
import { useOrganizationAuth } from './OrganizationAuth';
import {
  ASSET_CATEGORIES,
  ACTIVE_PHASE,
  RISK_RATINGS,
  CASH_FLOW_KINDS,
  getCategory,
  getDocumentLabel,
  isBankAsset,
} from '../../utils/assetCategories';

const PropertyRequestForm = ({ onSave, onCancel, isLoading, inline = false }) => {
  const toast = useToast();
  const { organizationUser, adminId } = useOrganizationAuth();
  const orgAdminId = adminId || organizationUser?.adminId || organizationUser?.id;
  const organizationId = organizationUser?.organizationId;

  // Debug: Log admin ID for troubleshooting
  React.useEffect(() => {
    console.log('🔍 PropertyRequestForm - Admin ID Debug:', {
      adminId,
      organizationUserAdminId: organizationUser?.adminId,
      organizationUserId: organizationUser?.id,
      finalOrgAdminId: orgAdminId,
      organizationUser: organizationUser
    });
  }, [adminId, organizationUser, orgAdminId]);
  
  const [currentStep, setCurrentStep] = useState(1);
  
  const [formData, setFormData] = useState({
    organizationId: organizationId || '',
    assetCategory: 'real_estate',
    title: '',
    slug: '',
    description: '',
    type: 'residential',
    maturityDate: '',
    riskRating: '',
    assetDetails: {},
    cashFlowSchedule: [],
    propertyStatus: 'planning',
    totalValueUSDT: '',
    totalTokens: '',
    expectedROI: '',
    city: 'Karachi',
    country: 'Pakistan',
    features: {},
    images: { urls: [] },
    documents: {
      brochure: null,
      floorPlan: null,
      compliance: []
    }
  });

  const isBank = isBankAsset(formData.assetCategory);
  const category = getCategory(formData.assetCategory);
  const stepLabels = isBank ? ['Asset Overview', 'Asset Details', 'Offering & Documents'] : ['Basic Info', 'Details'];
  const totalSteps = stepLabels.length;

  const handleCategoryChange = (e) => {
    const nextCategory = e.target.value;
    const next = getCategory(nextCategory);
    setFormData(prev => ({
      ...prev,
      assetCategory: nextCategory,
      type: next.types[0].value,
      propertyStatus: isBankAsset(nextCategory) && prev.propertyStatus === 'construction' ? 'planning' : prev.propertyStatus,
      assetDetails: {},
      cashFlowSchedule: [],
      maturityDate: '',
      riskRating: '',
    }));
    setCurrentStep(1);
  };

  const handleDetailChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      assetDetails: { ...prev.assetDetails, [field.key]: value },
    }));
  };

  const addCashFlowRow = () => {
    setFormData(prev => ({
      ...prev,
      cashFlowSchedule: [
        ...prev.cashFlowSchedule,
        { dueDate: '', amountUSDT: '', kind: category.defaultCashFlowKind || 'repayment' },
      ],
    }));
  };

  const updateCashFlowRow = (index, key, value) => {
    setFormData(prev => ({
      ...prev,
      cashFlowSchedule: prev.cashFlowSchedule.map((row, i) => (i === index ? { ...row, [key]: value } : row)),
    }));
  };

  const removeCashFlowRow = (index) => {
    setFormData(prev => ({
      ...prev,
      cashFlowSchedule: prev.cashFlowSchedule.filter((_, i) => i !== index),
    }));
  };

  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [selectedDocumentType, setSelectedDocumentType] = useState('brochure'); // 'brochure', 'floorPlan', 'compliance'
  const imageFileInputRef = React.useRef(null);
  const documentFileInputRef = React.useRef(null);

  // Generate slug from title
  const generateSlug = (title) => {
    if (!title) return '';
    return title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .replace(/(^-|-$)/g, ''); // Remove leading/trailing hyphens
  };

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    
    // If title changes, auto-update slug
    if (name === 'title') {
      const slug = generateSlug(value);
      setFormData(prev => ({
        ...prev,
        title: value,
        slug: slug
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'number' ? (value === '' ? '' : parseFloat(value) || '') : value
      }));
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const result = await supabaseUpload.uploadImage(file, 'properties');
      setFormData(prev => ({
        ...prev,
        images: {
          urls: [...(prev.images?.urls || []), result.url]
        }
      }));
      toast.success('Image uploaded successfully');
    } catch (error) {
      console.error('Image upload error:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploadingImage(false);
      if (imageFileInputRef.current) {
        imageFileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: {
        urls: prev.images?.urls?.filter((_, i) => i !== index) || []
      }
    }));
  };

  const handleDocumentUpload = async (e, docType) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingDocument(true);
    try {
      const result = await supabaseUpload.uploadDocument(file, 'documents');
      const url = result.url;
      if (docType === 'compliance') {
        setFormData(prev => ({
          ...prev,
          documents: {
            ...prev.documents,
            compliance: [...(prev.documents.compliance || []), { url, name: file.name }]
          }
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          documents: {
            ...prev.documents,
            [docType]: { url, name: file.name }
          }
        }));
      }
      toast.success('Document uploaded successfully');
    } catch (error) {
      console.error('Document upload error:', error);
      toast.error('Failed to upload document');
    } finally {
      setUploadingDocument(false);
      if (documentFileInputRef.current) {
        documentFileInputRef.current.value = '';
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only submit if we're on the last step
    if (currentStep < totalSteps) {
      // If not on last step, just go to next step instead
      handleNextStep(e);
      return;
    }
    
    if (!orgAdminId) {
      toast.error('Organization admin ID is required');
      return;
    }

    if (!formData.title || !formData.slug || !formData.organizationId) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Validate and convert number fields
    if (!formData.totalValueUSDT || formData.totalValueUSDT === '') {
      toast.error('Please enter Total Value (USDT)');
      return;
    }
    if (!formData.totalTokens || formData.totalTokens === '') {
      toast.error('Please enter Total Tokens');
      return;
    }
    if (!formData.expectedROI || formData.expectedROI === '') {
      toast.error(`Please enter ${category.returnLabel.replace(' (%)', '')}`);
      return;
    }

    const { maturityDate, riskRating, assetDetails, cashFlowSchedule, ...baseData } = formData;

    // Prepare form data with converted numbers
    const submitData = {
      ...baseData,
      totalValueUSDT: parseFloat(formData.totalValueUSDT) || 0,
      totalTokens: parseFloat(formData.totalTokens) || 0,
      expectedROI: parseFloat(formData.expectedROI) || 0
    };

    if (isBank) {
      if (!maturityDate) {
        toast.error('Please enter the maturity date');
        return;
      }
      if (!riskRating) {
        toast.error('Please select a risk rating');
        return;
      }
      const incompleteRow = cashFlowSchedule.findIndex(row => !row.dueDate || row.amountUSDT === '' || row.amountUSDT === null);
      if (incompleteRow !== -1) {
        toast.error(`Cash-flow row ${incompleteRow + 1} needs a due date and amount`);
        return;
      }

      const normalizedDetails = {};
      category.detailFields.forEach(field => {
        const value = assetDetails[field.key];
        if (value === undefined || value === '') return;
        normalizedDetails[field.key] = field.type === 'number' ? parseFloat(value) : value;
      });

      submitData.maturityDate = maturityDate;
      submitData.riskRating = riskRating;
      submitData.assetDetails = normalizedDetails;
      submitData.cashFlowSchedule = cashFlowSchedule.map(row => ({
        dueDate: row.dueDate,
        amountUSDT: parseFloat(row.amountUSDT) || 0,
        kind: row.kind,
      }));
    }

    try {
      const response = await propertyRequestsAPI.create(submitData, orgAdminId);
      toast.success('Property request submitted successfully!');
      if (onSave) onSave(response);
    } catch (error) {
      console.error('Submit error:', error);
      toast.error(error.response?.data?.message || 'Failed to submit property request');
    }
  };

  const handleNextStep = (e) => {
    e.preventDefault(); // Prevent form submission
    e.stopPropagation(); // Stop event bubbling
    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const formContent = (
    <div className={`${inline ? 'w-full' : 'bg-white rounded-lg shadow-xl max-w-4xl w-full mx-auto my-8'} p-6`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">{isBank ? `New Asset Request — ${category.label}` : 'Request New Property'}</h2>
        {!inline && (
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Progress Steps */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          {stepLabels.map((label, index) => index + 1).map((step) => (
            <React.Fragment key={step}>
              <div className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  currentStep >= step ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {currentStep > step ? <Check className="w-5 h-5" /> : step}
                </div>
                <span className={`ml-2 ${currentStep >= step ? 'text-primary' : 'text-gray-600'}`}>
                  {stepLabels[step - 1]}
                </span>
              </div>
              {step < totalSteps && (
                <div className={`flex-1 h-1 mx-4 ${currentStep > step ? 'bg-primary' : 'bg-gray-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {currentStep === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Asset Category *
              </label>
              <select
                name="assetCategory"
                value={formData.assetCategory}
                onChange={handleCategoryChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                {Object.entries(ASSET_CATEGORIES).map(([key, def]) => (
                  <option key={key} value={key} disabled={def.phase > ACTIVE_PHASE}>
                    {def.label}{def.phase > ACTIVE_PHASE ? ' (Phase 2 – coming soon)' : ''}
                  </option>
                ))}
              </select>
              {isBank && category.description && (
                <p className="text-xs text-gray-500 mt-1">{category.description}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {isBank ? 'Asset Title *' : 'Property Title *'}
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder={isBank ? 'e.g., Auto Loan Pool 2026-A' : 'e.g., Marina View Residences'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                URL Slug *
              </label>
              <input
                type="text"
                name="slug"
                value={formData.slug}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder={isBank ? 'e.g., abl-sukuk-2026-a' : 'e.g., marina-view-residences'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder={isBank ? 'Describe the asset and the cash flows backing the tokens...' : 'Describe the property...'}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type *
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  {category.types.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {isBank ? 'Offering Status' : 'Property Status'}
                </label>
                <select
                  name="propertyStatus"
                  value={formData.propertyStatus}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="planning">Planning</option>
                  {!isBank && <option value="construction">Construction</option>}
                  <option value="active">Active</option>
                  <option value="onhold">On Hold</option>
                  <option value="soldout">Sold Out</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {isBank ? 'Custody City' : 'City'}
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder={isBank ? 'e.g., Karachi' : ''}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {isBank ? 'Custody Country' : 'Country'}
                </label>
                <input
                  type="text"
                  name="country"
                  value={formData.country}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder={isBank ? 'e.g., Pakistan' : ''}
                />
              </div>
            </div>
          </div>
        )}

        {isBank && currentStep === 2 && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maturity Date *
                </label>
                <input
                  type="date"
                  name="maturityDate"
                  value={formData.maturityDate}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Risk Rating *
                </label>
                <select
                  name="riskRating"
                  value={formData.riskRating}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">Select rating</option>
                  {RISK_RATINGS.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>

            {category.detailFields.length > 0 && (
              <div className="grid grid-cols-2 gap-4">
                {category.detailFields.map(field => (
                  <div key={field.key}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {field.label}
                    </label>
                    {field.type === 'select' ? (
                      <select
                        value={formData.assetDetails[field.key] || ''}
                        onChange={(e) => handleDetailChange(field, e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      >
                        <option value="">Select</option>
                        {field.options.map(o => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.type}
                        value={formData.assetDetails[field.key] ?? ''}
                        onChange={(e) => handleDetailChange(field, e.target.value)}
                        min={field.type === 'number' ? '0' : undefined}
                        step={field.type === 'number' ? 'any' : undefined}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Cash-flow Schedule
                </label>
                <Button type="button" variant="outline" size="sm" onClick={addCashFlowRow}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Payment
                </Button>
              </div>
              <p className="text-xs text-gray-500 mb-3">
                Expected payments backing the tokens (e.g. repayments, profit, collections).
              </p>
              {formData.cashFlowSchedule.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500">
                  No payments added yet
                </div>
              ) : (
                <div className="space-y-2">
                  {formData.cashFlowSchedule.map((row, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-center">
                      <input
                        type="date"
                        value={row.dueDate}
                        onChange={(e) => updateCashFlowRow(index, 'dueDate', e.target.value)}
                        className="col-span-4 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                      <select
                        value={row.kind}
                        onChange={(e) => updateCashFlowRow(index, 'kind', e.target.value)}
                        className="col-span-4 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      >
                        {CASH_FLOW_KINDS.map(k => (
                          <option key={k.value} value={k.value}>{k.label}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        placeholder="Amount (USDT)"
                        value={row.amountUSDT}
                        min="0"
                        step="0.01"
                        onChange={(e) => updateCashFlowRow(index, 'amountUSDT', e.target.value)}
                        className="col-span-3 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={() => removeCashFlowRow(index)}
                        className="col-span-1 flex justify-center text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {currentStep === totalSteps && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {isBank ? 'Asset Value (USDT) *' : 'Total Value (USDT) *'}
                </label>
                <input
                  type="number"
                  name="totalValueUSDT"
                  value={formData.totalValueUSDT}
                  onChange={handleInputChange}
                  required
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {isBank ? 'Token Supply *' : 'Total Tokens *'}
                </label>
                <input
                  type="number"
                  name="totalTokens"
                  value={formData.totalTokens}
                  onChange={handleInputChange}
                  required
                  min="1"
                  step="1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {category.returnLabel} *
                </label>
                <input
                  type="number"
                  name="expectedROI"
                  value={formData.expectedROI}
                  onChange={handleInputChange}
                  required
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>

            {isBank && parseFloat(formData.totalValueUSDT) > 0 && parseFloat(formData.totalTokens) > 0 && (
              <p className="text-sm text-gray-600">
                Token price: <span className="font-semibold">{(parseFloat(formData.totalValueUSDT) / parseFloat(formData.totalTokens)).toLocaleString(undefined, { maximumFractionDigits: 6 })} USDT</span>
              </p>
            )}

            {/* Images */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {isBank ? 'Asset Cover Image (optional)' : 'Property Images'}
              </label>
              <input
                ref={imageFileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <Button
                type="button"
                onClick={() => imageFileInputRef.current?.click()}
                disabled={uploadingImage}
                className="mb-4"
              >
                <Upload className="w-4 h-4 mr-2" />
                {uploadingImage ? 'Uploading...' : 'Upload Image'}
              </Button>
              <div className="grid grid-cols-4 gap-4">
                {formData.images?.urls?.map((url, index) => (
                  <div key={index} className="relative">
                    <img src={url} alt={`${isBank ? 'Asset' : 'Property'} ${index + 1}`} className="w-full h-32 object-cover rounded-lg" />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Documents */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Documents
              </label>
              <div className="flex gap-2 mb-3">
                <select
                  value={selectedDocumentType}
                  onChange={(e) => setSelectedDocumentType(e.target.value)}
                  className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="brochure">{getDocumentLabel(formData.assetCategory, 'brochure')}</option>
                  <option value="floorPlan">{getDocumentLabel(formData.assetCategory, 'floorPlan')}</option>
                  <option value="compliance">{getDocumentLabel(formData.assetCategory, 'compliance')}</option>
                </select>
                <input
                  ref={documentFileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => handleDocumentUpload(e, selectedDocumentType)}
                  className="hidden"
                />
                <Button
                  type="button"
                  onClick={() => documentFileInputRef.current?.click()}
                  disabled={uploadingDocument}
                  variant="outline"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  {uploadingDocument ? 'Uploading...' : 'Upload Document'}
                </Button>
              </div>

              {/* Display Uploaded Documents */}
              <div className="space-y-3 mt-4">
                {formData.documents.brochure && (
                  <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-green-600 dark:text-green-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {getDocumentLabel(formData.assetCategory, 'brochure')}: {formData.documents.brochure.name || 'Document'}
                        </p>
                        {formData.documents.brochure.url && (
                          <a
                            href={formData.documents.brochure.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            View Document
                          </a>
                        )}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          documents: { ...prev.documents, brochure: null }
                        }));
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}

                {formData.documents.floorPlan && (
                  <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {getDocumentLabel(formData.assetCategory, 'floorPlan')}: {formData.documents.floorPlan.name || 'Document'}
                        </p>
                        {formData.documents.floorPlan.url && (
                          <a
                            href={formData.documents.floorPlan.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            View Document
                          </a>
                        )}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          documents: { ...prev.documents, floorPlan: null }
                        }));
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}

                {formData.documents.compliance && formData.documents.compliance.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{getDocumentLabel(formData.assetCategory, 'compliance')}s:</p>
                    {formData.documents.compliance.map((doc, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {doc.name || `Compliance Document ${index + 1}`}
                            </p>
                            {doc.url && (
                              <a
                                href={doc.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                View Document
                              </a>
                            )}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              documents: {
                                ...prev.documents,
                                compliance: prev.documents.compliance.filter((_, i) => i !== index)
                              }
                            }));
                          }}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-6 border-t">
          <div>
            {currentStep > 1 && (
              <Button type="button" onClick={handlePrevStep} variant="outline">
                <ChevronLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>
            )}
          </div>
          <div className="flex gap-4">
            {onCancel && (
              <Button type="button" onClick={onCancel} variant="outline">
                Cancel
              </Button>
            )}
            {currentStep < totalSteps ? (
              <Button type="button" onClick={handleNextStep}>
                Next Step
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button type="submit" disabled={isLoading}>
                <Save className="w-4 h-4 mr-2" />
                {isLoading ? 'Submitting...' : 'Submit Request'}
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );

  if (inline) {
    return formContent;
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 h-full w-full z-50 flex items-start justify-center p-4 overflow-y-auto">
      {formContent}
    </div>
  );
};

export default PropertyRequestForm;

