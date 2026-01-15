import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { FileText, Download, Calendar, Search } from 'lucide-react';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import InputTwo from '../../../components/ui/InputTwo';
import { complianceAPI } from '../../../services/complianceAPI';
import { useAdminAuth } from '../../../components/admin/AdminAuth';
import { AdminRole } from '../../../utils/rbac';
import Loader from '../../../components/Loder';
import { jsPDF } from 'jspdf';

const ReportRegistry = () => {
  const { isAuthenticated, adminUser } = useAdminAuth();
  const [reportTypeFilter, setReportTypeFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const adminId = adminUser?.id;
  const role = adminUser?.role;
  const isMlro = role === AdminRole.MLRO || role === AdminRole.SUPER_ADMIN;

  const filters = {
    ...(reportTypeFilter !== 'all' && { reportType: reportTypeFilter }),
    ...(startDate && { startDate }),
    ...(endDate && { endDate }),
  };

  const { data: registryData, isLoading } = useQuery(
    ['report-registry', filters],
    () => complianceAPI.getReportRegistry(filters, adminId),
    {
      enabled: isAuthenticated && isMlro,
      retry: 1,
    }
  );

  const registry = registryData?.data?.data || registryData?.data || [];

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('STR/CTR Report Registry', 14, 20);
    doc.setFontSize(10);

    let y = 30;
    registry.forEach((report, index) => {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(12);
      doc.text(`${index + 1}. ${report.reportReference}`, 14, y);
      y += 7;

      doc.setFontSize(10);
      doc.text(`Type: ${report.reportType.toUpperCase()}`, 14, y);
      y += 5;
      doc.text(`Status: ${report.status}`, 14, y);
      y += 5;
      doc.text(`Filing Status: ${report.filingStatus}`, 14, y);
      y += 5;
      if (report.approvedAt) {
        doc.text(`Approved: ${new Date(report.approvedAt).toLocaleDateString()}`, 14, y);
        y += 5;
      }
      if (report.filedAt) {
        doc.text(`Filed: ${new Date(report.filedAt).toLocaleDateString()}`, 14, y);
        y += 5;
      }
      if (report.goamlReference) {
        doc.text(`goAML Ref: ${report.goamlReference}`, 14, y);
        y += 5;
      }
      if (report.approver) {
        doc.text(`Approved By: ${report.approver.fullName} (${report.approver.email})`, 14, y);
        y += 5;
      }
      if (report.filer) {
        doc.text(`Filed By: ${report.filer.fullName} (${report.filer.email})`, 14, y);
        y += 5;
      }
      if (report.isar) {
        doc.text(`ISAR Case: ${report.isar.displayCode}`, 14, y);
        y += 5;
      }
      y += 5;
    });

    doc.save(`STR_CTR_Registry_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  if (!isMlro) {
    return (
      <div className="p-6">
        <Card>
          <div className="text-center py-12">
            <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Access Denied</h3>
            <p className="text-gray-600 dark:text-gray-400">Only MLRO and Super Admin can view the report registry.</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">STR/CTR Report Registry</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Complete log of all Suspicious Transaction Reports and Currency Transaction Reports
          </p>
        </div>
        <Button onClick={exportToPDF}>
          <Download className="w-4 h-4 mr-2" />
          Export to PDF
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Report Type
              </label>
              <select
                value={reportTypeFilter}
                onChange={(e) => setReportTypeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Types</option>
                <option value="str">STR</option>
                <option value="ctr">CTR</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Start Date
              </label>
              <InputTwo
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                End Date
              </label>
              <InputTwo
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Registry Table */}
      <Card>
        <div className="p-6">
          {isLoading ? (
            <Loader />
          ) : registry.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 dark:text-gray-400">No reports found in registry.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Report Ref</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Type</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Status</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Filing Status</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Approved Date</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Filed Date</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">goAML Ref</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Approved By</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Filed By</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Case Ref</th>
                  </tr>
                </thead>
                <tbody>
                  {registry.map((report) => (
                    <tr key={report.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="py-3 px-4 text-gray-900 dark:text-white font-mono">{report.reportReference}</td>
                      <td className="py-3 px-4 text-gray-900 dark:text-white uppercase">{report.reportType}</td>
                      <td className="py-3 px-4 text-gray-900 dark:text-white">{report.status.replace('_', ' ')}</td>
                      <td className="py-3 px-4 text-gray-900 dark:text-white">{report.filingStatus.replace('_', ' ')}</td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                        {report.approvedAt ? new Date(report.approvedAt).toLocaleDateString() : '-'}
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                        {report.filedAt ? new Date(report.filedAt).toLocaleDateString() : '-'}
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400 font-mono">
                        {report.goamlReference || '-'}
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                        {report.approver ? `${report.approver.fullName} (${report.approver.email})` : '-'}
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                        {report.filer ? `${report.filer.fullName} (${report.filer.email})` : '-'}
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400 font-mono">
                        {report.isar?.displayCode || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default ReportRegistry;
