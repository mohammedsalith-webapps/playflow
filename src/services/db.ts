import { auth, firestore, isFirebaseEnabled } from "./firebaseConfig";
import { 
  signInWithEmailAndPassword, 
  signOut,
  createUserWithEmailAndPassword
} from "firebase/auth";
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy
} from "firebase/firestore";
import type { Vendor, Product, Order, Announcement, PlatformStats } from "../types";

// ==========================================
// INTERNAL HELPERS & MOCK SEEDING
// ==========================================

const MOCK_PRODUCTS: Omit<Product, "id" | "createdAt">[] = [
  { name: "Double Espresso", category: "Beverages", defaultPrice: 120, status: "enabled" },
  { name: "Cold Brew Coffee", category: "Beverages", defaultPrice: 160, status: "enabled" },
  { name: "Blueberry Muffin", category: "Bakery", defaultPrice: 90, status: "enabled" },
  { name: "Chocolate Croissant", category: "Bakery", defaultPrice: 110, status: "enabled" },
  { name: "Avocado Sourdough Toast", category: "Snacks", defaultPrice: 220, status: "enabled" },
  { name: "Club Sandwich", category: "Snacks", defaultPrice: 180, status: "enabled" },
  { name: "Matcha Latte", category: "Beverages", defaultPrice: 150, status: "enabled" },
  { name: "Fudge Brownie", category: "Bakery", defaultPrice: 95, status: "enabled" },
];

