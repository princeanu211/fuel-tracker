# ⛽ Fuel Log & Mileage Tracker

A multi-vehicle fuel logging web app with charts, reminders, and cloud sync.

**Live App:** [https://princeanu211.github.io/fuel-tracker/](https://princeanu211.github.io/fuel-tracker/)

---

## 🚀 Features

### 🔐 Authentication
- Email/Password login & signup via Firebase Auth
- Data syncs across all devices (phone, tablet, PC)
- Secure per-user data isolation

### 🚗 Multi-Vehicle Support
- Add unlimited vehicles with custom icon & name
- Choose vehicle type: 🚗🏍️🚙🚐🛻🏎️🛵⚡
- Set default fuel type per vehicle (Petrol/Diesel, CNG, Electric)
- Delete vehicle with all its data

### 📂 Expandable/Collapsible Accordion
- Click any vehicle header to expand its details
- Only one vehicle expanded at a time (others auto-collapse)
- Header shows quick summary: Avg Mileage, Last Mileage, Entry Count
- Animated ▼ arrow indicator

### ➕ Fuel Entry Logging
- Date, Odometer, Fuel Type, Price per unit, Quantity
- Auto-calculates: Distance, Mileage (km/L or km/Kg or km/kWh), Total Cost
- Validates odometer is always increasing
- Supports multiple fuel types: Petrol/Diesel (L), CNG (Kg), Electric (kWh)

### 📊 Statistics Cards
- **Average Mileage** (overall)
- **Last Mileage** (most recent fill-up)
- **Total Distance** driven

### 📈 Charts (3 types per vehicle)
1. **Mileage Trend** — Line chart showing mileage over time
2. **Cost/KM Monthly** — Monthly average fuel cost per kilometer (₹/km)
3. **Monthly Distance & Fuel Spend** — Dual-axis bar chart (Distance in km + Spend in ₹)

### 📋 Fill-up History Table
- Scrollable table with all entries
- Columns: #, Date, Fuel, Odometer, Distance, Qty, Price, Total ₹, Mileage, Action
- **3 Action buttons per row:**
  - 🟣 **+ Insert** — Add a new row above
  - 🔵 **✎ Edit** — Inline edit (transforms row into input fields)
  - 🔴 **✕ Delete** — Remove entry
- Scroll position preserved after edit/save

### 🔔 Custom Reminders
- Set reminders with **due date** and **message** per vehicle
- Color-coded status:
  - 🔔 Blue — Upcoming
  - ⚠️ Yellow — Due Today
  - 🚨 Red — OVERDUE
  - ✅ Grey — Completed
- **Inline editing** — Click ✎ to edit date/message directly in the reminder card
- **Mark as Done / Undo**
- **Delete** reminder
- Stored in Firebase (syncs across devices)

### 🔔 Push Notifications (Browser)
- Requests notification permission on first visit
- Shows native OS notifications for due/overdue reminders
- Works in background via Service Worker
- Vibration support on mobile
- Click notification to open/focus the app
- Each reminder notifies only once per day

### 📥 Export/Import Excel
- **Export** — Download vehicle's fuel log as `.xlsx` file
- **Import** — Upload Excel file to bulk-add entries
- Handles Excel serial number dates automatically
- Proper timezone-safe date handling

### 📱 Progressive Web App (PWA)
- **Installable** — Chrome shows "Add to Home Screen" prompt automatically
- **Standalone mode** — Opens full-screen without browser address bar
- **Custom app icon** — Purple ⛽ fuel pump icon on home screen
- **Splash screen** — Shows app name & icon while loading
- **Theme color** — Purple status bar on Android
- **Apple iOS support** — apple-mobile-web-app meta tags for Safari
- Fully responsive design (works on phone, tablet, desktop)
- Touch-friendly buttons and inputs

---

## 📁 Files

| File | Description |
|------|-------------|
| `index.html` | Main HTML page with CSS |
| `fuel-app.js` | Core logic: Auth, Firebase CRUD, Reminders, Notifications |
| `fuel-app2.js` | Rendering: Accordion, Charts, Tables |
| `firebase-messaging-sw.js` | Service Worker for background notifications |
| `manifest.json` | PWA manifest — enables install, standalone mode, icons |
| `icon-192.png` | App icon 192×192 (home screen) |
| `icon-512.png` | App icon 512×512 (splash screen) |

---

## 🛠️ Tech Stack

- **Frontend:** Vanilla HTML/CSS/JavaScript
- **Database:** Firebase Firestore (NoSQL, real-time)
- **Auth:** Firebase Authentication (Email/Password)
- **Charts:** Chart.js
- **Excel:** SheetJS (XLSX)
- **Hosting:** GitHub Pages (free)
- **Notifications:** Service Worker + Notification API

---

## 🗄️ Firebase Data Structure

```
users/{uid}/
├── vehicles/{vehicleId}
│   ├── icon, name, fuelType, createdAt
│   ├── entries/{entryId}
│   │   └── date, odometer, price, qty, fuelType, distance, mileage, totalCost
│   └── reminders/{reminderId}
│       └── dueDate, message, done, createdAt
```

---

## 🔒 Security

- Firebase API keys are public by design (identify project only)
- **Firestore Security Rules** restrict access to authenticated user's own data
- All data encrypted in transit (HTTPS) and at rest
- No sensitive payment data stored

### Recommended Firestore Rules:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## 📲 How to Use on Mobile

1. Open the app URL in Chrome/Safari
2. **Allow notifications** when prompted
3. Tap Share → **"Add to Home Screen"**
4. Launch from home screen like a native app
5. All data syncs via Firebase

---

## 🚀 Deployment

1. Upload all 4 files to GitHub repository
2. Enable GitHub Pages (Settings → Pages → main branch)
3. Add `princeanu211.github.io` to Firebase Authorized Domains
4. Access via: `https://princeanu211.github.io/fuel-tracker/`

---

## 📝 License

Personal use project. Not for commercial distribution.

### 🏆 What Makes This App Stand Out

- No app store needed — Works directly in browser
- Zero cost — Firebase free tier + GitHub Pages
- Privacy — Your data, your Firebase project, no third-party access
- Cross-platform — Same app on Android, iOS, Windows, Mac
- Excel integration — Power users can maintain data in spreadsheets too
