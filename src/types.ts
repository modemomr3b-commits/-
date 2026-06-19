export type UserRole = 'admin' | 'sales' | 'vip' | 'normal';

export interface BaseEntity {
  isDeleted?: boolean;
  deletedAt?: number;
  deletedBy?: string;
}

export interface User extends BaseEntity {
  uid: string; // The firestore ID
  username: string;
  password?: string;
  fullName: string;
  phone?: string;
  role: UserRole;
  isActive: boolean;
  createdAt: number;
}

export interface Category extends BaseEntity {
  id: string;
  name: string;
  order: number;
  parentId: string | null;
  isHidden?: boolean;
}

export interface Product extends BaseEntity {
  id: string;
  name: string;
  price: number; // Represents dozenPriceIqd
  dozenPriceUsd?: number;
  piecePriceUsd?: number;
  piecePriceIqd?: number;
  packaging?: string;
  piecesCount?: number;
  modelNumber: string; // The user called it الرمز
  productCode: string; // The user called it الكود
  barcode: string;
  categoryId: string;
  subcategoryId: string;
  imageUrl: string; // Will store the raw image
  finalImageUrl?: string; // Burned in info image
  isArchived: boolean;
  views: number;
  createdAt: number;
}

export interface OrderItem {
  productId: string;
  quantity: number;
  product?: Product;
}

export type OrderStatus = 'new' | 'reviewing' | 'contacted' | 'completed' | 'cancelled';

export interface Order extends BaseEntity {
  id: string;
  userId: string;
  username: string;
  fullName: string;
  orderNumber: string;
  status: OrderStatus;
  items: OrderItem[];
  totalQuantity: number;
  notes?: string;
  createdAt: number;
}

export interface Update extends BaseEntity {
  id: string;
  title: string;
  message: string;
  type: 'announcement' | 'offer' | 'new_product';
  createdAt: number;
}
