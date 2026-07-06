export type UserRole = 'admin' | 'sales' | 'vip' | 'normal';
export type DeviceAccess = 'all' | 'mobile' | 'desktop';
export type UserStatus = 'active' | 'suspended';

export interface BaseEntity {
  isDeleted?: boolean;
  deletedAt?: number;
  deletedBy?: string;
}

export interface User extends BaseEntity {
  id: string; // The primary ID now in supabase
  uid: string; // The firestore ID
  username: string;
  password?: string;
  fullName: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  allowedDevice: DeviceAccess;
  lastActive?: number;
  currentPage?: string;
  isOnline?: boolean;
  allowedPages?: any;
  createdAt: number;
  updatedAt?: number;
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
  forceStandardCrush?: boolean;
  modelNumber: string; // The user called it الرمز
  productCode: string; // The user called it الكود
  barcode: string;
  categoryId: string;
  subcategoryId: string;
  imageUrl: string; // Will store the raw image
  finalImageUrl?: string; // Burned in info image
  isArchived: boolean;
  isHidden?: boolean;
  views: number;
  createdAt: number;
  updatedAt?: number;
  oldPriceInfo?: {
    price: number;
    piecePriceIqd?: number;
    dozenPriceUsd?: number;
    finalImageUrl: string;
    updatedAt: number;
  };
}

export interface OrderItem {
  productId: string;
  quantity: number;
  product?: Product;
}

export interface ActivityLog {
  id?: string;
  userId: string;
  userName?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  details?: any;
  createdAt: number;
  updatedAt?: number;
}

export interface Notification extends BaseEntity {
  id?: string;
  userId?: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: number;
  updatedAt?: number;
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
  updatedAt?: number;
}

export interface Update extends BaseEntity {
  id: string;
  title: string;
  message: string;
  type: 'announcement' | 'offer' | 'new_product';
  createdAt: number;
  updatedAt?: number;
}
