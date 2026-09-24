/**
 * Every string the household sees (core and weekly report). App screen strings are in UI below.
 * Category names are data stored in each transaction: changing them here only affects first setup;
 * afterwards rename in Settings. English first; translate this file for Vietnamese.
 */

export const DIRECTION_LABEL = { out: 'Expense', in: 'Income' } as const;

export const SOURCE_LABEL: Record<string, string> = {
  'example-bank': 'Example Bank',
  manual: 'Manual',
  import: 'Imported',
};

export const MANUAL_SOURCE = 'manual';
export const DEFAULT_PEOPLE = { PRIMARY: 'Member 1', PARTNER: 'Member 2', UNKNOWN: 'Unknown' };

export const UNCATEGORIZED = 'Uncategorized';
/** Money moving between the household's own accounts (card repayments, savings, transfers between members): not spending. */
export const INTERNAL_CATEGORY = 'Internal transfer';
/** An emailed expense below the small-amount threshold that matches no rule. */
export const SMALL_SPEND_CATEGORY = 'Small spending';
export const INCOME_CATEGORY = 'Income';

export const DEFAULT_SMALL_AMOUNT = 500000;

export const DEFAULT_CATEGORIES = [
  'Food & drinks',
  'Groceries',
  'Bills & home',
  'Transport',
  'Shopping',
  'Health',
  'Education',
  'Entertainment & travel',
  'Gifts & family events',
  'E-wallet top-ups',
  SMALL_SPEND_CATEGORY,
  'Other',
  INCOME_CATEGORY,
  INTERNAL_CATEGORY,
  UNCATEGORIZED,
];

// [keyword in the description, category]. Keywords are the words banks print, so they stay untranslated.
// The first matching rule wins, so specific keywords (grabfood) go before general ones (grab).
export const DEFAULT_RULES: [string, string][] = [
  ['momo', 'E-wallet top-ups'],
  ['zalopay', 'E-wallet top-ups'],
  ['thanh toan the tin dung', INTERNAL_CATEGORY],
  ['thanh toan the thang', INTERNAL_CATEGORY],
  ['tiet kiem', INTERNAL_CATEGORY],
  ['grabfood', 'Food & drinks'],
  ['shopeefood', 'Food & drinks'],
  ['highlands', 'Food & drinks'],
  ['phuc long', 'Food & drinks'],
  ['starbucks', 'Food & drinks'],
  ['katinat', 'Food & drinks'],
  ['tt luong', INCOME_CATEGORY],
  ['grab', 'Transport'],
  ['thanh toan xe', 'Transport'],
  ['xanh sm', 'Transport'],
  ['petrolimex', 'Transport'],
  ['bach hoa xanh', 'Groceries'],
  ['winmart', 'Groceries'],
  ['coopmart', 'Groceries'],
  ['lotte mart', 'Groceries'],
  ['aeon', 'Groceries'],
  ['shopee', 'Shopping'],
  ['lazada', 'Shopping'],
  ['tiki', 'Shopping'],
  ['evn', 'Bills & home'],
  ['cap nuoc', 'Bills & home'],
  ['fpt telecom', 'Bills & home'],
  ['viettel', 'Bills & home'],
  ['vnpt', 'Bills & home'],
  ['pharmacity', 'Health'],
  ['long chau', 'Health'],
  ['nha thuoc', 'Health'],
  ['benh vien', 'Health'],
  ['netflix', 'Entertainment & travel'],
  ['spotify', 'Entertainment & travel'],
  ['cgv', 'Entertainment & travel'],
  ['vietjet', 'Entertainment & travel'],
  ['agoda', 'Entertainment & travel'],
];

/** Old category name to new name, applied when importing data. */
export const LEGACY_CATEGORY_MAP: Record<string, string> = {};

export const MESSAGES = {
  invalidAmount: (value: unknown) => 'Invalid amount: ' + value,
  saved: (amount: string, category: string) => 'Saved ' + amount + ' · ' + category,
  fxRate: (label: string, rate: number) => label + ' (rate ' + rate + ')',
  fxMissing: (label: string) => label + ': no exchange rate, enter the VND amount',
  reportSubject: (range: string, total: string) => 'Spending ' + range + ': ' + total,
  reportTotal: (range: string, total: string, count: number) =>
    'Total spending ' + range + ': ' + total + ' (' + count + ' transactions)',
  reportTop: 'Top categories:',
  reportUncategorized: (count: number) => count + ' uncategorized, open the app to pick a category:',
  reportOpen: 'Open the app:',
};

