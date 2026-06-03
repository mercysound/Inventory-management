// ─────────────────────────────────────────────────────────────────────────────
// SERVER SETUP INSTRUCTIONS
// Complete guide for wiring all new routes and the cron job into your server.
// ─────────────────────────────────────────────────────────────────────────────

// ── STEP 1: Install node-cron ─────────────────────────────────────────────────
//
//   cd D:\Inventory-management\server
//   npm install node-cron
//
// ─────────────────────────────────────────────────────────────────────────────

// ── STEP 2: Import all new routes in your server entry file ───────────────────
//
// Add these imports alongside your existing route imports:

import settingsRoutes        from "./routes/settingsRoutes.js";
import expiringOrdersRoutes  from "./routes/expiringOrdersRoutes.js";
import completedHistoryRoutes from "./routes/completedHistoryRoutes.js";
import allOrdersPlacedRoutes  from "./routes/allOrdersPlacedRoutes.js";

// ── STEP 3: Import and start the cron job ─────────────────────────────────────
import { startOrderExpiryCron } from "./jobs/orderExpiryCron.js";

// ── STEP 4: Register all routes ───────────────────────────────────────────────
//
// Add these AFTER your existing app.use() lines:

app.use("/api/settings",          settingsRoutes);        // GET/PUT /settings, GET/PUT/DELETE /settings/product-draft
app.use("/api/expiring-orders",   expiringOrdersRoutes);  // GET /expiring-orders, GET /expiring-orders/count
app.use("/api/completed-history", completedHistoryRoutes);// GET/DELETE, POST /:id/refund, GET /cancelled-pending
app.use("/api/placed-orders",     allOrdersPlacedRoutes); // GET, PUT /:id/status, DELETE

// ── STEP 5: Start cron AFTER mongoose connects ────────────────────────────────
//
// Find your mongoose.connect() call and add startOrderExpiryCron() right after:
//
// Option A — promise style:
//
//   mongoose.connect(process.env.MONGO_URI).then(() => {
//     console.log("✅ MongoDB connected");
//     startOrderExpiryCron();    // ← ADD THIS
//     app.listen(PORT, () => console.log(`Server on port ${PORT}`));
//   });
//
// Option B — async/await style:
//
//   await mongoose.connect(process.env.MONGO_URI);
//   console.log("✅ MongoDB connected");
//   startOrderExpiryCron();      // ← ADD THIS
//   app.listen(PORT, () => console.log(`Server on port ${PORT}`));
//
// ─────────────────────────────────────────────────────────────────────────────

// ── STEP 6: Validate the product draft route in settingsRoutes ────────────────
//
// The settingsRoutes.js file already handles:
//   GET    /settings                → getSettings
//   PUT    /settings                → updateSettings
//   GET    /settings/product-draft  → getProductDraft
//   PUT    /settings/product-draft  → saveProductDraft  (called every 1.5s from form)
//   DELETE /settings/product-draft  → clearProductDraft (called on successful product add)
//
// ─────────────────────────────────────────────────────────────────────────────

// ── STEP 7: File placement guide ─────────────────────────────────────────────
//
// SERVER files — place in these folders:
//
//   server/models/
//     ├── SettingsModel.js           ← per-user settings + productFormDraft field
//     ├── AllOrdersPlacedModel.js    ← expiry email tracking fields added
//     ├── CompletedOrderHistoryModel.js ← cancel/refund fields added
//     └── UserModel.js               ← wholesale role in enum
//
//   server/controllers/
//     ├── settingsController.js      ← getSettings, updateSettings, draft endpoints
//     ├── allOrdersPlacedController.js ← cancel flow with stock restore + email
//     ├── completedHistoryController.js ← refund button, cancelled-pending endpoint
//     ├── expiringOrdersController.js ← overdue orders + count for bell badge
//     ├── orderController.js         ← wholesale = AllOrdersPlaced like customer
//     ├── productController.js       ← role-based price filtering
//     └── userController.js          ← admin password reset, wholesale role
//
//   server/routes/
//     ├── settingsRoutes.js
//     ├── allOrdersPlacedRoutes.js
//     ├── completedHistoryRoutes.js
//     └── expiringOrdersRoutes.js
//
//   server/jobs/
//     └── orderExpiryCron.js         ← runs every 15 min
//
//   server/utils/email/
//     ├── customerOrderCancelled.js  ← cancel notification email
//     └── orderExpiryAdminEmail.js   ← overdue order admin email
//
//   server/validators/
//     └── schemas.js                 ← all schemas updated
//
// ─────────────────────────────────────────────────────────────────────────────

// ── STEP 8: Frontend file placement guide ─────────────────────────────────────
//
//   src/context/
//     ├── AuthContext.jsx            ← unchanged
//     └── CartContext.jsx            ← NEW — global cart count
//
//   src/main.jsx                     ← CartProvider added inside AuthProvider
//
//   src/pages/
//     ├── Dashboard.jsx              ← FloatingCartButton + ExpiryBell
//     └── LandingPage.jsx            ← wholesale redirect to /wholesale-dashboard
//
//   src/utils/
//     └── ProtectedRoute.jsx         ← wholesale role supported
//
//   src/components/share-component/cart/
//     └── FloatingCartButton.jsx     ← NEW — fixed bottom-right cart button
//
//   src/components/share-component/sidebar/
//     └── Sidebar.jsx                ← wholesale menu, Settings + Expiring Orders links
//
//   src/components/share-component/history/
//     ├── SharedOrderTable.jsx       ← bulk select, wholesale filter, labeled dates, refund btn
//     ├── AdminCompletedHistory.jsx  ← refund handler
//     ├── CustomerCompletedHistory.jsx
//     └── StaffCompletedHistory.jsx
//
//   src/components/share-component/product/
//     ├── Product.jsx                ← category filter bug fixed, draft integration
//     ├── ProductForm.jsx            ← server-side draft with 1.5s debounce
//     └── ProductTable.jsx           ← wholesale column toggle (staff, saved to localStorage)
//
//   src/components/admin/purchase/
//     └── PlacedOrders.jsx           ← cancel option, labeled date inputs
//
//   src/components/admin/purchase/
//     └── PlacedOrdersTable.jsx      ← cancel in status select
//
//   src/components/admin/settings/
//     └── SettingsPage.jsx           ← per-user settings, product draft info
//
//   src/components/admin/expiring/
//     └── ExpiringOrders.jsx         ← overdue orders page
//
//   src/components/admin/user/
//     ├── Users.jsx                  ← wholesale stat pill
//     └── UsersTable.jsx             ← wholesale filter button
//
//   src/components/admin/dashboard/
//     └── Summary.jsx                ← revenue excludes refunded, wholesale count
//
//   src/components/customer/CustomerOrderPortal/
//     └── CustomerOrderPortal.jsx    ← wholesale badge, cancelled orders in pending modal
//
//   src/components/customer/customerProduct/
//     └── PendingOrdersModal.jsx     ← shows cancelled-pending-refund orders
//
//   src/components/staff/orders/
//     └── StaffOrders.jsx            ← wholesale toggle
//
//   src/App.jsx                      ← all new routes registered
//
// ─────────────────────────────────────────────────────────────────────────────

// ── STEP 9: Create new folder for FloatingCartButton ─────────────────────────
//
//   Run in your frontend directory:
//   mkdir -p src/components/share-component/cart
//
//   Run in your frontend directory for new admin pages:
//   mkdir -p src/components/admin/settings
//   mkdir -p src/components/admin/expiring
//
// ─────────────────────────────────────────────────────────────────────────────
