import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import {
  Shield,
  AlertTriangle,
  FileText,
  UserCheck,
  Eye,
  TrendingUp,
  Users,
  Wallet,
  Lock,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3,
  LogOut,
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { useAdminAuth } from '../../components/admin/AdminAuth';
import { adminAPI } from '../../services/api';
import { complianceAPI } from '../../services/complianceAPI';
import { getRoleDisplayName, getRoleBadgeColor, AdminRole } from '../../utils/rbac';
import ComplianceSidebar from '../../components/admin/ComplianceSidebar';
import AuditReports from './AuditReports';
import AuditLogs from './compliance/AuditLogs';
import ISARsView from './compliance/ISARsView';
import AlertsView from './compliance/AlertsView';
import UsersView from './compliance/UsersView';
import WalletsView from './compliance/WalletsView';
import TransactionsView from './compliance/TransactionsView';
import PropertiesView from './compliance/PropertiesView';
import OrganizationsView from './compliance/OrganizationsView';
import CustomerProfiles from './compliance/CustomerProfiles';
import MonitoringAlerts from './compliance/MonitoringAlerts';
import MonitoringRules from './compliance/MonitoringRules';
import STRReports from './compliance/STRReports';
import ReportRegistry from './compliance/ReportRegistry';
import KYCManagement from './KYCManagement';
import Loader from '../../components/Loder';
import { cn } from '../../utils/cn';

const ComplianceDashboard = () => {
  const { adminUser, isAuthenticated, logout } = useAdminAuth();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState('overview');

  // Listen for navigation events from child components (e.g., when ISAR is escalated to STR)
  useEffect(() => {
    const handleNavigateToStrReports = (event) => {
      setActiveView('str-reports');
    };

    window.addEventListener('navigate-to-str-reports', handleNavigateToStrReports);
    return () => {
      window.removeEventListener('navigate-to-str-reports', handleNavigateToStrReports);
    };
  }, []);

  // Redirect if not a compliance role
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/admin/login');
      return;
    }

    const role = adminUser?.role;
    const isComplianceRole = role === AdminRole.MLRO || 
                           role === AdminRole.AUDIT_MANAGER || 
                           role === AdminRole.COMPLIANCE_OFFICER;

    if (!isComplianceRole) {
      // Not a compliance role, redirect to regular admin dashboard
      navigate('/admin');
    }
  }, [adminUser, isAuthenticated, navigate]);

  // Fetch ISAR statistics
  const { data: isarStats, isLoading: isarLoading } = useQuery(
    ['compliance-isar-stats', adminUser?.id],
    () => complianceAPI.getIsarStatistics(adminUser?.id),
    {
      enabled: !!adminUser?.id,
      retry: 1,
    }
  );

  // Fetch Alert statistics
  const { data: alertStats, isLoading: alertLoading } = useQuery(
    ['compliance-alert-stats', adminUser?.id],
    () => complianceAPI.getAlertStatistics(adminUser?.id),
    {
      enabled: !!adminUser?.id,
      retry: 1,
    }
  );

  // Fetch recent ISARs
  const { data: isarsData, isLoading: isarsLoading } = useQuery(
    ['compliance-isars', adminUser?.id],
    () => complianceAPI.getIsars({ limit: 10 }, adminUser?.id),
    {
      enabled: !!adminUser?.id,
      retry: 1,
    }
  );

  // Fetch recent alerts
  const { data: alertsData, isLoading: alertsLoading } = useQuery(
    ['compliance-alerts', adminUser?.id],
    () => complianceAPI.getAlerts({ status: 'open', limit: 10 }, adminUser?.id),
    {
      enabled: !!adminUser?.id,
      retry: 1,
    }
  );

  const isars = isarsData?.data?.data || isarsData?.data || [];
  const alerts = alertsData?.data?.data || alertsData?.data || [];

  if (!isAuthenticated || !adminUser) {
    return <Loader />;
  }

  const role = adminUser.role;
  const isMLRO = role === AdminRole.MLRO;
  const isAuditManager = role === AdminRole.AUDIT_MANAGER;
  const isComplianceOfficer = role === AdminRole.COMPLIANCE_OFFICER;

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Welcome Section */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Welcome, {adminUser.fullName || adminUser.name}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {getRoleDisplayName(role)} Dashboard
            </p>
          </div>
          <Badge className={cn(getRoleBadgeColor(role))}>
            {getRoleDisplayName(role)}
          </Badge>
        </div>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending ISARs */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Pending ISARs</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {isarStats?.data?.pending || 0}
              </p>
            </div>
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </Card>

        {/* Open Alerts */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Open Alerts</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {alertStats?.data?.open || 0}
              </p>
            </div>
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </Card>

        {/* Total ISARs */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total ISARs</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {isarStats?.data?.total || 0}
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </Card>

        {/* Escalated to STR */}
        {isMLRO && (
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">STR Filed</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {isarStats?.data?.escalated || 0}
                </p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <CheckCircle className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Recent ISARs */}
      {!isAuditManager && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Recent ISARs</h2>
            <Button
              variant="outline"
              onClick={() => setActiveView('isars')}
              className="text-sm"
            >
              View All
            </Button>
          </div>
          {isarsLoading ? (
            <Loader />
          ) : isars.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-400 text-center py-8">No ISARs found</p>
          ) : (
            <div className="space-y-3">
              {isars.slice(0, 5).map((isar) => (
                <div
                  key={isar.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                  onClick={() => setActiveView(`isar-${isar.id}`)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {isar.displayCode}
                      </span>
                      <Badge className={cn(
                        isar.riskLevel === 'critical' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                        isar.riskLevel === 'high' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' :
                        isar.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                        'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      )}>
                        {isar.riskLevel}
                      </Badge>
                      <Badge className={cn(
                        isar.mlroDecision === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        isar.mlroDecision === 'escalate_to_str' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      )}>
                        {isar.mlroDecision}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                      {isar.narrative}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      {new Date(isar.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Recent Alerts */}
      {!isAuditManager && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Recent Alerts</h2>
            <Button
              variant="outline"
              onClick={() => setActiveView('alerts')}
              className="text-sm"
            >
              View All
            </Button>
          </div>
          {alertsLoading ? (
            <Loader />
          ) : alerts.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-400 text-center py-8">No alerts found</p>
          ) : (
            <div className="space-y-3">
              {alerts.slice(0, 5).map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                  onClick={() => setActiveView(`alert-${alert.id}`)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {alert.displayCode}
                      </span>
                      <Badge className={cn(
                        alert.severity === 'high' ? 'bg-red-100 text-red-800' :
                        alert.severity === 'medium' ? 'bg-orange-100 text-orange-800' :
                        'bg-yellow-100 text-yellow-800'
                      )}>
                        {alert.severity}
                      </Badge>
                      <Badge className="bg-blue-100 text-blue-800">
                        {alert.alertType}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                      {alert.description}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      {new Date(alert.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Audit Manager Specific View */}
      {isAuditManager && (
        <Card className="p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Audit Overview
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            As Head of Internal Audit, you have read-only access to all compliance data for independent oversight.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              variant="outline"
              onClick={() => setActiveView('audit-trail')}
              className="flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              View Audit Trail
            </Button>
            <Button
              variant="outline"
              onClick={() => setActiveView('export')}
              className="flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Export Audit Logs
            </Button>
          </div>
        </Card>
      )}
    </div>
  );

  // Render content based on active view
  const renderContent = () => {
    switch (activeView) {
      case 'overview':
        return renderOverview();
      case 'audit-reports':
        if (isAuditManager) {
          return <AuditReports />;
        }
        return renderOverview();
      case 'audit-logs':
        if (isAuditManager) {
          return <AuditLogs />;
        }
        return renderOverview();
      case 'customer-profiles':
        return <CustomerProfiles />;
      case 'isars':
        return <ISARsView />;
      case 'str-reports':
        return <STRReports />;
      case 'report-registry':
        return <ReportRegistry />;
      case 'alerts':
        return <AlertsView />;
      case 'monitoring-alerts':
        return <MonitoringAlerts />;
      case 'monitoring-rules':
        return <MonitoringRules />;
      case 'users':
        return <UsersView />;
      case 'wallets':
        return <WalletsView />;
      case 'transactions':
        return <TransactionsView />;
      case 'kyc':
        if (isComplianceOfficer) {
          return <KYCManagement />;
        }
        return renderOverview();
      case 'monitoring':
        return <div className="p-6"><p className="text-gray-600 dark:text-gray-400">Monitoring Dashboard - Coming Soon</p></div>;
      case 'properties':
        if (isAuditManager) {
          return <PropertiesView />;
        }
        return renderOverview();
      case 'organizations':
        if (isAuditManager) {
          return <OrganizationsView />;
        }
        return renderOverview();
      default:
        return renderOverview();
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <ComplianceSidebar activeTab={activeView} setActiveTab={setActiveView} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-white/10 dark:bg-black/20 backdrop-blur-xl border-b border-white/30 dark:border-white/10">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg shadow-lg backdrop-blur-md">
                  <Shield className="w-6 h-6 text-blue-900/80" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-black/80 dark:text-white/80">
                    Compliance Dashboard
                  </h1>
                  <p className="text-sm text-black/70 dark:text-white/70">
                    {getRoleDisplayName(role)} Portal
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Badge className={cn(getRoleBadgeColor(role))}>
                  {getRoleDisplayName(role)}
                </Badge>
                <Button
                  variant="outline"
                  onClick={logout}
                  className="flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-y-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default ComplianceDashboard;
