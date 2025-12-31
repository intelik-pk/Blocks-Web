import React, { useState } from 'react';
import {
  LayoutDashboard,
  Archive,
  BarChart3,
  Folder,
  Users,
  Settings,
  HelpCircle,
  MoreVertical,
  Building2,
  Coins,
  Shield,
  Bell,
  Menu,
  X,
  Lock,
  Unlock,
  CreditCard,
  ArrowDownCircle,
  Store,
  FileText,
} from 'lucide-react';

const AdminSidebar = ({ activeTab, setActiveTab }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const mainMenuItems = [
    { id: 'overview', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'properties', icon: Building2, label: 'Properties' },
    { id: 'property-requests', icon: Building2, label: 'Property Requests' },
    { id: 'investments', icon: BarChart3, label: 'Investments' },
    { id: 'users', icon: Users, label: 'Users' },
    { id: 'bank-transfers', icon: CreditCard, label: 'Bank Transfers' },
    { id: 'bank-withdrawals', icon: ArrowDownCircle, label: 'Bank Withdrawals' },
    { id: 'marketplace', icon: Store, label: 'Marketplace' },
    { id: 'transactions', icon: Archive, label: 'Transactions' },
    { id: 'certificates', icon: FileText, label: 'Certificates' },
    { id: 'tokens', icon: Coins, label: 'Tokens' },
    { id: 'kyc', icon: Shield, label: 'KYC Management' },
    { id: 'notifications', icon: Bell, label: 'Send Notifications' },
  ];

  const documentItems = [
    { id: 'organizations', icon: Folder, label: 'Organizations' },
    { id: 'reports', icon: BarChart3, label: 'Reports' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  // Glass class
  const glassClass =
    "bg-white/5 dark:bg-black/20 backdrop-blur-xl border border-white/20 dark:border-white/10";

  // Determine if sidebar should show expanded content (either not collapsed OR hovered when collapsed)
  const showExpanded = !collapsed || isHovered;

  const SidebarContent = () => (
    <div className={`flex flex-col h-full overflow-y-auto scrollbar-hide ${glassClass}`}>
      
      {/* Header */}
      <div className={`p-6 flex items-center ${showExpanded ? "justify-between" : "justify-center"}`}>
        {showExpanded && (
          <div className="flex items-center gap-3">
            <img src="/blocks-icon-128px.png" alt="Logo" className="w-10 h-10 rounded-lg shadow-lg" />
            <p className="text-sm font-semibold text-sidebar-foreground">Blocks</p>
          </div>
        )}

        <button
          className="p-2 rounded-lg hover:bg-white/10 dark:hover:bg-white/10 transition-colors"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <Menu size={18} /> : <Lock size={18} />}
        </button>
      </div>

      {/* Main Menu */}
      <nav className="px-4 space-y-1">
        {mainMenuItems.map(item => {
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

      {/* Management Section */}
      <div className="pt-6">
        {showExpanded && (
          <p className="text-xs font-semibold text-black/60 px-6 uppercase tracking-widest dark:text-white/60">
            Management
          </p>
        )}

        <nav className="px-4 space-y-1 mt-2">
          {documentItems.map(item => {
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
                    : "text-black hover:bg-white/10 hover:text-blue-900 dark:text-white/80 dark:hover:bg-white/10 dark:hover:text-blue-400"}
                `}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {showExpanded && <span className="whitespace-nowrap">{item.label}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section */}
      <div className="mt-auto border-t border-white/10 p-4">
        <button className="flex items-center w-full gap-3 px-3 py-2.5 text-sm rounded-lg text-white/80 hover:bg-white/10">
          <HelpCircle className="w-5 h-5 flex-shrink-0" />
          {showExpanded && <span className="whitespace-nowrap">Get Help</span>}
        </button>

        {/* User */}
        <div className="mt-4 border-t border-white/10 pt-4">
          <div className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/10 rounded-lg cursor-pointer group">
            <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
              AD
            </div>

            {showExpanded && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">Admin</p>
                <p className="text-xs text-white/50 truncate">admin@hmr.com</p>
              </div>
            )}

            {showExpanded && (
              <MoreVertical className="w-4 h-4 text-white/50 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
            )}
          </div>
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

export default AdminSidebar;