/** App screen strings. */
export const UI = {
  appName: 'Household ledger',
  loading: 'Opening…', loadError: 'Could not load: ',
  tabs: { entry: 'Add', transactions: 'Transactions', overview: 'Overview', settings: 'Settings' },
  entry: {
    title: 'Add a transaction', expense: 'Expense', income: 'Income', amountHint: 'Type 45k, 1tr2 or 150.000',
    amountBad: 'Try 45k, 1tr2, 150.000…', note: 'Note (optional)', saving: 'Saving…',
    save: (amount: string, category: string) => `Save ${amount} to ${category}`, needInput: 'Enter an amount and pick a category',
    recent: 'Just added', categoryGroup: 'Category', amountLabel: 'Amount', directionGroup: 'Expense or income',
  },
  tx: {
    title: 'Transactions', all: 'All', uncategorized: 'Uncategorized', search: 'Search', loading: 'Loading…',
    empty: 'No transactions yet. Bank transactions appear when their emails arrive; add cash on the Add tab.',
    prevMonth: 'Previous month', nextMonth: 'Next month', today: 'Today', yesterday: 'Yesterday',
    edit: 'Edit transaction', description: 'Description', amountVnd: 'Amount (VND)', category: 'Category', save: 'Save', close: 'Close',
    remove: 'Delete', confirmRemove: 'Delete this transaction?', saved: 'Saved', removed: 'Deleted',
  },
  overview: {
    title: 'Where the money went', computing: 'Calculating…',
    total: (count: number) => `Total spending (${count} transactions, internal transfers excluded)`, income: 'Income: ',
    needCategory: (n: number) => `${n} need a category`, seeAll: 'See all', byCategory: 'By category', noSpending: 'No spending this month yet.',
    lastMonths: 'Last 6 months', spent: 'Spent', month: (m: number, y: string) => `${monthNames[m - 1]} ${y}`,
  },
  login: {
    // The sign-in page deliberately says nothing about what the app is.
    title: 'Sign in', emailLabel: 'Email', emailPlaceholder: 'you@example.com',
    sendCode: 'Send code', sending: 'Sending…',
    codeSent: 'If that address is allowed, a 6-digit code is on its way. It expires in 10 minutes.',
    codeLabel: 'Code', codePlaceholder: '000000', verify: 'Continue', verifying: 'Checking…',
    wrongCode: 'That code is wrong or has expired.', back: 'Use a different address',
    resend: 'Send another code', staySignedIn: 'You stay signed in on this device for a year.',
    mailSubject: (code: string) => `${code} is your sign-in code`,
    mailBody: (code: string) => `Your sign-in code is ${code}\n\nIt expires in 10 minutes. If you did not ask for it, ignore this email.`,
    signOut: 'Sign out',
  },
  settings: {
    title: 'Settings', signedIn: 'Signed in as ', family: 'Members',
    familyHint: 'The email each member signs in with and the name shown in the ledger. Each bank parser files its emails under a role: Primary or Partner.',
    email: 'email@example.com', name: 'Name', primary: 'Primary', partner: 'Partner', other: 'Other', saveNames: 'Save names', saved: 'Saved',
    categories: 'Categories', addCategory: 'Add category', save: 'Save', savedCategories: 'Categories saved', remove: 'Remove',
    rules: 'Auto-categorize rules',
    rulesHint: 'If a bank email description contains this text, use that category. Rules higher up win. Case and accents are ignored.',
    keyword: 'text in description', addRule: 'Add rule at top', savedRules: 'Rules saved',
    reapply: 'Apply rules to uncategorized transactions', reapplied: (n: number) => `Re-categorized ${n} transactions`,
    smallTitle: 'Small spending threshold',
    smallHint: 'Bank expenses below this amount that match no rule go to "Small spending" automatically, so you only categorize the big ones.',
    fxUsd: 'Fallback USD rate',
    emailLog: 'Bank emails received', emailLogHint: 'Last 100 emails sent to the app address. The Gmail forwarding confirmation code also shows up here.',
    noEmails: 'No emails received yet.', sendReport: 'Send the weekly report now', reportSent: (n: number) => `Report sent to ${n} people`,
  },
};

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
