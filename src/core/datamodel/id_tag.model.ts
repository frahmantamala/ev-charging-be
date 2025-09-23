export interface IdTag {
  idTag: string;
  status: 'Accepted' | 'Blocked' | 'Expired' | 'Invalid' | 'ConcurrentTx';
  expiryDate?: string;
  parentIdTag?: string;
}
