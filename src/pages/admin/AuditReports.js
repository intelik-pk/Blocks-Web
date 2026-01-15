import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { API_BASE_URL } from '../../config/api';
import { 
  Download, 
  FileText, 
  Building2,
  Users,
  Folder,
  FileDown,
  Shield,
  AlertTriangle,
  ClipboardList
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { adminAPI, usersAPI, investmentsAPI, walletTransactionsAPI, activitiesAPI } from '../../services/api';
import { complianceAPI } from '../../services/complianceAPI';
import { useAdminAuth } from '../../components/admin/AdminAuth';
import { jsPDF } from 'jspdf';

const AuditReports = () => {
  const { isAuthenticated, adminUser } = useAdminAuth();
  
  const [reportType, setReportType] = useState(''); // 'property', 'organization', 'user', 'compliance', 'isar', 'alert'
  const [selectedProperty, setSelectedProperty] = useState('');
  const [selectedOrganization, setSelectedOrganization] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedIsar, setSelectedIsar] = useState('');
  const [selectedAlert, setSelectedAlert] = useState('');

  // Fetch all properties
  const { data: propertiesData } = useQuery(
    ['all-properties-for-audit-reports'],
    () => adminAPI.getProperties({ limit: 1000 }),
    {
      enabled: isAuthenticated && (reportType === 'property' || !reportType)
    }
  );

  // Fetch all organizations
  const { data: organizationsData } = useQuery(
    ['all-organizations-for-audit-reports'],
    () => adminAPI.getOrganizations({ limit: 1000 }),
    {
      enabled: isAuthenticated && (reportType === 'organization' || !reportType)
    }
  );

  // Fetch all users
  const { data: usersData } = useQuery(
    ['all-users-for-audit-reports'],
    () => adminAPI.getUsers({ limit: 1000 }),
    {
      enabled: isAuthenticated && (reportType === 'user' || !reportType)
    }
  );

  // Fetch all ISARs
  const { data: isarsData } = useQuery(
    ['all-isars-for-audit-reports'],
    () => complianceAPI.getIsars({ limit: 1000 }, adminUser?.id),
    {
      enabled: isAuthenticated && (reportType === 'isar' || !reportType) && !!adminUser?.id
    }
  );

  // Fetch all monitoring alerts (created by MLRO/System)
  const { data: alertsData, isLoading: alertsLoading, error: alertsError } = useQuery(
    ['all-monitoring-alerts-for-audit-reports'],
    () => complianceAPI.getMonitoringAlerts({ limit: 1000 }, adminUser?.id),
    {
      enabled: isAuthenticated && (reportType === 'alert' || !reportType) && !!adminUser?.id,
      retry: 1,
    }
  );

  const properties = propertiesData?.data?.data?.properties || 
                    propertiesData?.data?.properties || 
                    propertiesData?.data || 
                    (Array.isArray(propertiesData) ? propertiesData : []);

  const organizations = organizationsData?.data?.data?.organizations || 
                       organizationsData?.data?.organizations || 
                       organizationsData?.data || 
                       (Array.isArray(organizationsData) ? organizationsData : []);

  const users = usersData?.data?.data?.users || 
               usersData?.data?.users || 
               usersData?.data || 
               (Array.isArray(usersData) ? usersData : []);

  const isars = isarsData?.data?.data || isarsData?.data || [];
  // Backend returns { success: true, data: alerts[] }
  // Ensure alerts is always an array to prevent .map() errors
  let alerts = [];
  if (alertsData) {
    if (Array.isArray(alertsData)) {
      alerts = alertsData;
    } else if (Array.isArray(alertsData.data)) {
      alerts = alertsData.data;
    } else if (alertsData.data && Array.isArray(alertsData.data.data)) {
      alerts = alertsData.data.data;
    }
  }

  // Fetch STR report data if ISAR has strReference
  const { data: strReportData } = useQuery(
    ['str-report-for-isar', selectedIsar],
    async () => {
      if (!selectedIsar) return null;
      const isar = isars.find(i => (i.id === selectedIsar) || (i.displayCode === selectedIsar));
      if (!isar || !isar.strReference) return null;
      
      // Try to get report by reference - fetch all reports and filter
      try {
        const reportsResponse = await complianceAPI.getReports({ limit: 1000 }, adminUser?.id);
        const reports = reportsResponse?.data?.data || reportsResponse?.data || [];
        return reports.find(r => r.reportReference === isar.strReference) || null;
      } catch (error) {
        console.error('Error fetching STR report:', error);
        return null;
      }
    },
    {
      enabled: isAuthenticated && reportType === 'isar' && !!selectedIsar && !!adminUser?.id
    }
  );

  // Fetch detailed data for selected entity
  const { data: propertyDetails } = useQuery(
    ['property-details-audit', selectedProperty],
    async () => {
      if (!selectedProperty) return null;
      const property = properties.find(p => (p.id === selectedProperty) || (p.displayCode === selectedProperty));
      if (!property) return null;

      const investmentsResponse = await investmentsAPI.getAll();
      const allInvestments = investmentsResponse?.data?.data || investmentsResponse?.data || [];
      const propertyInvestments = allInvestments.filter(inv => 
        (inv.propertyId === property.id || inv.propertyId === property.displayCode) ||
        (inv.property?.id === property.id || inv.property?.displayCode === property.displayCode)
      );

      // Fetch activity logs
      const activitiesResponse = await activitiesAPI.getAll({ 
        limit: 1000,
        entityType: 'property',
        entityId: property.id 
      });
      const activities = activitiesResponse?.data?.data || activitiesResponse?.data || [];

      return {
        property,
        investments: propertyInvestments,
        activities: activities
      };
    },
    {
      enabled: isAuthenticated && reportType === 'property' && !!selectedProperty
    }
  );

  const { data: organizationDetails } = useQuery(
    ['organization-details-audit', selectedOrganization],
    async () => {
      if (!selectedOrganization) return null;
      const org = organizations.find(o => (o.id === selectedOrganization) || (o.displayCode === selectedOrganization));
      if (!org) return null;

      const propertiesResponse = await adminAPI.getProperties({ limit: 1000 });
      const allProperties = propertiesResponse?.data?.data?.properties || propertiesResponse?.data?.properties || [];
      const orgProperties = allProperties.filter(prop => 
        prop.organizationId === org.id || prop.organizationId === org.displayCode ||
        prop.organization?.id === org.id || prop.organization?.displayCode === org.displayCode
      );

      const investmentsResponse = await investmentsAPI.getAll();
      const allInvestments = investmentsResponse?.data?.data || investmentsResponse?.data || [];
      const orgInvestments = allInvestments.filter(inv => {
        const invPropertyId = inv.propertyId || inv.property?.id || inv.property?.displayCode;
        return orgProperties.some(prop => 
          (prop.id === invPropertyId || prop.displayCode === invPropertyId)
        );
      });

      // Fetch activity logs
      const activitiesResponse = await activitiesAPI.getAll({ 
        limit: 1000,
        entityType: 'organization',
        entityId: org.id 
      });
      const activities = activitiesResponse?.data?.data || activitiesResponse?.data || [];

      return {
        organization: org,
        properties: orgProperties,
        investments: orgInvestments,
        activities: activities
      };
    },
    {
      enabled: isAuthenticated && reportType === 'organization' && !!selectedOrganization
    }
  );

  const { data: userDetails } = useQuery(
    ['user-details-audit', selectedUser],
    async () => {
      if (!selectedUser) return null;
      const user = users.find(u => (u.id === selectedUser) || (u.displayCode === selectedUser));
      if (!user) return null;

      const userId = user.id || user.displayCode;

      const [walletResponse, portfolioResponse, transactionsResponse, activitiesResponse] = await Promise.allSettled([
        usersAPI.getWalletById(userId).catch(() => ({ data: null })),
        fetch(`${API_BASE_URL}/portfolio/user/${userId}/detailed`)
          .then(r => r.json())
          .catch(() => null),
        walletTransactionsAPI.getByUserId(userId).catch(() => ({ data: [] })),
        activitiesAPI.getAll({ 
          limit: 1000,
          entityType: 'user',
          entityId: userId 
        }).catch(() => ({ data: [] }))
      ]);

      const walletData = walletResponse.status === 'fulfilled' ? walletResponse.value?.data : null;
      const portfolioData = portfolioResponse.status === 'fulfilled' ? portfolioResponse.value : null;
      const transactionsData = transactionsResponse.status === 'fulfilled' ? transactionsResponse.value?.data : [];
      const activitiesData = activitiesResponse.status === 'fulfilled' ? activitiesResponse.value?.data?.data || activitiesResponse.value?.data : [];

      return {
        user,
        wallet: walletData,
        portfolio: portfolioData,
        transactions: Array.isArray(transactionsData) ? transactionsData : transactionsData?.data || [],
        activities: Array.isArray(activitiesData) ? activitiesData : []
      };
    },
    {
      enabled: isAuthenticated && reportType === 'user' && !!selectedUser
    }
  );

  // Helper functions for PDF generation (same as ReportsManagement)
  const drawHeader = (doc, title, y) => {
    doc.setFillColor(17, 117, 197);
    doc.rect(14, y - 5, 182, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text(title, 105, y, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'normal');
    return y + 10;
  };

  const drawTableRow = (doc, label, value, y, isAlternate = false) => {
    if (isAlternate) {
      doc.setFillColor(245, 247, 250);
      doc.rect(14, y - 4, 182, 7, 'F');
    }
    doc.setDrawColor(200, 200, 200);
    doc.rect(14, y - 4, 182, 7);
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text(label, 18, y);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(value, 100, y);
    return y + 7;
  };

  const drawSectionHeader = (doc, title, y) => {
    doc.setFillColor(240, 242, 247);
    doc.rect(14, y - 4, 182, 7, 'F');
    doc.setDrawColor(200, 200, 200);
    doc.rect(14, y - 4, 182, 7);
    doc.setTextColor(17, 117, 197);
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(title, 18, y);
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'normal');
    return y + 7;
  };

  const addFooter = (doc) => {
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFillColor(240, 242, 247);
      doc.rect(14, 285, 182, 10, 'F');
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`Page ${i} of ${pageCount}`, 105, 290, { align: 'center' });
      doc.text(`Generated on ${new Date().toLocaleDateString()} by ${adminUser?.fullName || 'Audit Manager'}`, 105, 295, { align: 'center' });
      doc.text('AUDIT REPORT - READ ONLY', 105, 300, { align: 'center' });
    }
  };

  // Generate Property Audit Report
  const generatePropertyAuditPDF = () => {
    if (!propertyDetails) return;
    const { property, investments, activities } = propertyDetails;
    const doc = new jsPDF();
    
    let yPos = 20;
    yPos = drawHeader(doc, 'Property Audit Report', yPos);
    yPos += 5;

    // Property Information
    yPos = drawSectionHeader(doc, 'Property Information', yPos);
    yPos += 2;

    const totalValue = parseFloat(property.pricing_total_value || property.totalValueUSDT || property.purchasePriceUSDT || 0);
    const expectedROI = parseFloat(property.pricing_expected_roi || property.expectedROI || 0);
    const totalTokens = parseFloat(property.tokenization_total_tokens || property.totalTokens || 0);
    const availableTokens = parseFloat(property.tokenization_available_tokens || property.availableTokens || 0);
    const boughtTokens = totalTokens - availableTokens;
    const fundingPercentage = totalTokens > 0 ? (boughtTokens / totalTokens) * 100 : 0;

    yPos = drawTableRow(doc, 'Property Name', property.title || 'N/A', yPos, false);
    yPos = drawTableRow(doc, 'Display Code', property.displayCode || property.id || 'N/A', yPos, true);
    yPos = drawTableRow(doc, 'Location', property.location_city || property.city || 'N/A', yPos, false);
    yPos = drawTableRow(doc, 'Type', (property.property_type || property.propertyType || property.type || 'N/A').toUpperCase(), yPos, true);
    yPos = drawTableRow(doc, 'Status', (property.status || 'N/A').toUpperCase(), yPos, false);
    yPos = drawTableRow(doc, 'Total Value', `$${totalValue.toLocaleString()}`, yPos, true);
    yPos = drawTableRow(doc, 'Expected ROI', `${expectedROI}%`, yPos, false);
    yPos = drawTableRow(doc, 'Total Tokens', totalTokens.toLocaleString(), yPos, true);
    yPos = drawTableRow(doc, 'Bought Tokens', boughtTokens.toLocaleString(), yPos, false);
    yPos = drawTableRow(doc, 'Available Tokens', availableTokens.toLocaleString(), yPos, true);
    yPos = drawTableRow(doc, 'Funding Progress', `${fundingPercentage.toFixed(2)}%`, yPos, false);
    yPos += 5;

    // Investments Summary
    if (investments && investments.length > 0) {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      yPos = drawSectionHeader(doc, 'Investment Summary', yPos);
      yPos += 2;

      const totalInvestment = investments.reduce((sum, inv) => sum + parseFloat(inv.amountUSDT || inv.amount || 0), 0);
      yPos = drawTableRow(doc, 'Total Investments', String(investments.length), yPos, false);
      yPos = drawTableRow(doc, 'Total Investment Value', `$${totalInvestment.toLocaleString()}`, yPos, true);
      yPos += 5;
    }

    // Activity Log
    if (activities && activities.length > 0) {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      yPos = drawSectionHeader(doc, 'Activity Log (Last 20)', yPos);
      yPos += 2;

      activities.slice(0, 20).forEach((activity, index) => {
        if (yPos > 280) {
          doc.addPage();
          yPos = 20;
        }
        const isAlternate = index % 2 === 1;
        const date = activity.createdAt ? new Date(activity.createdAt).toLocaleString() : 'N/A';
        yPos = drawTableRow(doc, date, activity.description || activity.action || 'N/A', yPos, isAlternate);
      });
    }

    addFooter(doc);
    doc.save(`Property_Audit_Report_${property.displayCode || property.id}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Generate Organization Audit Report
  const generateOrganizationAuditPDF = () => {
    if (!organizationDetails) return;
    const { organization, properties, investments, activities } = organizationDetails;
    const doc = new jsPDF();
    
    let yPos = 20;
    yPos = drawHeader(doc, 'Organization Audit Report', yPos);
    yPos += 5;

    // Organization Information
    yPos = drawSectionHeader(doc, 'Organization Information', yPos);
    yPos += 2;

    const orgStatus = organization.status || (organization.isActive ? 'Active' : 'Inactive');
    yPos = drawTableRow(doc, 'Organization Name', organization.name || 'N/A', yPos, false);
    yPos = drawTableRow(doc, 'Display Code', organization.displayCode || organization.id || 'N/A', yPos, true);
    yPos = drawTableRow(doc, 'Email', organization.email || 'N/A', yPos, false);
    yPos = drawTableRow(doc, 'Phone', organization.phone || 'N/A', yPos, true);
    yPos = drawTableRow(doc, 'Status', orgStatus.toUpperCase(), yPos, false);
    yPos += 5;

    // Summary Statistics
    yPos = drawSectionHeader(doc, 'Summary Statistics', yPos);
    yPos += 2;

    const totalInvestment = investments.reduce((sum, inv) => sum + parseFloat(inv.amountUSDT || inv.amount || 0), 0);
    yPos = drawTableRow(doc, 'Total Properties', String(properties.length), yPos, false);
    yPos = drawTableRow(doc, 'Total Investments', String(investments.length), yPos, true);
    yPos = drawTableRow(doc, 'Total Investment Volume', `$${totalInvestment.toLocaleString()}`, yPos, false);
    yPos += 5;

    // Activity Log
    if (activities && activities.length > 0) {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      yPos = drawSectionHeader(doc, 'Activity Log (Last 20)', yPos);
      yPos += 2;

      activities.slice(0, 20).forEach((activity, index) => {
        if (yPos > 280) {
          doc.addPage();
          yPos = 20;
        }
        const isAlternate = index % 2 === 1;
        const date = activity.createdAt ? new Date(activity.createdAt).toLocaleString() : 'N/A';
        yPos = drawTableRow(doc, date, activity.description || activity.action || 'N/A', yPos, isAlternate);
      });
    }

    addFooter(doc);
    doc.save(`Organization_Audit_Report_${organization.displayCode || organization.id}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Generate User Audit Report
  const generateUserAuditPDF = () => {
    if (!userDetails) return;
    const { user, wallet, portfolio, transactions, activities } = userDetails;
    const doc = new jsPDF();
    
    let yPos = 20;
    yPos = drawHeader(doc, 'User Audit Report', yPos);
    yPos += 5;

    // User Information
    yPos = drawSectionHeader(doc, 'User Information', yPos);
    yPos += 2;

    const userStatus = user.isActive !== undefined ? (user.isActive ? 'Active' : 'Inactive') : (user.is_active ? 'Active' : 'Inactive');
    yPos = drawTableRow(doc, 'Full Name', user.fullName || user.name || 'N/A', yPos, false);
    yPos = drawTableRow(doc, 'Display Code', user.displayCode || user.id || 'N/A', yPos, true);
    yPos = drawTableRow(doc, 'Email', user.email || 'N/A', yPos, false);
    yPos = drawTableRow(doc, 'Phone', user.phone || 'N/A', yPos, true);
    yPos = drawTableRow(doc, 'Status', userStatus.toUpperCase(), yPos, false);
    yPos = drawTableRow(doc, 'Compliance Status', (user.complianceStatus || 'CLEAR').toUpperCase(), yPos, true);
    yPos = drawTableRow(doc, 'Joined Date', user.createdAt || user.created_at ? new Date(user.createdAt || user.created_at).toLocaleDateString() : 'N/A', yPos, false);
    yPos += 5;

    // Financial Summary
    if (wallet || portfolio) {
      yPos = drawSectionHeader(doc, 'Financial Summary', yPos);
      yPos += 2;

      const walletBalance = parseFloat(wallet?.balanceUSDT || wallet?.data?.balanceUSDT || wallet?.balance || 0);
      yPos = drawTableRow(doc, 'Wallet Balance', `$${walletBalance.toLocaleString()}`, yPos, false);

      if (portfolio) {
        const summary = portfolio.summary || {};
        const totalInvested = parseFloat(summary.totalInvestedUSDT || 0);
        const totalReturns = parseFloat(summary.totalRewardsUSDT || 0);
        const currentValue = parseFloat(summary.totalCurrentValueUSDT || 0);
        const activeInvestments = parseInt(summary.activeInvestments || 0);

        yPos = drawTableRow(doc, 'Total Investments', `$${totalInvested.toLocaleString()}`, yPos, true);
        yPos = drawTableRow(doc, 'Total Returns', `$${totalReturns.toLocaleString()}`, yPos, false);
        yPos = drawTableRow(doc, 'Current Value', `$${currentValue.toLocaleString()}`, yPos, true);
        yPos = drawTableRow(doc, 'Active Investments', String(activeInvestments), yPos, false);
      }
      yPos += 5;
    }

    // Activity Log
    if (activities && activities.length > 0) {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      yPos = drawSectionHeader(doc, 'Activity Log (Last 20)', yPos);
      yPos += 2;

      activities.slice(0, 20).forEach((activity, index) => {
        if (yPos > 280) {
          doc.addPage();
          yPos = 20;
        }
        const isAlternate = index % 2 === 1;
        const date = activity.createdAt ? new Date(activity.createdAt).toLocaleString() : 'N/A';
        yPos = drawTableRow(doc, date, activity.description || activity.action || 'N/A', yPos, isAlternate);
      });
    }

    addFooter(doc);
    doc.save(`User_Audit_Report_${user.displayCode || user.id}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Generate ISAR Audit Report
  const generateIsarAuditPDF = async () => {
    if (!selectedIsar) return;
    const isar = isars.find(i => (i.id === selectedIsar) || (i.displayCode === selectedIsar));
    if (!isar) return;

    // Use pre-fetched STR report data if available, otherwise fetch it
    let strReport = strReportData || null;
    if (!strReport && isar.strReference) {
      try {
        const reportsResponse = await complianceAPI.getReports({ limit: 1000 }, adminUser?.id);
        const reports = reportsResponse?.data?.data || reportsResponse?.data || [];
        strReport = reports.find(r => r.reportReference === isar.strReference) || null;
      } catch (error) {
        console.error('Error fetching STR report:', error);
      }
    }

    const doc = new jsPDF();
    let yPos = 20;
    yPos = drawHeader(doc, 'ISAR Audit Report', yPos);
    yPos += 5;

    yPos = drawSectionHeader(doc, 'ISAR Information', yPos);
    yPos += 2;

    yPos = drawTableRow(doc, 'ISAR Code', isar.displayCode || isar.id || 'N/A', yPos, false);
    yPos = drawTableRow(doc, 'Suspicion Type', (isar.suspicionType || 'N/A').toUpperCase(), yPos, true);
    yPos = drawTableRow(doc, 'Risk Level', (isar.riskLevel || 'N/A').toUpperCase(), yPos, false);
    yPos = drawTableRow(doc, 'Status', (isar.mlroDecision || isar.status || 'N/A').toUpperCase().replace(/_/g, ' '), yPos, true);
    yPos = drawTableRow(doc, 'Reported At', isar.reportedAt ? new Date(isar.reportedAt).toLocaleString() : 'N/A', yPos, false);
    yPos = drawTableRow(doc, 'STR Filed', isar.strFiled ? 'YES' : 'NO', yPos, true);
    if (isar.strFiled && isar.strReference) {
      yPos = drawTableRow(doc, 'STR Reference', isar.strReference, yPos, false);
    }
    yPos += 5;

    // ISAR Narrative
    if (isar.narrative) {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      yPos = drawSectionHeader(doc, 'ISAR Narrative', yPos);
      yPos += 2;
      const narrativeLines = doc.splitTextToSize(isar.narrative, 180);
      narrativeLines.forEach((line) => {
        if (yPos > 280) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFontSize(10);
        doc.text(line, 18, yPos);
        yPos += 5;
      });
    }

    // MLRO Decision Rationale
    if (isar.decisionRationale) {
      yPos += 5;
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      yPos = drawSectionHeader(doc, 'MLRO Decision Rationale', yPos);
      yPos += 2;
      const rationaleLines = doc.splitTextToSize(isar.decisionRationale, 180);
      rationaleLines.forEach((line) => {
        if (yPos > 280) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFontSize(10);
        doc.text(line, 18, yPos);
        yPos += 5;
      });
    }

    // MLRO Notes
    if (isar.mlroNotes) {
      yPos += 5;
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      yPos = drawSectionHeader(doc, 'MLRO Notes', yPos);
      yPos += 2;
      const notesLines = doc.splitTextToSize(isar.mlroNotes, 180);
      notesLines.forEach((line) => {
        if (yPos > 280) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFontSize(10);
        doc.text(line, 18, yPos);
        yPos += 5;
      });
    }

    // STR/CTR Report Information (if exists)
    if (strReport) {
      yPos += 5;
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      yPos = drawSectionHeader(doc, 'STR/CTR Report Information', yPos);
      yPos += 2;

      yPos = drawTableRow(doc, 'Report', strReport.reportReference || 'N/A', yPos, false);
      yPos = drawTableRow(doc, 'Report Type', (strReport.reportType || 'N/A').toUpperCase(), yPos, true);
      yPos = drawTableRow(doc, 'Status', (strReport.status || 'N/A').toUpperCase().replace(/_/g, ' '), yPos, false);
      yPos = drawTableRow(doc, 'Filing Status', (strReport.filingStatus || 'N/A').toUpperCase().replace(/_/g, ' '), yPos, true);
      
      // Subject User
      if (strReport.subjectUser) {
        const subjectName = strReport.subjectUser.fullName || strReport.subjectUser.name || strReport.subjectUser.email || 'N/A';
        yPos = drawTableRow(doc, 'Subject', subjectName, yPos, false);
      } else if (isar.user) {
        const subjectName = isar.user.fullName || isar.user.name || isar.user.email || 'N/A';
        yPos = drawTableRow(doc, 'Subject', subjectName, yPos, false);
      }
      
      yPos = drawTableRow(doc, 'Narrative Version', `v${strReport.narrativeVersion || 1}`, yPos, true);
      
      if (strReport.filedAt) {
        yPos = drawTableRow(doc, 'Filed At', new Date(strReport.filedAt).toLocaleString(), yPos, false);
      }
      if (strReport.goamlReference) {
        yPos = drawTableRow(doc, 'goAML Reference', strReport.goamlReference, yPos, true);
      }
      yPos += 5;

      // STR/CTR Narrative (formatted and structured)
      if (strReport.narrative) {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }
        yPos = drawSectionHeader(doc, 'STR/CTR Narrative', yPos);
        yPos += 2;
        
        // Parse narrative to extract structured sections
        const narrative = strReport.narrative;
        
        // Split by common section headers
        const sections = [];
        const lines = narrative.split('\n');
        let currentSection = { title: null, content: [] };
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          // Detect section headers (lines ending with colon or containing "Summary:", "Narrative:", etc.)
          if (line.match(/^[A-Z][^:]*:$/) || line.includes('Summary:') || line.includes('Narrative:') || 
              line.includes('Rationale:') || line.includes('Behaviors:') || line.includes('Typologies:') || 
              line.includes('Notes:')) {
            if (currentSection.title) {
              sections.push(currentSection);
            }
            currentSection = { title: line, content: [] };
          } else if (line.startsWith('- ')) {
            // Bullet point
            currentSection.content.push({ type: 'bullet', text: line.substring(2) });
          } else {
            // Regular text
            currentSection.content.push({ type: 'text', text: line });
          }
        }
        if (currentSection.title || currentSection.content.length > 0) {
          sections.push(currentSection);
        }
        
        // If no structured sections found, display as regular text
        if (sections.length === 0) {
          const strNarrativeLines = doc.splitTextToSize(narrative, 180);
          strNarrativeLines.forEach((line) => {
            if (yPos > 280) {
              doc.addPage();
              yPos = 20;
            }
            doc.setFontSize(10);
            doc.text(line, 18, yPos);
            yPos += 5;
          });
        } else {
          // Display structured sections
          sections.forEach((section, sectionIndex) => {
            if (yPos > 250) {
              doc.addPage();
              yPos = 20;
            }
            
            // Section title
            if (section.title) {
              doc.setFontSize(11);
              doc.setFont(undefined, 'bold');
              doc.setTextColor(17, 117, 197);
              const titleLines = doc.splitTextToSize(section.title, 180);
              titleLines.forEach((line) => {
                if (yPos > 280) {
                  doc.addPage();
                  yPos = 20;
                }
                doc.text(line, 18, yPos);
                yPos += 6;
              });
              doc.setFont(undefined, 'normal');
              doc.setTextColor(0, 0, 0);
            }
            
            // Section content
            doc.setFontSize(10);
            section.content.forEach((item) => {
              if (yPos > 280) {
                doc.addPage();
                yPos = 20;
              }
              
              if (item.type === 'bullet') {
                doc.text('• ', 18, yPos);
                const bulletLines = doc.splitTextToSize(item.text, 170);
                doc.text(bulletLines[0], 24, yPos);
                yPos += 5;
                for (let i = 1; i < bulletLines.length; i++) {
                  if (yPos > 280) {
                    doc.addPage();
                    yPos = 20;
                  }
                  doc.text(bulletLines[i], 24, yPos);
                  yPos += 5;
                }
              } else {
                const textLines = doc.splitTextToSize(item.text, 180);
                textLines.forEach((line) => {
                  if (yPos > 280) {
                    doc.addPage();
                    yPos = 20;
                  }
                  doc.text(line, 18, yPos);
                  yPos += 5;
                });
              }
            });
            
            yPos += 3; // Space between sections
          });
        }
      }

      // Filing Data Packet (structured display)
      if (strReport.filingDataPacket) {
        yPos += 5;
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }
        yPos = drawSectionHeader(doc, 'Filing Data Packet', yPos);
        yPos += 2;
        
        const packet = strReport.filingDataPacket;
        doc.setFontSize(10);
        
        // Display key fields in structured format
        if (packet.reportReference) {
          yPos = drawTableRow(doc, 'Report Reference', packet.reportReference, yPos, false);
        }
        if (packet.reportType) {
          yPos = drawTableRow(doc, 'Report Type', packet.reportType.toUpperCase(), yPos, true);
        }
        if (packet.filingDate) {
          yPos = drawTableRow(doc, 'Filing Date', new Date(packet.filingDate).toLocaleString(), yPos, false);
        }
        if (packet.narrativeVersion) {
          yPos = drawTableRow(doc, 'Narrative Version', `v${packet.narrativeVersion}`, yPos, true);
        }
        if (packet.subjectUserId) {
          yPos = drawTableRow(doc, 'Subject User ID', packet.subjectUserId, yPos, false);
        }
        if (packet.relatedCaseReference) {
          yPos = drawTableRow(doc, 'Related Case Reference', packet.relatedCaseReference, yPos, true);
        }
        if (packet.relatedAlerts && Array.isArray(packet.relatedAlerts) && packet.relatedAlerts.length > 0) {
          yPos = drawTableRow(doc, 'Related Alerts', `${packet.relatedAlerts.length} alert(s)`, yPos, false);
        }
        
        yPos += 3;
        
        // Show full JSON in a code block style (smaller font, monospace-like)
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFontSize(9);
        doc.setTextColor(60, 60, 60);
        doc.setFont(undefined, 'normal');
        doc.text('Full JSON Data:', 18, yPos);
        yPos += 5;
        
        const dataPacketJson = JSON.stringify(packet, null, 2);
        const jsonLines = doc.splitTextToSize(dataPacketJson, 180);
        doc.setFontSize(7);
        jsonLines.forEach((line) => {
          if (yPos > 280) {
            doc.addPage();
            yPos = 20;
          }
          doc.text(line, 18, yPos);
          yPos += 3.5;
        });
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
      }
    }

    addFooter(doc);
    doc.save(`ISAR_Audit_Report_${isar.displayCode || isar.id}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Generate Alert Audit Report (Monitoring Alerts created by MLRO)
  const generateAlertAuditPDF = () => {
    if (!selectedAlert) return;
    const alert = alerts.find(a => (a.id === selectedAlert) || (a.displayCode === selectedAlert));
    if (!alert) return;

    const doc = new jsPDF();
    let yPos = 20;
    yPos = drawHeader(doc, 'Monitoring Alert Audit Report', yPos);
    yPos += 5;

    yPos = drawSectionHeader(doc, 'Alert Information', yPos);
    yPos += 2;

    yPos = drawTableRow(doc, 'Alert Code', alert.displayCode || alert.id || 'N/A', yPos, false);
    yPos = drawTableRow(doc, 'Alert Category', (alert.alertCategory || alert.alertType || 'N/A').toUpperCase().replace(/_/g, ' '), yPos, true);
    yPos = drawTableRow(doc, 'Severity', (alert.severity || 'N/A').toUpperCase(), yPos, false);
    yPos = drawTableRow(doc, 'Status', (alert.status || 'N/A').toUpperCase().replace(/_/g, ' '), yPos, true);
    yPos = drawTableRow(doc, 'Created At', alert.createdAt ? new Date(alert.createdAt).toLocaleString() : 'N/A', yPos, false);
    
    // Monitoring Rule Information
    if (alert.rule) {
      yPos = drawTableRow(doc, 'Monitoring Rule', alert.rule.name || 'N/A', yPos, true);
      if (alert.rule.ruleType) {
        yPos = drawTableRow(doc, 'Rule Type', (alert.rule.ruleType || 'N/A').toUpperCase().replace(/_/g, ' '), yPos, false);
      }
    }
    
    // User Information
    if (alert.user) {
      yPos += 3;
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      yPos = drawSectionHeader(doc, 'Related User', yPos);
      yPos += 2;
      yPos = drawTableRow(doc, 'User Name', alert.user.fullName || alert.user.name || 'N/A', yPos, false);
      yPos = drawTableRow(doc, 'User Code', alert.user.displayCode || alert.user.id || 'N/A', yPos, true);
      yPos = drawTableRow(doc, 'Email', alert.user.email || 'N/A', yPos, false);
    }
    
    if (alert.reviewedAt) {
      yPos = drawTableRow(doc, 'Reviewed At', new Date(alert.reviewedAt).toLocaleString(), yPos, true);
    }
    if (alert.reviewer) {
      yPos = drawTableRow(doc, 'Reviewed By', alert.reviewer.fullName || alert.reviewer.email || 'N/A', yPos, false);
    }
    yPos += 5;

    // Alert Data (from monitoring rule evaluation)
    if (alert.alertData) {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      yPos = drawSectionHeader(doc, 'Alert Detection Data', yPos);
      yPos += 2;
      
      if (alert.alertData.thresholdValue !== undefined) {
        yPos = drawTableRow(doc, 'Threshold Value', String(alert.alertData.thresholdValue), yPos, false);
      }
      if (alert.alertData.actualValue !== undefined) {
        yPos = drawTableRow(doc, 'Actual Value', String(alert.alertData.actualValue), yPos, true);
      }
      if (alert.alertData.transactionCount !== undefined) {
        yPos = drawTableRow(doc, 'Transaction Count', String(alert.alertData.transactionCount), yPos, false);
      }
      if (alert.alertData.totalAmount !== undefined) {
        yPos = drawTableRow(doc, 'Total Amount', `$${parseFloat(alert.alertData.totalAmount).toLocaleString()}`, yPos, true);
      }
      if (alert.alertData.timeWindow) {
        yPos = drawTableRow(doc, 'Time Window', alert.alertData.timeWindow, yPos, false);
      }
      if (alert.alertData.riskScore !== undefined) {
        yPos = drawTableRow(doc, 'Risk Score', String(alert.alertData.riskScore), yPos, true);
      }
      yPos += 5;
    }

    // Related Transactions
    if (alert.transactionIds && alert.transactionIds.length > 0) {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      yPos = drawSectionHeader(doc, 'Related Transactions', yPos);
      yPos += 2;
      yPos = drawTableRow(doc, 'Transaction Count', String(alert.transactionIds.length), yPos, false);
      yPos = drawTableRow(doc, 'Transaction IDs', alert.transactionIds.slice(0, 3).join(', ') + (alert.transactionIds.length > 3 ? '...' : ''), yPos, true);
      yPos += 5;
    }

    // Description
    if (alert.description) {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      yPos = drawSectionHeader(doc, 'Description', yPos);
      yPos += 2;
      const descLines = doc.splitTextToSize(alert.description, 180);
      descLines.forEach((line) => {
        if (yPos > 280) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFontSize(10);
        doc.text(line, 18, yPos);
        yPos += 5;
      });
    }

    // Review Notes
    if (alert.reviewNotes) {
      yPos += 5;
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      yPos = drawSectionHeader(doc, 'Review Notes', yPos);
      yPos += 2;
      const notesLines = doc.splitTextToSize(alert.reviewNotes, 180);
      notesLines.forEach((line) => {
        if (yPos > 280) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFontSize(10);
        doc.text(line, 18, yPos);
        yPos += 5;
      });
    }

    // ISAR Escalation
    if (alert.isar || alert.isarId) {
      yPos += 5;
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      yPos = drawSectionHeader(doc, 'ISAR Escalation', yPos);
      yPos += 2;
      yPos = drawTableRow(doc, 'Escalated to ISAR', alert.isar?.displayCode || alert.isarId || 'N/A', yPos, false);
      if (alert.escalatedAt) {
        yPos = drawTableRow(doc, 'Escalated At', new Date(alert.escalatedAt).toLocaleString(), yPos, true);
      }
    }

    addFooter(doc);
    doc.save(`Monitoring_Alert_Audit_Report_${alert.displayCode || alert.id}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleDownload = async () => {
    if (reportType === 'property' && selectedProperty) {
      generatePropertyAuditPDF();
    } else if (reportType === 'organization' && selectedOrganization) {
      generateOrganizationAuditPDF();
    } else if (reportType === 'user' && selectedUser) {
      generateUserAuditPDF();
    } else if (reportType === 'isar' && selectedIsar) {
      await generateIsarAuditPDF();
    } else if (reportType === 'alert' && selectedAlert) {
      generateAlertAuditPDF();
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Please log in to view audit reports.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-card-foreground flex items-center gap-2">
            <Shield className="w-6 h-6" />
            Audit Reports
          </h2>
          <p className="text-muted-foreground">
            Generate and download PDF audit reports for properties, organizations, users, ISARs, and alerts
          </p>
        </div>
      </div>

      {/* Report Type Selection */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-card-foreground mb-4">Select Report Type</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => {
              setReportType('property');
              setSelectedProperty('');
            }}
            className={`p-6 border-2 rounded-lg transition-all ${
              reportType === 'property'
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <Building2 className={`w-8 h-8 mx-auto mb-3 ${reportType === 'property' ? 'text-primary' : 'text-muted-foreground'}`} />
            <h4 className="font-semibold text-card-foreground mb-1">Property Report</h4>
            <p className="text-sm text-muted-foreground">Property details, investments, and activity log</p>
          </button>

          <button
            onClick={() => {
              setReportType('organization');
              setSelectedOrganization('');
            }}
            className={`p-6 border-2 rounded-lg transition-all ${
              reportType === 'organization'
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <Folder className={`w-8 h-8 mx-auto mb-3 ${reportType === 'organization' ? 'text-primary' : 'text-muted-foreground'}`} />
            <h4 className="font-semibold text-card-foreground mb-1">Organization Report</h4>
            <p className="text-sm text-muted-foreground">Organization statistics and activity log</p>
          </button>

          <button
            onClick={() => {
              setReportType('user');
              setSelectedUser('');
            }}
            className={`p-6 border-2 rounded-lg transition-all ${
              reportType === 'user'
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <Users className={`w-8 h-8 mx-auto mb-3 ${reportType === 'user' ? 'text-primary' : 'text-muted-foreground'}`} />
            <h4 className="font-semibold text-card-foreground mb-1">User Report</h4>
            <p className="text-sm text-muted-foreground">User profile, transactions, and activity log</p>
          </button>

          <button
            onClick={() => {
              setReportType('isar');
              setSelectedIsar('');
            }}
            className={`p-6 border-2 rounded-lg transition-all ${
              reportType === 'isar'
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <FileText className={`w-8 h-8 mx-auto mb-3 ${reportType === 'isar' ? 'text-primary' : 'text-muted-foreground'}`} />
            <h4 className="font-semibold text-card-foreground mb-1">ISAR Report</h4>
            <p className="text-sm text-muted-foreground">ISAR details and MLRO decisions</p>
          </button>

          <button
            onClick={() => {
              setReportType('alert');
              setSelectedAlert('');
            }}
            className={`p-6 border-2 rounded-lg transition-all ${
              reportType === 'alert'
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <AlertTriangle className={`w-8 h-8 mx-auto mb-3 ${reportType === 'alert' ? 'text-primary' : 'text-muted-foreground'}`} />
            <h4 className="font-semibold text-card-foreground mb-1">Alert Report</h4>
            <p className="text-sm text-muted-foreground">Alert details and review status</p>
          </button>
        </div>
      </Card>

      {/* Selection and Download */}
      {reportType && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-card-foreground mb-4">
            Select {reportType === 'property' ? 'Property' : 
                    reportType === 'organization' ? 'Organization' : 
                    reportType === 'user' ? 'User' :
                    reportType === 'isar' ? 'ISAR' : 'Alert'}
          </h3>
          
          {reportType === 'property' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Select Property
                </label>
                <select
                  value={selectedProperty}
                  onChange={(e) => setSelectedProperty(e.target.value)}
                  className="w-full px-4 py-2 border border-input rounded-lg bg-card text-card-foreground focus:ring-2 focus:ring-ring focus:border-ring"
                >
                  <option value="">Choose a property...</option>
                  {properties.map((property) => (
                    <option key={property.id || property.displayCode} value={property.id || property.displayCode}>
                      {property.title || property.name || 'N/A'} ({property.displayCode || property.id})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {reportType === 'organization' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Select Organization
                </label>
                <select
                  value={selectedOrganization}
                  onChange={(e) => setSelectedOrganization(e.target.value)}
                  className="w-full px-4 py-2 border border-input rounded-lg bg-card text-card-foreground focus:ring-2 focus:ring-ring focus:border-ring"
                >
                  <option value="">Choose an organization...</option>
                  {organizations.map((org) => (
                    <option key={org.id || org.displayCode} value={org.id || org.displayCode}>
                      {org.name || 'N/A'} ({org.displayCode || org.id})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {reportType === 'user' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Select User
                </label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full px-4 py-2 border border-input rounded-lg bg-card text-card-foreground focus:ring-2 focus:ring-ring focus:border-ring"
                >
                  <option value="">Choose a user...</option>
                  {users.map((user) => (
                    <option key={user.id || user.displayCode} value={user.id || user.displayCode}>
                      {user.fullName || user.name || 'N/A'} ({user.displayCode || user.id}) - {user.email}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {reportType === 'isar' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Select ISAR
                </label>
                <select
                  value={selectedIsar}
                  onChange={(e) => setSelectedIsar(e.target.value)}
                  className="w-full px-4 py-2 border border-input rounded-lg bg-card text-card-foreground focus:ring-2 focus:ring-ring focus:border-ring"
                >
                  <option value="">Choose an ISAR...</option>
                  {isars.map((isar) => (
                    <option key={isar.id || isar.displayCode} value={isar.id || isar.displayCode}>
                      {isar.displayCode || isar.id} - {isar.suspicionType || 'N/A'} ({isar.riskLevel || 'N/A'})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {reportType === 'alert' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Select Alert
                </label>
                {alertsLoading ? (
                  <div className="text-muted-foreground py-4">Loading alerts...</div>
                ) : (alertsError || alerts.length === 0) ? (
                  <div className="text-muted-foreground py-4">No data available</div>
                ) : (
                  <select
                    value={selectedAlert}
                    onChange={(e) => setSelectedAlert(e.target.value)}
                    className="w-full px-4 py-2 border border-input rounded-lg bg-card text-card-foreground focus:ring-2 focus:ring-ring focus:border-ring"
                  >
                    <option value="">Choose an alert...</option>
                    {alerts.map((alert) => (
                      <option key={alert.id || alert.displayCode} value={alert.id || alert.displayCode}>
                        {alert.displayCode || alert.id} - {alert.alertCategory || alert.alertType || 'N/A'} ({alert.severity || 'N/A'}) - {alert.user?.fullName || alert.user?.email || 'N/A'}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          )}

          <div className="mt-6">
            <Button
              onClick={handleDownload}
              disabled={
                (reportType === 'property' && !selectedProperty) ||
                (reportType === 'organization' && !selectedOrganization) ||
                (reportType === 'user' && !selectedUser) ||
                (reportType === 'isar' && !selectedIsar) ||
                (reportType === 'alert' && !selectedAlert)
              }
              className="w-full flex items-center justify-center gap-2"
            >
              <FileDown className="w-5 h-5" />
              Download Audit PDF Report
            </Button>
          </div>
        </Card>
      )}

      {/* Instructions */}
      {!reportType && (
        <Card className="p-6 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900 mb-2">Audit Report Generation</h4>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>Select a report type above (Property, Organization, User, ISAR, or Alert)</li>
                <li>Choose the specific entity from the dropdown</li>
                <li>Click "Download Audit PDF Report" to generate and download the report</li>
                <li>Reports include comprehensive data, activity logs, and audit trails</li>
                <li>All reports are marked as "AUDIT REPORT - READ ONLY"</li>
              </ul>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default AuditReports;
