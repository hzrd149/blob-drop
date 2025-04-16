export interface BlobRow {
  sha256: string;
  size: number;
  type?: string;
  uploaded: number;
  expires?: number;
}

export interface TokenRow {
  token: string;
  mint: string;
  amount: number;
}