const seedMockData = () => {
  if (!localStorage.getItem("payflow_vendors")) {
    const today = new Date();
    const activeExpiry = new Date();
    activeExpiry.setMonth(today.getMonth() + 3); // 3 months from now
    const expiredExpiry = new Date();
    expiredExpiry.setMonth(today.getMonth() - 1); // 1 month ago

    const mockVendors: Vendor[] = [
      {
        id: "VEND101",
        businessName: "The Daily Brew Cafe",
        upiId: "dailybrew@okaxis",
        whatsAppNumber: "919876543210",
        logoUrl: "",
        status: "active",
        subscriptionExpiry: activeExpiry.toISOString().split("T")[0],
        createdAt: today.toISOString(),
        setupComplete: true,
        theme: "funky-purple",
        currency: "INR"
      },
      {
        id: "VEND102",
        businessName: "Corner Sweet Bakery",
        upiId: "cornerbakery@okicici",
        whatsAppNumber: "919988776655",
        logoUrl: "",
        status: "active",
        subscriptionExpiry: expiredExpiry.toISOString().split("T")[0],
        createdAt: today.toISOString(),
        setupComplete: true,
        theme: "funky-pink",
        currency: "INR"
      }
    ];
    localStorage.setItem("payflow_vendors", JSON.stringify(mockVendors));

    // Seed passwords
    const mockPasswords = {
      "VEND101": "cafe123",
      "VEND102": "bakery123"
    };
    localStorage.setItem("payflow_vendor_passwords", JSON.stringify(mockPasswords));

    // Seed products for VEND101
    const p101: Product[] = MOCK_PRODUCTS.map((p, idx) => ({
      ...p,
      id: `p_${idx + 1}`,
      createdAt: today.toISOString()
    }));
    localStorage.setItem("payflow_products_VEND101", JSON.stringify(p101));

    // Seed products for VEND102
    const p102: Product[] = MOCK_PRODUCTS.slice(0, 4).map((p, idx) => ({
      ...p,
      id: `p_${idx + 1}`,
      createdAt: today.toISOString()
    }));
    localStorage.setItem("payflow_products_VEND102", JSON.stringify(p102));

    // Seed historical orders for VEND101 to generate rich analytics
    const mockOrders: Order[] = [];
    const customers = [
      { name: "Rahul Sharma", phone: "9876543210" },
      { name: "Priya Patel", phone: "9988776655" },
      { name: "Amit Verma", phone: "9123456789" },
      { name: "Neha Sen", phone: "9812345678" },
      { name: "", phone: "9765432109" } // anonymous number only
    ];

    // Create 30 orders across the last 30 days
    for (let i = 0; i < 30; i++) {
      const orderDate = new Date();
      orderDate.setDate(today.getDate() - i);
      // Randomize hours to simulate peak sales times
      orderDate.setHours(9 + Math.floor(Math.random() * 11), Math.floor(Math.random() * 60));

      const customer = customers[Math.floor(Math.random() * customers.length)];
      const itemQty1 = 1 + Math.floor(Math.random() * 2);
      const itemQty2 = Math.random() > 0.5 ? 1 : 0;
      
      const items = [
        {
          productId: "p_1",
          name: "Double Espresso",
          price: 120,
          quantity: itemQty1
        }
      ];

      if (itemQty2 > 0) {
        items.push({
          productId: "p_3",
          name: "Blueberry Muffin",
          price: 90,
          quantity: itemQty2
        });
      }

      const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const discount = Math.random() > 0.7 ? 20 : 0;
      const grandTotal = Math.max(0, subtotal - discount);

      // Random status (more paid orders, some pending, occasional cancelled)
      const rand = Math.random();
      const status = rand > 0.3 ? "paid" : rand > 0.1 ? "pending" : "cancelled";

      const orderNum = `ORD-${1000 + 30 - i}`;
      const order: Order = {
        id: `ord_${30 - i}`,
        orderNumber: orderNum,
        date: orderDate.toISOString(),
        customerName: customer.name || undefined,
        customerPhone: customer.phone,
        items,
        subtotal,
        discount,
        grandTotal,
        status: status as any,
        upiDeepLink: `upi://pay?pa=dailybrew@okaxis&pn=The%20Daily%20Brew%20Cafe&am=${grandTotal}&tn=${orderNum}`,
        createdAt: orderDate.toISOString()
      };
      mockOrders.push(order);
    }
    localStorage.setItem("payflow_orders_VEND101", JSON.stringify(mockOrders));

    // Seed announcements
    const mockAnnouncements: Announcement[] = [
      {
        id: "ann_1",
        title: "PayFlow v1.0 Released!",
        content: "Welcome to the all-new PayFlow dashboard. Create order links and share them on WhatsApp in under 15 seconds!",
        createdAt: today.toISOString()
      },
      {
        id: "ann_2",
        title: "System Update Schedule",
        content: "We will be performing a short database maintenance on Sunday night between 2 AM to 3 AM IST. The app will remain accessible.",
        createdAt: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];
    localStorage.setItem("payflow_announcements", JSON.stringify(mockAnnouncements));
  }
};

// Auto-seed mock data when importing
seedMockData();

// Map Vendor ID to Firebase email
const getFirebaseEmail = (vendorId: string) => {
  return `${vendorId.toLowerCase().trim()}@payflow.com`;
};

// ==========================================
// AUTHENTICATION API
// ==========================================

export const dbAuth = {
  login: async (userId: string, password: string): Promise<{ role: "admin" | "vendor"; id: string; data?: any }> => {
    // 1. Super Admin Check
    if (userId.trim().toLowerCase() === "admin") {
      if (password === "adminpassword123") {
        const sessionUser = { role: "admin" as const, id: "admin" };
        localStorage.setItem("payflow_session", JSON.stringify(sessionUser));
        return sessionUser;
      }
      throw new Error("Invalid Administrator password.");
    }

    // 2. Firebase Vendor Login
    if (isFirebaseEnabled && auth) {
      const email = getFirebaseEmail(userId);
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const uid = userCredential.user.uid;
        
        // Fetch Vendor Profile
        const vendorDoc = await getDoc(doc(firestore!, "vendors", uid));
        if (!vendorDoc.exists()) {
          throw new Error("Vendor profile does not exist.");
        }
        const vendorData = vendorDoc.data() as Vendor;
        
        const sessionUser = { role: "vendor" as const, id: uid, data: vendorData };
        localStorage.setItem("payflow_session", JSON.stringify(sessionUser));
        return sessionUser;
      } catch (err: any) {
        console.error("Firebase Login Error:", err);
        throw new Error(err.message || "Failed to log in via Firebase.");
      }
    }

    // 3. Mock Vendor Login
    const vendors: Vendor[] = JSON.parse(localStorage.getItem("payflow_vendors") || "[]");
    const passwords = JSON.parse(localStorage.getItem("payflow_vendor_passwords") || "{}");

    const vendor = vendors.find(v => v.id.toLowerCase() === userId.toLowerCase());
    if (!vendor || passwords[vendor.id] !== password) {
      throw new Error("Invalid Vendor ID or password.");
    }

    const sessionUser = { role: "vendor" as const, id: vendor.id, data: vendor };
    localStorage.setItem("payflow_session", JSON.stringify(sessionUser));
    return sessionUser;
  },

  logout: async () => {
    if (isFirebaseEnabled && auth) {
      await signOut(auth);
    }
    localStorage.removeItem("payflow_session");
  },

  getCurrentUser: (): { role: "admin" | "vendor"; id: string; data?: any } | null => {
    const session = localStorage.getItem("payflow_session");
    if (!session) return null;
    return JSON.parse(session);
  }
};

