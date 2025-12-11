import React, { useState, useEffect } from 'react';
import { X, Save, Building2, MapPin, DollarSign, TrendingUp, Hash, Plus, Trash2, Upload, FileText, ChevronRight, ChevronLeft, Check, Image as ImageIcon } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { propertyRequestsAPI, uploadAPI } from '../../services/api';
import { supabaseUpload } from '../../services/supabaseUpload';
import { useToast } from '../ui/Toast';
import { useOrganizationAuth } from './OrganizationAuth';

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
  const totalSteps = 2;
  
  const [formData, setFormData] = useState({
    organizationId: organizationId || '',
    title: '',
    slug: '',
    description: '',
    type: 'residential',
    propertyStatus: 'planning',
    totalValueUSDT: 0,
    totalTokens: 1000,
    expectedROI: 0,
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

  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);
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
        [name]: type === 'number' ? parseFloat(value) || 0 : value
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

    try {
      const response = await propertyRequestsAPI.create(formData, orgAdminId);
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
        <h2 className="text-2xl font-bold text-gray-900">Request New Property</h2>
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
          {[1, 2].map((step) => (
            <React.Fragment key={step}>
              <div className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  currentStep >= step ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {currentStep > step ? <Check className="w-5 h-5" /> : step}
                </div>
                <span className={`ml-2 ${currentStep >= step ? 'text-primary' : 'text-gray-600'}`}>
                  {step === 1 ? 'Basic Info' : 'Details'}
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
                Property Title *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="e.g., Marina View Residences"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Slug *
              </label>
              <input
                type="text"
                name="slug"
                value={formData.slug}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="e.g., marina-view-residences"
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
                placeholder="Describe the property..."
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
                  <option value="residential">Residential</option>
                  <option value="commercial">Commercial</option>
                  <option value="mixed">Mixed</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Property Status
                </label>
                <select
                  name="propertyStatus"
                  value={formData.propertyStatus}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="planning">Planning</option>
                  <option value="construction">Construction</option>
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
                  City
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Country
                </label>
                <input
                  type="text"
                  name="country"
                  value={formData.country}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Value (USDT) *
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
                  Total Tokens *
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
                  Expected ROI (%) *
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

            {/* Images */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Property Images
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
                    <img src={url} alt={`Property ${index + 1}`} className="w-full h-32 object-cover rounded-lg" />
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
              <input
                ref={documentFileInputRef}
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => handleDocumentUpload(e, 'brochure')}
                className="hidden"
              />
              <Button
                type="button"
                onClick={() => documentFileInputRef.current?.click()}
                disabled={uploadingDocument}
                variant="outline"
                className="mb-4"
              >
                <FileText className="w-4 h-4 mr-2" />
                {uploadingDocument ? 'Uploading...' : 'Upload Document'}
              </Button>
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

