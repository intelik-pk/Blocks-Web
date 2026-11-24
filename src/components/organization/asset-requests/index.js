import LoanPortfolioRequestForm from './LoanPortfolioRequestForm';
import BondsSukukRequestForm from './BondsSukukRequestForm';
import TradeFinanceRequestForm from './TradeFinanceRequestForm';
import LeasingRequestForm from './LeasingRequestForm';
import RepossessedRequestForm from './RepossessedRequestForm';
import NplRequestForm from './NplRequestForm';
import AssetCategoryPicker from './AssetCategoryPicker';

export const BANK_ASSET_REQUEST_FORMS = {
  loan_portfolio: LoanPortfolioRequestForm,
  bonds_sukuk: BondsSukukRequestForm,
  trade_finance: TradeFinanceRequestForm,
  leasing: LeasingRequestForm,
  repossessed: RepossessedRequestForm,
  npl: NplRequestForm,
};

export {
  AssetCategoryPicker,
  LoanPortfolioRequestForm,
  BondsSukukRequestForm,
  TradeFinanceRequestForm,
  LeasingRequestForm,
  RepossessedRequestForm,
  NplRequestForm,
};
