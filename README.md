# StayEd - Multi-Tenant Hostel Management System

StayEd is a modern, cross-platform mobile application built with **React Native (Expo)** and **Firebase**. It provides a comprehensive solution for managing hostels and PGs, featuring distinct dashboards for Residents, Admins, and Guardians.

---

## ⚡ Brief Overview

StayEd simplifies hostel management by automating everyday tasks:
- **For Residents**: Geofenced attendance, complaint registration, leave applications, and real-time community forum.
- **For Admins**: Multi-tenant infrastructure, resident registration, attendance logs, and automated mess skip alerts.
- **For Guardians**: Real-time monitoring of entries/exits and one-tap leave approvals.
- **Key Tech**: Geofencing, Biometric Verification, Real-time Push Notifications, and Dark Mode.

---

## 🚀 Key Features

### 🏢 Multi-Tenancy
- **Hostel Registration**: Admins can register their specific hostel or PG.
- **Isolated Data**: Each hostel has its own residents, complaints, and configurations.

### 📍 Attendance & Entry/Exit
- **Geofenced Attendance**: Residents can only mark attendance within a specified radius of the hostel.
- **Biometric Security**: Attendance and entry/exit logs require fingerprint/face verification.
- **Time-Slots**: Attendance is limited to specific morning and evening windows.

### 💬 Community & Notifications
- **Discussion Forum**: A real-time chat for residents with a "Notify All" feature for important announcements.
- **Smart Notifications**: Instant alerts for leave requests, complaint resolutions, and high mess skip rates (>10%).

### 🛠️ Complaint & Leave Management
- **Categorized Complaints**: General, Electrical, Plumbing, etc.
- **Approval Workflow**: Leave requests go through Guardian approval before Admin review.

### 🌗 Modern UI/UX
- **Dark Mode Support**: System-wide theme switching.
- **Premium Aesthetics**: Glassmorphism, subtle micro-animations, and descriptive icons.

---

## 🛠️ Technical Stack

- **Frontend**: React Native with Expo (Managed Workflow)
- **Backend/Database**: Firebase Firestore (Real-time updates)
- **Authentication**: Firebase Phone Auth (OTP-based)
- **Location Services**: `expo-location` for geofencing
- **Biometrics**: `expo-local-authentication`
- **Notifications**: `expo-notifications`
- **Navigation**: React Navigation (Stack Navigator)
- **Language**: TypeScript

---

## 📂 Project Structure

```text
hostel-management-app/
├── src/
│   ├── config/            # Firebase and environmental configurations
│   ├── context/           # Auth and Theme State Management
│   ├── navigation/        # Root and Role-based navigation logic
│   ├── screens/           # Core Application Screens
│   │   ├── admin/         # Dashboard, Logs, Registration
│   │   ├── resident/      # Attendance, Mess, Forum, Profile
│   │   ├── guardian/      # Leave approvals, Dashboard
│   │   └── auth/          # Login, Hostel Registration
│   └── utils/             # Geofencing logic, Notification helpers
├── assets/                # Images and Branding
├── App.tsx                # Entry point with Context Providers
└── package.json           # Dependencies and Scripts
```

---

## 📖 Detailed Breakdown

### 1. Unified Authentication (`AuthContext.tsx`)
The application uses a centralized `AuthContext` to manage sessions. Upon login, it fetches the user's role (`resident`, `admin`, or `guardian`) and their associated `hostelId`, ensuring data isolation across the platform.

### 2. Geofencing Engine (`attendanceUtils.ts`)
The `calculateDistance` function uses the Haversine formula to verify if a resident is within the hostel's `GEOFENCE_RADIUS` (default 80m). This makes the attendance system tamper-proof.

### 3. Notification Logic (`notificationUtils.ts`)
A custom notification wrapper handles Expo push tokens. It supports:
- **Individual**: Specific alerts for resolved complaints.
- **Bulk**: Alerts to all admins for mess issues or all residents for forum posts.

---

## 🛠️ Setup & Installation

1. **Clone the Repo**
   ```bash
   git clone <repo-url>
   cd hostel-management-app
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Firebase**
   - Create a project at [Firebase Console](https://console.firebase.google.com/).
   - Update `src/config/firebaseConfig.ts` with your credentials.

4. **Run the App**
   ```bash
   npx expo start
   ```

> [!TIP]
> To test **Push Notifications** or **Geofencing**, use the **Expo Go** app on a physical device.

---

## 📜 Future Roadmap
- [ ] AI-powered complaint categorization
- [ ] Integrated payment gateway for mess/rent
- [ ] Detailed analytics for hostel owners
- [ ] Offline support for entry/exit logging