// ==========================================
// VENDOR PROFILE & SETTINGS
// ==========================================

export const dbVendor = {
  getProfile: async (vendorId: string): Promise<Vendor> => {
    if (isFirebaseEnabled && firestore) {
      const docRef = doc(firestore, "vendors", vendorId);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) return snapshot.data() as Vendor;
      throw new Error("Vendor profile not found");
    }

    const vendors: Vendor[] = JSON.parse(localStorage.getItem("payflow_vendors") || "[]");
    const vendor = vendors.find(v => v.id === vendorId);
    if (!vendor) throw new Error("Vendor not found");
    return vendor;
  },

  updateSetup: async (vendorId: string, updates: Partial<Pick<Vendor, "businessName" | "upiId" | "whatsAppNumber" | "logoUrl">>): Promise<Vendor> => {
    if (isFirebaseEnabled && firestore) {
      const docRef = doc(firestore, "vendors", vendorId);
      const updatedFields = {
        ...updates,
        setupComplete: true
      };
      await updateDoc(docRef, updatedFields);
      
      const snap = await getDoc(docRef);
      const vendor = snap.data() as Vendor;
      
      // Update session storage
      const session = dbAuth.getCurrentUser();
      if (session && session.id === vendorId) {
        session.data = vendor;
        localStorage.setItem("payflow_session", JSON.stringify(session));
      }
      return vendor;
    }

    const vendors: Vendor[] = JSON.parse(localStorage.getItem("payflow_vendors") || "[]");
    const idx = vendors.findIndex(v => v.id === vendorId);
    if (idx === -1) throw new Error("Vendor not found");

    const updatedVendor = {
      ...vendors[idx],
      ...updates,
      setupComplete: true
    };
    vendors[idx] = updatedVendor;
    localStorage.setItem("payflow_vendors", JSON.stringify(vendors));

    // Update session storage
    const session = dbAuth.getCurrentUser();
    if (session && session.id === vendorId) {
      session.data = updatedVendor;
      localStorage.setItem("payflow_session", JSON.stringify(session));
    }
    return updatedVendor;
  },

  updateTheme: async (vendorId: string, theme: Vendor["theme"]): Promise<void> => {
    if (isFirebaseEnabled && firestore) {
      await updateDoc(doc(firestore, "vendors", vendorId), { theme });
    }
    const vendors: Vendor[] = JSON.parse(localStorage.getItem("payflow_vendors") || "[]");
    const idx = vendors.findIndex(v => v.id === vendorId);
    if (idx !== -1) {
      vendors[idx].theme = theme;
      localStorage.setItem("payflow_vendors", JSON.stringify(vendors));
      
      // Update session
      const session = dbAuth.getCurrentUser();
      if (session && session.id === vendorId) {
        session.data.theme = theme;
        localStorage.setItem("payflow_session", JSON.stringify(session));
      }
    }
  },

  updateCurrency: async (vendorId: string, currency: string): Promise<void> => {
    if (isFirebaseEnabled && firestore) {
      await updateDoc(doc(firestore, "vendors", vendorId), { currency });
    }
    const vendors: Vendor[] = JSON.parse(localStorage.getItem("payflow_vendors") || "[]");
    const idx = vendors.findIndex(v => v.id === vendorId);
    if (idx !== -1) {
      vendors[idx].currency = currency;
      localStorage.setItem("payflow_vendors", JSON.stringify(vendors));

      // Update session
      const session = dbAuth.getCurrentUser();
      if (session && session.id === vendorId) {
        session.data.currency = currency;
        localStorage.setItem("payflow_session", JSON.stringify(session));
      }
    }
  }
};

