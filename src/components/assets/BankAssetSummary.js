import React from 'react';
import { Landmark, CalendarClock, BarChart3 } from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import {
  getCategory,
  getTypeLabel,
  getCashFlowKindLabel,
  isBankAsset,
  CASH_FLOW_STATUS_LABELS,
} from '../../utils/assetCategories';

const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : 'N/A');

const formatDetailValue = (field, value) => {
  if (value === undefined || value === null || value === '') return 'N/A';
  if (field.type === 'select') return field.options.find((o) => o.value === value)?.label || value;
  if (field.type === 'date') return formatDate(value);
  if (field.type === 'number') return Number(value).toLocaleString();
  return String(value);
};

export const AssetCategoryBadge = ({ category, type, className = '' }) => {
  if (!isBankAsset(category)) return null;
  return (
    <Badge variant="info" className={className}>
      {getCategory(category).label}
      {type ? ` · ${getTypeLabel(category, type)}` : ''}
    </Badge>
  );
};

/**
 * Bank-asset section shared by request review, org/admin property detail and investor views.
 * Renders nothing for real estate so existing pages are unchanged.
 */
const BankAssetSummary = ({ asset, isRequest = false }) => {
  if (!asset || !isBankAsset(asset.assetCategory)) return null;

  const category = getCategory(asset.assetCategory);
  const details = asset.assetDetails || {};
  const schedule = Array.isArray(asset.cashFlowSchedule) ? asset.cashFlowSchedule : [];
  const scheduledTotal = schedule.reduce((sum, entry) => sum + (Number(entry.amountUSDT) || 0), 0);
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h4 className="text-lg font-semibold text-card-foreground mb-4 flex items-center gap-2">
          <Landmark className="w-5 h-5" />
          {category.label} Details
        </h4>
        {category.description && (
          <p className="text-sm text-muted-foreground mb-4">{category.description}</p>
        )}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Asset Type</label>
            <p className="text-sm font-medium text-card-foreground mt-1">
              {getTypeLabel(asset.assetCategory, asset.type)}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Maturity</label>
            <p className="text-sm font-medium text-card-foreground mt-1">{formatDate(asset.maturityDate)}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Risk Rating</label>
            <p className="text-sm font-bold text-card-foreground mt-1">{asset.riskRating || 'Not rated'}</p>
          </div>
          {category.detailFields.map((field) => (
            <div key={field.key}>
              <label className="text-sm font-medium text-muted-foreground">{field.label}</label>
              <p className="text-sm font-medium text-card-foreground mt-1">
                {formatDetailValue(field, details[field.key])}
              </p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <h4 className="text-lg font-semibold text-card-foreground mb-4 flex items-center gap-2">
          <CalendarClock className="w-5 h-5" />
          Cash-flow Schedule
        </h4>
        {schedule.length === 0 ? (
          <p className="text-sm text-muted-foreground">No cash-flow schedule provided.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="py-2 pr-4 font-medium">Due Date</th>
                  <th className="py-2 pr-4 font-medium">Type</th>
                  <th className="py-2 pr-4 font-medium text-right">Amount (USDT)</th>
                  <th className="py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map((entry, index) => (
                  <tr key={`${entry.dueDate}-${index}`} className="border-b border-border last:border-0">
                    <td className="py-2 pr-4 text-card-foreground">{formatDate(entry.dueDate)}</td>
                    <td className="py-2 pr-4 text-card-foreground">{getCashFlowKindLabel(entry.kind)}</td>
                    <td className="py-2 pr-4 text-right font-medium text-card-foreground">
                      {Number(entry.amountUSDT || 0).toLocaleString()}
                    </td>
                    <td className="py-2">
                      <Badge variant={entry.status === 'distributed' ? 'success' : entry.status === 'received' ? 'info' : 'default'}>
                        {CASH_FLOW_STATUS_LABELS[entry.status] || 'Scheduled'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td className="pt-3 font-medium text-muted-foreground" colSpan={2}>
                    <span className="inline-flex items-center gap-1"><BarChart3 className="w-4 h-4" /> Total scheduled</span>
                  </td>
                  <td className="pt-3 text-right font-bold text-card-foreground">{scheduledTotal.toLocaleString()}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default BankAssetSummary;
