import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Shield,
  AlertTriangle,
  FileText,
  UserCheck,
  Eye,
  Users,
  Wallet,
  Lock,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3,
  Menu,
  Lock as LockIcon,
  ClipboardList,
  Download,
  Settings,
  FileDown,
  Building2,
  Folder,
} from 'lucide-react';
import { useAdminAuth } from './AdminAuth';
import { AdminRole } from '../../utils/rbac';

const ComplianceSidebar = ({ activeTab, setActiveTab }) => {
  const { adminUser } = useAdminAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const role = adminUser?.role;

  // Define menu items based on role
  const getMenuItems = () => {
    const baseItems = [
      { id: 'overview', icon: LayoutDashboard, label: 'Dashboard', roles: [AdminRole.MLRO, AdminRole.AUDIT_MANAGER, AdminRole.COMPLIANCE_OFFICER] },
    ];

    // MLRO specific items
    const mlroItems = [
      { id: 'customer-profiles', icon: UserCheck, label: 'Customer Profiles', roles: [AdminRole.MLRO] },
      { id: 'isars', icon: FileText, label: 'ISARs', roles: [AdminRole.MLRO] },
      { id: 'str-reports', icon: FileText, label: 'STR/CTR Reports', roles: [AdminRole.MLRO] },
      { id: 'report-registry', icon: ClipboardList, label: 'Report Registry', roles: [AdminRole.MLRO] },
      { id: 'alerts', icon: AlertTriangle, label: 'Manual Alerts', roles: [AdminRole.MLRO, AdminRole.COMPLIANCE_OFFICER] },
      { id: 'monitoring-alerts', icon: AlertTriangle, label: 'Auto Alerts', roles: [AdminRole.MLRO] },
      { id: 'monitoring-rules', icon: Settings, label: 'Monitoring Rules', roles: [AdminRole.MLRO] },
      { id: 'users', icon: Users, label: 'Users', roles: [AdminRole.MLRO, AdminRole.COMPLIANCE_OFFICER] },
      { id: 'wallets', icon: Wallet, label: 'Wallets', roles: [AdminRole.MLRO, AdminRole.COMPLIANCE_OFFICER] },
      { id: 'transactions', icon: BarChart3, label: 'Transactions', roles: [AdminRole.MLRO, AdminRole.COMPLIANCE_OFFICER] },
    ];

    // Compliance Officer specific items
    const complianceOfficerItems = [
      { id: 'isars', icon: FileText, label: 'ISARs', roles: [AdminRole.COMPLIANCE_OFFICER] },
      { id: 'alerts', icon: AlertTriangle, label: 'Alerts', roles: [AdminRole.COMPLIANCE_OFFICER] },
      { id: 'kyc', icon: UserCheck, label: 'KYC Review', roles: [AdminRole.COMPLIANCE_OFFICER] },
      { id: 'monitoring', icon: Eye, label: 'Monitoring', roles: [AdminRole.COMPLIANCE_OFFICER] },
    ];

    // Audit Manager specific items (read-only)
    const auditManagerItems = [
      { id: 'audit-reports', icon: FileDown, label: 'Audit Reports', roles: [AdminRole.AUDIT_MANAGER] },
      { id: 'audit-logs', icon: ClipboardList, label: 'Audit Logs', roles: [AdminRole.AUDIT_MANAGER] },
      { id: 'isars', icon: FileText, label: 'ISARs (View)', roles: [AdminRole.AUDIT_MANAGER] },
      { id: 'alerts', icon: AlertTriangle, label: 'Alerts (View)', roles: [AdminRole.AUDIT_MANAGER] },
      { id: 'users', icon: Users, label: 'Users (View)', roles: [AdminRole.AUDIT_MANAGER] },
      { id: 'transactions', icon: BarChart3, label: 'Transactions (View)', roles: [AdminRole.AUDIT_MANAGER] },
      { id: 'properties', icon: Building2, label: 'Properties (View)', roles: [AdminRole.AUDIT_MANAGER] },
      { id: 'organizations', icon: Folder, label: 'Organizations (View)', roles: [AdminRole.AUDIT_MANAGER] },
    ];

    return [...baseItems, ...mlroItems, ...complianceOfficerItems, ...auditManagerItems];
  };

  const menuItems = getMenuItems();

  // Filter items based on role
  const visibleItems = menuItems.filter(item => {
    if (!item.roles) return true;
    return item.roles.includes(role);
  });

  const glassClass = "bg-white/5 dark:bg-black/20 backdrop-blur-xl border border-white/20 dark:border-white/10";
  const showExpanded = !collapsed || isHovered;

  const SidebarContent = () => (
    <div className={`flex flex-col h-full overflow-y-auto scrollbar-hide ${glassClass}`}>
      {/* Header */}
      <div className={`p-6 flex items-center ${showExpanded ? "justify-between" : "justify-center"}`}>
        {showExpanded && (
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-blue-400" />
            <p className="text-sm font-semibold text-sidebar-foreground">Compliance</p>
          </div>
        )}

        <button
          className="p-2 rounded-lg hover:bg-white/10 dark:hover:bg-white/10 transition-colors"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <Menu size={18} /> : <LockIcon size={18} />}
        </button>
      </div>

      {/* Main Menu */}
      <nav className="px-4 space-y-1">
        {visibleItems.map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setMobileOpen(false);
              }}
              className={`flex items-center w-full gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 
                ${activeTab === item.id
                  ? "bg-white/20 dark:bg-white/20 text-black shadow-md"
                  : "text-back hover:bg-white/20 hover:text-blue-900 dark:text-white/80 dark:hover:bg-white/10 dark:hover:text-blue-400"}
              `}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {showExpanded && <span className="whitespace-nowrap">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="mt-auto border-t border-white/10 p-4">
        {/* User */}
        <div className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/10 rounded-lg cursor-pointer group">
          <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
            {adminUser?.fullName?.charAt(0)?.toUpperCase() || 'A'}
          </div>

          {showExpanded && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{adminUser?.fullName || 'Admin'}</p>
              <p className="text-xs text-white/50 truncate">{adminUser?.email || ''}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-black/40 backdrop-blur-lg rounded-lg border border-white/20"
      >
        <Menu className="text-white" />
      </button>

      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex h-screen transition-all duration-300 ${
          collapsed && !isHovered ? "w-20" : "w-64"
        }`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Overlay */}
      <div
        className={`md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity ${
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setMobileOpen(false)}
      />

      {/* Mobile Sidebar */}
      <aside
        className={`md:hidden fixed top-0 left-0 h-full w-64 z-50 transition-transform duration-300 
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <SidebarContent />
      </aside>
    </>
  );
};

export default ComplianceSidebar;
