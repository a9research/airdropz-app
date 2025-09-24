export interface CSVAccountData {
  Name: string;
  Browser_ID: string;
  Token: string;
  Proxy: string;
  UID: string;
  Username: string;
  Password: string;
  Group?: string;
}

export interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
  accounts: any[];
}

export interface ExportOptions {
  format: 'csv' | 'json';
  filename?: string;
  includeGroups?: boolean;
}
