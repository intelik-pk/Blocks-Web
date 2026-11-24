import React from 'react';
import { Landmark, FileText, Briefcase, Truck, Package, AlertTriangle } from 'lucide-react';
import Card from '../../ui/Card';
import { ASSET_CATEGORIES, BANK_ASSET_CATEGORIES } from '../../../utils/assetCategories';

const ICONS = {
  loan_portfolio: Briefcase,
  bonds_sukuk: Landmark,
  trade_finance: FileText,
  leasing: Truck,
  repossessed: Package,
  npl: AlertTriangle,
};

/**
 * Step 1 of org asset registration: pick one of the six bank asset categories.
 */
export default function AssetCategoryPicker({ onSelect }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-card-foreground">Select Asset Category</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Choose a category to open its dedicated registration form.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {BANK_ASSET_CATEGORIES.map((key) => {
          const def = ASSET_CATEGORIES[key];
          const Icon = ICONS[key] || Landmark;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(key)}
              className="text-left"
            >
              <Card className="p-5 h-full hover:border-primary hover:shadow-md transition-all cursor-pointer border border-border">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-semibold text-card-foreground">{def.label}</h4>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-3">
                      {def.description}
                    </p>
                    <p className="text-xs text-primary mt-3 font-medium">
                      Open {def.label} form →
                    </p>
                  </div>
                </div>
              </Card>
            </button>
          );
        })}
      </div>
    </div>
  );
}
