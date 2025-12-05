import React from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, 
  CheckCircle, 
  Clock, 
  XCircle, 
  ArrowRight,
  FileText,
  AlertCircle
} from 'lucide-react';
import Layout from '../../components/Layout/Layout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { mobileKycAPI } from '../../services/api';
import { useUser } from '../../contexts/UserContext';

const KYCStatus = () => {
  const navigate = useNavigate();
  const { currentUser } = useUser();
  const userId = currentUser?.id;

  // Fetch KYC status
  const { data: statusData, isLoading, error, refetch } = useQuery(
    ['kyc-status', userId],
    () => mobileKycAPI.getStatus(userId),
    {
      enabled: !!userId,
      retry: 1,
      refetchOnWindowFocus: false,
    }
  );

  const kycStatus = statusData?.data?.status || 'not_submitted';
  const hasDocuments = statusData?.data?.hasDocuments || {
    front: false,
    back: false,
    selfie: false
  };
  const rejectionReason = statusData?.data?.rejectionReason;
  const submittedAt = statusData?.data?.submittedAt;
  const reviewedAt = statusData?.data?.reviewedAt;

  const getStatusConfig = (status) => {
    switch (status) {
      case 'verified':
        return {
          icon: CheckCircle,
          color: 'green',
          label: 'Verified',
          description: 'Your KYC verification has been approved.',
          bgColor: 'bg-green-50',
          textColor: 'text-green-800',
          borderColor: 'border-green-200'
        };
      case 'pending':
        return {
          icon: Clock,
          color: 'yellow',
          label: 'Pending Review',
          description: 'Your documents are under review. We will notify you once verified.',
          bgColor: 'bg-yellow-50',
          textColor: 'text-yellow-800',
          borderColor: 'border-yellow-200'
        };
      case 'rejected':
        return {
          icon: XCircle,
          color: 'red',
          label: 'Rejected',
          description: 'Your KYC verification was rejected. Please review and resubmit.',
          bgColor: 'bg-red-50',
          textColor: 'text-red-800',
          borderColor: 'border-red-200'
        };
      default:
        return {
          icon: Shield,
          color: 'gray',
          label: 'Not Submitted',
          description: 'Complete your KYC verification to start investing.',
          bgColor: 'bg-gray-50',
          textColor: 'text-gray-800',
          borderColor: 'border-gray-200'
        };
    }
  };

  const statusConfig = getStatusConfig(kycStatus);
  const StatusIcon = statusConfig.icon;

  if (!userId) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <Card className="p-6">
              <div className="flex items-center text-gray-600 mb-4">
                <AlertCircle className="h-5 w-5 mr-2" />
                <span>Please select a user to view KYC status</span>
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

  if (error) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <Card className="p-6">
              <div className="flex items-center text-red-600 mb-4">
                <AlertCircle className="h-5 w-5 mr-2" />
                <span>Error loading KYC status</span>
              </div>
              <p className="text-gray-600 mb-4">{error.response?.data?.message || error.message}</p>
              <Button onClick={() => refetch()}>Retry</Button>
            </Card>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">KYC Verification</h1>
            <p className="text-gray-600 mt-2">Verify your identity to start investing</p>
          </div>

          {/* Status Card */}
          <Card className={`p-6 mb-6 border-2 ${statusConfig.borderColor} ${statusConfig.bgColor}`}>
            <div className="flex items-start">
              <div className={`flex-shrink-0 ${statusConfig.textColor}`}>
                <StatusIcon className="h-12 w-12" />
              </div>
              <div className="ml-4 flex-1">
                <h2 className={`text-xl font-semibold ${statusConfig.textColor} mb-2`}>
                  {statusConfig.label}
                </h2>
                <p className="text-gray-700 mb-4">{statusConfig.description}</p>
                
                {rejectionReason && (
                  <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-md">
                    <p className="text-sm font-medium text-red-800 mb-1">Rejection Reason:</p>
                    <p className="text-sm text-red-700">{rejectionReason}</p>
                  </div>
                )}

                {submittedAt && (
                  <div className="mt-4 text-sm text-gray-600">
                    <p>Submitted: {new Date(submittedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</p>
                    {reviewedAt && (
                      <p className="mt-1">Reviewed: {new Date(reviewedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Document Status */}
          {kycStatus !== 'not_submitted' && (
            <Card className="p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Document Status</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="text-gray-700">Front of ID</span>
                  </div>
                  {hasDocuments.front ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-gray-400" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="text-gray-700">Back of ID</span>
                  </div>
                  {hasDocuments.back ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-gray-400" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="text-gray-700">Selfie Photo</span>
                  </div>
                  {hasDocuments.selfie ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Information Card */}
          <Card className="p-6 mb-6 bg-blue-50 border-blue-200">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-blue-900 mb-2">About KYC Verification</h3>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                  <li>KYC (Know Your Customer) verification is required for compliance with financial regulations</li>
                  <li>Upload clear photos of your ID document (front and back)</li>
                  <li>Take a selfie photo holding your ID</li>
                  <li>Verification typically takes 1-3 business days</li>
                  <li>Your documents are stored securely and encrypted</li>
                </ul>
              </div>
            </div>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-4">
            {kycStatus === 'not_submitted' || kycStatus === 'rejected' ? (
              <Button 
                onClick={() => navigate('/kyc/upload')}
                className="flex-1"
              >
                {kycStatus === 'rejected' ? 'Resubmit Documents' : 'Start Verification'}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <>
                <Button 
                  onClick={() => navigate('/kyc/upload')}
                  variant="outline"
                  className="flex-1"
                >
                  Upload/Update Documents
                </Button>
                <Button 
                  onClick={() => navigate('/kyc/details')}
                  className="flex-1"
                >
                  View Details
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </>
            )}
            <Button 
              onClick={() => navigate('/profile')}
              variant="outline"
            >
              Back to Profile
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default KYCStatus;

