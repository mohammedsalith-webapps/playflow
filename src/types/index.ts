export interface Vendor {
  id: string; // Internal vendor ID (e.g. VEND001)
  businessName: string;
  upiId: string;
  whatsAppNumber: string;
  logoUrl?: string;
  status: 'active' | 'suspended';
  subscriptionExpiry: string; // ISO String format YYYY-MM-DD
  createdAt: string;
  setupComplete: boolean;
  theme: 'dark' | 'light' | 'funky-purple' | 'funky-pink' | 'funky-cyan';
  currency: string; // e.g. "INR", "USD"
}

export interface Product {
  id: string;
  name: string;
  category: string;
  defaultPrice: number;
  imageUrl?: string;
  status: 'enabled' | 'disabled';
  createdAt: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number; // custom price at time of order
  quantity: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  date: string; // ISO DateTime YYYY-MM-DDTHH:mm:ss
  customerName?: string;
  customerPhone?: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  grandTotal: number;
  status: 'pending' | 'paid' | 'cancelled';
  upiDeepLink: string;
  createdAt: string;
}

export interface CustomerStats {
  phone: string;
  name?: string;
  totalOrders: number;
  totalSpend: number;
  lastOrderDate: string;
  favouriteProduct: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

export interface PlatformStats {
  totalRevenue: number;
  totalVendors: number;
  activeVendors: number;
  expiredVendors: number;
}