// ==========================================
// PRODUCT CATALOG API
// ==========================================

export const dbProducts = {
  getAll: async (vendorId: string): Promise<Product[]> => {
    if (isFirebaseEnabled && firestore) {
      const q = query(collection(firestore, "vendors", vendorId, "products"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
    }

    return JSON.parse(localStorage.getItem(`payflow_products_${vendorId}`) || "[]");
  },

  add: async (vendorId: string, product: Omit<Product, "id" | "createdAt">): Promise<Product> => {
    const newProduct: Product = {
      ...product,
      id: `p_${Date.now()}`,
      createdAt: new Date().toISOString()
    };

    if (isFirebaseEnabled && firestore) {
      const colRef = collection(firestore, "vendors", vendorId, "products");
      await setDoc(doc(colRef, newProduct.id), newProduct);
      return newProduct;
    }

    const products = await dbProducts.getAll(vendorId);
    products.unshift(newProduct);
    localStorage.setItem(`payflow_products_${vendorId}`, JSON.stringify(products));
    return newProduct;
  },

  update: async (vendorId: string, productId: string, updates: Partial<Product>): Promise<Product> => {
    if (isFirebaseEnabled && firestore) {
      const docRef = doc(firestore, "vendors", vendorId, "products", productId);
      await updateDoc(docRef, updates);
      const snap = await getDoc(docRef);
      return { id: snap.id, ...snap.data() } as Product;
    }

    const products = await dbProducts.getAll(vendorId);
    const idx = products.findIndex(p => p.id === productId);
    if (idx === -1) throw new Error("Product not found");

    const updated = { ...products[idx], ...updates };
    products[idx] = updated;
    localStorage.setItem(`payflow_products_${vendorId}`, JSON.stringify(products));
    return updated;
  },

  delete: async (vendorId: string, productId: string): Promise<void> => {
    if (isFirebaseEnabled && firestore) {
      await deleteDoc(doc(firestore, "vendors", vendorId, "products", productId));
      return;
    }

    const products = await dbProducts.getAll(vendorId);
    const filtered = products.filter(p => p.id !== productId);
    localStorage.setItem(`payflow_products_${vendorId}`, JSON.stringify(filtered));
  }
};

// ==========================================
// ORDERS API
// ==========================================

export const dbOrders = {
  getAll: async (vendorId: string): Promise<Order[]> => {
    if (isFirebaseEnabled && firestore) {
      const q = query(collection(firestore, "vendors", vendorId, "orders"), orderBy("date", "desc"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
    }

    return JSON.parse(localStorage.getItem(`payflow_orders_${vendorId}`) || "[]");
  },

  add: async (vendorId: string, orderData: Omit<Order, "id" | "orderNumber" | "date" | "createdAt">): Promise<Order> => {
    const orders = await dbOrders.getAll(vendorId);
    const today = new Date();
    
    // Generate order number like ORD-1001
    const nextNum = 1001 + orders.length;
    const orderNumber = `ORD-${nextNum}`;
    const id = `ord_${Date.now()}`;

    const newOrder: Order = {
      ...orderData,
      id,
      orderNumber,
      date: today.toISOString(),
      createdAt: today.toISOString()
    };

    if (isFirebaseEnabled && firestore) {
      await setDoc(doc(firestore, "vendors", vendorId, "orders", id), newOrder);
      return newOrder;
    }

    orders.unshift(newOrder);
    localStorage.setItem(`payflow_orders_${vendorId}`, JSON.stringify(orders));
    return newOrder;
  },

  updateStatus: async (vendorId: string, orderId: string, status: Order["status"]): Promise<Order> => {
    if (isFirebaseEnabled && firestore) {
      const docRef = doc(firestore, "vendors", vendorId, "orders", orderId);
      await updateDoc(docRef, { status });
      const snap = await getDoc(docRef);
      return { id: snap.id, ...snap.data() } as Order;
    }

    const orders = await dbOrders.getAll(vendorId);
    const idx = orders.findIndex(o => o.id === orderId);
    if (idx === -1) throw new Error("Order not found");

    const updated = { ...orders[idx], status };
    orders[idx] = updated;
    localStorage.setItem(`payflow_orders_${vendorId}`, JSON.stringify(orders));
    return updated;
  }
};

// ==========================================
// SYSTEM ANNOUNCEMENTS
// ==========================================

export const dbAnnouncements = {
  getAll: async (): Promise<Announcement[]> => {
    if (isFirebaseEnabled && firestore) {
      const q = query(collection(firestore, "announcements"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Announcement));
    }

    return JSON.parse(localStorage.getItem("payflow_announcements") || "[]");
  },

  broadcast: async (title: string, content: string): Promise<Announcement> => {
    const announcement: Announcement = {
      id: `ann_${Date.now()}`,
      title,
      content,
      createdAt: new Date().toISOString()
    };

    if (isFirebaseEnabled && firestore) {
      await setDoc(doc(firestore, "announcements", announcement.id), announcement);
      return announcement;
    }

    const announcements = await dbAnnouncements.getAll();
    announcements.unshift(announcement);
    localStorage.setItem("payflow_announcements", JSON.stringify(announcements));
    return announcement;
  }
};

// ==========================================
// SUPER ADMIN VENDOR MANAGEMENT
// ==========================================

export const dbAdmin = {
  getPlatformStats: async (): Promise<PlatformStats> => {
    // Compute stats
    let totalRevenue = 0;
    let totalVendors = 0;
    let activeVendors = 0;
    let expiredVendors = 0;

    const todayStr = new Date().toISOString().split("T")[0];

    if (isFirebaseEnabled && firestore) {
      const snap = await getDocs(collection(firestore, "vendors"));
      totalVendors = snap.docs.length;
      
      for (const d of snap.docs) {
        const vendor = d.data() as Vendor;
        const isExpired = vendor.subscriptionExpiry < todayStr;
        
        if (vendor.status === "active" && !isExpired) {
          activeVendors++;
        } else {
          expiredVendors++;
        }

        // Fetch each vendor's orders for revenue
        const orderSnap = await getDocs(collection(firestore, "vendors", d.id, "orders"));
        orderSnap.forEach(oDoc => {
          const order = oDoc.data() as Order;
          if (order.status === "paid") {
            totalRevenue += order.grandTotal;
          }
        });
      }
    } else {
      const vendors: Vendor[] = JSON.parse(localStorage.getItem("payflow_vendors") || "[]");
      totalVendors = vendors.length;

      vendors.forEach(v => {
        const isExpired = v.subscriptionExpiry < todayStr;
        if (v.status === "active" && !isExpired) {
          activeVendors++;
        } else {
          expiredVendors++;
        }

        const orders: Order[] = JSON.parse(localStorage.getItem(`payflow_orders_${v.id}`) || "[]");
        orders.forEach(o => {
          if (o.status === "paid") {
            totalRevenue += o.grandTotal;
          }
        });
      });
    }

    return { totalRevenue, totalVendors, activeVendors, expiredVendors };
  },

  getVendors: async (): Promise<Vendor[]> => {
    if (isFirebaseEnabled && firestore) {
      const snap = await getDocs(collection(firestore, "vendors"));
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vendor));
    }
    return JSON.parse(localStorage.getItem("payflow_vendors") || "[]");
  },

  createVendor: async (vendorId: string, passwordPlain: string, subscriptionExpiry: string): Promise<Vendor> => {
    const today = new Date().toISOString();
    const vendorIdClean = vendorId.trim().toUpperCase();

    // Check uniqueness
    const currentVendors = await dbAdmin.getVendors();
    if (currentVendors.some(v => v.id.toUpperCase() === vendorIdClean)) {
      throw new Error("Vendor ID already exists.");
    }

    const newVendor: Vendor = {
      id: vendorIdClean,
      businessName: "",
      upiId: "",
      whatsAppNumber: "",
      status: "active",
      subscriptionExpiry,
      createdAt: today,
      setupComplete: false,
      theme: "funky-purple",
      currency: "INR"
    };

    if (isFirebaseEnabled && firestore && auth) {
      // 1. Create email/password in Firebase Auth
      const email = getFirebaseEmail(vendorIdClean);
      const cred = await createUserWithEmailAndPassword(auth, email, passwordPlain);
      const uid = cred.user.uid;

      // 2. Set vendor document in Firestore keyed by UID
      const vendorWithUid: Vendor = { ...newVendor, id: uid }; // Firebase uses UIDs
      await setDoc(doc(firestore, "vendors", uid), vendorWithUid);
      return vendorWithUid;
    }

    // Local Storage Flow
    const vendors = await dbAdmin.getVendors();
    vendors.push(newVendor);
    localStorage.setItem("payflow_vendors", JSON.stringify(vendors));

    const passwords = JSON.parse(localStorage.getItem("payflow_vendor_passwords") || "{}");
    passwords[vendorIdClean] = passwordPlain;
    localStorage.setItem("payflow_vendor_passwords", JSON.stringify(passwords));

    return newVendor;
  },

  updateVendor: async (vendorId: string, updates: Partial<Vendor>): Promise<void> => {
    if (isFirebaseEnabled && firestore) {
      await updateDoc(doc(firestore, "vendors", vendorId), updates);
      return;
    }

    const vendors = await dbAdmin.getVendors();
    const idx = vendors.findIndex(v => v.id === vendorId);
    if (idx !== -1) {
      vendors[idx] = { ...vendors[idx], ...updates };
      localStorage.setItem("payflow_vendors", JSON.stringify(vendors));
    }
  },

  resetPassword: async (vendorId: string, newPasswordPlain: string): Promise<void> => {
    if (isFirebaseEnabled && auth && firestore) {
      // In production Firebase, resetting another user's password from client SDK is restricted
      // unless done through Admin SDK or email reset link.
      // For standard client SDK compliance, we trigger a reset password email, or if we have admin credentials we update it.
      // To simulate admin password reset easily in a client SaaS sandbox, we use standard flows.
      throw new Error("Password reset on Firebase requires standard email flow or Admin console. Local simulation is active.");
    }

    const passwords = JSON.parse(localStorage.getItem("payflow_vendor_passwords") || "{}");
    passwords[vendorId] = newPasswordPlain;
    localStorage.setItem("payflow_vendor_passwords", JSON.stringify(passwords));
  },

  deleteVendor: async (vendorId: string): Promise<void> => {
    if (isFirebaseEnabled && firestore) {
      await deleteDoc(doc(firestore, "vendors", vendorId));
      return;
    }

    const vendors = await dbAdmin.getVendors();
    const filtered = vendors.filter(v => v.id !== vendorId);
    localStorage.setItem("payflow_vendors", JSON.stringify(filtered));

    const passwords = JSON.parse(localStorage.getItem("payflow_vendor_passwords") || "{}");
    delete passwords[vendorId];
    localStorage.setItem("payflow_vendor_passwords", JSON.stringify(passwords));

    localStorage.removeItem(`payflow_products_${vendorId}`);
    localStorage.removeItem(`payflow_orders_${vendorId}`);
  }
};
