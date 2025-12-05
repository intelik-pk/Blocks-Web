import React from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, 
  CheckCircle, 
  Clock, 
  XCircle, 
  ArrowLeft,
  FileText,
  Calendar,
  User as UserIcon,
  AlertCircle
} from 'lucide-react';
import Layout from '../../components/Layout/Layout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { mobileKycAPI } from '../../services/api';
import { useUser } from '../../contexts/UserContext';

const KYCDetails = () => {
  const navigate = useNavigate();
  const { currentUser } = useUser();
  const userId = currentUser?.id;

  // Fetch KYC details
  const { data: kycData, isLoading, error } = useQuery(
    ['kyc-details', userId],
    () => mobileKycAPI.getKyc(userId),
    {
      enabled: !!userId,
      retry: 1,
      refetchOnWindowFocus: false,
    }
  );

  const getStatusConfig = (status) => {
    switch (status) {
      case 'verified':
        return {
          icon: CheckCircle,
          color: 'green',
          label: 'Verified',
          bgColor: 'bg-green-50',
          textColor: 'text-green-800',
          borderColor: 'border-green-200'
        };
      case 'pending':
        return {
          icon: Clock,
          color: 'yellow',
          label: 'Pending Review',
          bgColor: 'bg-yellow-50',
          textColor: 'text-yellow-800',
          borderColor: 'border-yellow-200'
        };
      case 'rejected':
        return {
          icon: XCircle,
          color: 'red',
          label: 'Rejected',
          bgColor: 'bg-red-50',
          textColor: 'text-red-800',
          borderColor: 'border-red-200'
        };
      default:
        return {
          icon: Shield,
          color: 'gray',
          label: 'Not Submitted',
          bgColor: 'bg-gray-50',
          textColor: 'text-gray-800',
          borderColor: 'border-gray-200'
        };
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'cnic':
        return 'CNIC (National ID Card)';
      case 'passport':
        return 'Passport';
      case 'license':
        return 'Driver\'s License';
      case 'other':
        return 'Other';
      default:
        return type;
    }
  };

  if (!userId) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <Card className="p-6">
              <div className="flex items-center text-gray-600 mb-4">
                <AlertCircle className="h-5 w-5 mr-2" />
                <span>Please select a user to view KYC details</span>
              </div>
              <Button onClick={() => navigate('/profile')}>Go to Profile</Button>
            </Card>
          </div>
        </div>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !kycData?.data) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <Card className="p-6">
              <div className="flex items-center text-red-600 mb-4">
                <AlertCircle className="h-5 w-5 mr-2" />
                <span>No KYC record found</span>
              </div>
              <p className="text-gray-600 mb-4">
                {error?.response?.data?.message || error?.message || 'You haven\'t submitted any KYC documents yet.'}
              </p>
              <Button onClick={() => navigate('/kyc/upload')}>Start Verification</Button>
            </Card>
          </div>
        </div>
      </Layout>
    );
  }

  const kyc = kycData.data;
  const statusConfig = getStatusConfig(kyc.status);
  const StatusIcon = statusConfig.icon;
  const documents = kyc.documents || {};

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <Button
              variant="outline"
              onClick={() => navigate('/kyc/status')}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">KYC Verification Details</h1>
            <p className="text-gray-600 mt-2">View your KYC verification information</p>
          </div>

          {/* Status Card */}
          <Card className={`p-6 mb-6 border-2 ${statusConfig.borderColor} ${statusConfig.bgColor}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <StatusIcon className={`h-8 w-8 ${statusConfig.textColor} mr-3`} />
                <div>
                  <h2 className={`text-xl font-semibold ${statusConfig.textColor}`}>
                    {statusConfig.label}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Document Type: {getTypeLabel(kyc.type)}
                  </p>
                </div>
              </div>
              <Badge 
                variant={statusConfig.color === 'green' ? 'success' : statusConfig.color === 'yellow' ? 'warning' : 'error'}
              >
                {statusConfig.label}
              </Badge>
            </div>

            {kyc.rejectionReason && (
              <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-md">
                <p className="text-sm font-medium text-red-800 mb-1">Rejection Reason:</p>
                <p className="text-sm text-red-700">{kyc.rejectionReason}</p>
              </div>
            )}
          </Card>

          {/* Documents */}
          <Card className="p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Uploaded Documents</h3>
            <div className="space-y-6">
              {/* Front Document */}
              {documents.front && (
                <div>
                  <div className="flex items-center mb-2">
                    <FileText className="h-5 w-5 text-gray-400 mr-2" />
                    <h4 className="font-medium text-gray-700">Front of ID</h4>
                  </div>
                  <div className="border border-gray-300 rounded-lg overflow-hidden">
                    <img
                      src={documents.front}
                      alt="Front of ID"
                      className="w-full h-auto max-h-96 object-contain bg-gray-50"
                      onError={(e) => {
                        e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23f3f4f6" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-family="sans-serif" font-size="16"%3EImage not available%3C/text%3E%3C/svg%3E';
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Back Document */}
              {documents.back && (
                <div>
                  <div className="flex items-center mb-2">
                    <FileText className="h-5 w-5 text-gray-400 mr-2" />
                    <h4 className="font-medium text-gray-700">Back of ID</h4>
                  </div>
                  <div className="border border-gray-300 rounded-lg overflow-hidden">
                    <img
                      src={documents.back}
                      alt="Back of ID"
                      className="w-full h-auto max-h-96 object-contain bg-gray-50"
                      onError={(e) => {
                        e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23f3f4f6" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-family="sans-serif" font-size="16"%3EImage not available%3C/text%3E%3C/svg%3E';
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Selfie */}
              {documents.selfie && (
                <div>
                  <div className="flex items-center mb-2">
                    <UserIcon className="h-5 w-5 text-gray-400 mr-2" />
                    <h4 className="font-medium text-gray-700">Selfie Photo</h4>
                  </div>
                  <div className="border border-gray-300 rounded-lg overflow-hidden">
                    <img
                      src={documents.selfie}
                      alt="Selfie"
                      className="w-full h-auto max-h-96 object-contain bg-gray-50"
                      onError={(e) => {
                        e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23f3f4f6" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-family="sans-serif" font-size="16"%3EImage not available%3C/text%3E%3C/svg%3E';
                      }}
                    />
                  </div>
                </div>
              )}

              {!documents.front && !documents.back && !documents.selfie && (
                <p className="text-gray-500 text-center py-8">No documents uploaded yet.</p>
              )}
            </div>
          </Card>

          {/* Timeline */}
          <Card className="p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h3>
            <div className="space-y-4">
              {kyc.submittedAt && (
                <div className="flex items-start">
                  <Calendar className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Submitted</p>
                    <p className="text-sm text-gray-600">
                      {new Date(kyc.submittedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              )}
              
              {kyc.reviewedAt && (
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Reviewed</p>
                    <p className="text-sm text-gray-600">
                      {new Date(kyc.reviewedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                    {kyc.reviewer && (
                      <p className="text-xs text-gray-500 mt-1">Reviewed by: {kyc.reviewer}</p>
                    )}
                  </div>
                </div>
              )}

              {kyc.createdAt && (
                <div className="flex items-start">
                  <Calendar className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Created</p>
                    <p className="text-sm text-gray-600">
                      {new Date(kyc.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Actions */}
          <div className="flex gap-4">
            {kyc.status === 'rejected' && (
              <Button
                onClick={() => navigate('/kyc/upload')}
                className="flex-1"
              >
                Resubmit Documents
              </Button>
            )}
            <Button
              onClick={() => navigate('/kyc/status')}
              variant="outline"
              className="flex-1"
            >
              Back to Status
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default KYCDetails;

