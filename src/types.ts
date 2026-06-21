export interface Customer {
  id: string;
  name: string;
}

export interface BankingCategory {
  id: string;
  name: string;
}

export interface RecordData {
  id?: string;
  ownerId: string;
  type: 'baht' | 'kyat';
  customerName: string;
  
  // Baht fields
  amountTHB?: number;
  rate?: number;
  amountMMK?: number; 
  
  // Kyat fields
  paymentMethod?: 'cash' | 'banking' | 'both';
  cashAmount?: number;
  bankingAmount?: number;
  bankingCategory?: string;
  totalMMK?: number;
  
  createdAt: any;
}
