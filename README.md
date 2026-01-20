# StayEd - Smart Hostel Management System

StayEd is a comprehensive, multi-tenant mobile application designed to streamline hostel and PG management. Built with **React Native** and **Firebase**, it connects Residents, Admins, and Guardians through a unified, secure, and real-time platform.

---

# ⚡ Section 1: Brief Overview

### What does it do?
StayEd digitizes the entire hostel experience. It replaces manual logbooks and paper applications with a smart, geofenced, and biometric-secured digital system.

### Key Highlights
-   **For Admins**: Manage multiple hostels/PGs with a single app. Track residents, approve leaves, and monitor mess usage in real-time.
-   **For Residents**: One-tap attendance (geofenced), easy complaint raising, mess menu viewing, and community engagement.
-   **For Guardians**: Peace of mind with instant entry/exit notifications and direct leave application oversight.
-   **Security First**: Uses Geofencing (GPS), Biometrics (Fingerprint/FaceID), and Phone Authentication (OTP) to ensure data integrity and safety.

### Technology Stack
-   **Frontend**: React Native (Expo Managed Workflow)
-   **Backend**: Firebase (Firestore, Auth, Functions)
-   **Style**: Premium Glassmorphism UI with Dark Mode support.

---

# 📖 Section 2: Detailed Guide

## 🚀 Features Deep Dive

### 1. Multi-Tenant Architecture
Unlike traditional apps limited to one institution, StayEd is **multi-tenant**. New PGs or Hostels can register effectively as separate entities.
-   **Data Isolation**: Resident data, logs, and complaints are strictly siloed by `hostelId`.
-   **Scalable**: Built to handle thousands of concurrent users across different locations.

### 2. Comprehensive Role-Based Access
The app dynamically adapts its UI and functionality based on the user's role:

#### 👨‍🎓 Resident Dashboard
-   **Smart Attendance**: Uses `expo-location` to verify the user is physically within the hostel premises before marking attendance.
-   **Mess Management**: View daily menus and "Skip Meal" option (with admin alerts for high skip rates).
-   **Grievance Redressal**: File complaints with categories (Plumbing, Electrical, etc.) and track their status.
-   **Community Forum**: A real-time chat with "Notify All" capabilities for announcements.

#### 👮‍♂️ Admin Dashboard
-   **Live Monitoring**: View real-time stats on students "In Hostel" vs. "Out".
-   **Digital Logbooks**: centralized registry of all entry/exit movements.
-   **Approval Workflows**: Review leave applications that have already been cleared by guardians.
-   **Resident Directory**: Full list of residents with direct call/contact options.

#### 👪 Guardian Dashboard
-   **Real-time Alerts**: Push notifications whenever their ward enters or leaves the campus.
-   **Leave Control**: Guardians act as the first layer of approval for any leave request.

### 3. Advanced Security & Verification
-   **Geofencing**: The `calculateDistance` utility ensures attendance is only marked when distance to hostel < 80m.
-   **Biometrics**: Critical actions (Sign-out, Attendance) are protected by `expo-local-authentication` (FaceID/TouchID).
-   **Phone Auth**: Secure, passwordless login using Firebase Phone Authentication.

---

## 🛠️ Technical Architecture

### Folder Structure
The project follows a scalable, modular structure:

```text
src/
├── config/             # Firebase configuration
├── context/            # React Contexts (Auth, Theme) for global state
├── navigation/         # Centralized navigation (Root, Auth, App stacks)
├── screens/            # UI Screens
│   ├── auth/           # Login & Registration
│   ├── resident/       # Resident-specific screens
│   ├── admin/          # Admin management screens
│   └── guardian/       # Guardian monitoring screens
├── utils/              # Helper logic (Geofencing, Date formatting)
└── services/           # API and Database interaction services
```

### Key Contexts
-   **AuthContext**: Handles user session, role resolution (`admin`/`resident`/`guardian`), and `hostelId` association.
-   **ThemeContext**: Manages the application-wide Dark/Light mode theme engine.

---

## ⚙️ Installation & Setup

1.  **Prerequisites**
    -   Node.js & npm/yarn installed.
    -   Expo Go app on your physical device (iOS/Android).

2.  **Clone & Install**
    ```bash
    git clone https://github.com/your-username/stayed.git
    cd stayed
    npm install
    ```

3.  **Firebase Configuration**
    -   Create a Firebase project.
    -   Enable **Authentication** (Phone) and **Firestore**.
    -   Copy credentials to `src/config/firebaseConfig.ts`.

4.  **Run the App**
    ```bash
    npx expo start
    ```
    Scan the QR code with the Expo Go app.

---

## 🔮 Future Roadmap
-   [ ] **AI Insights**: Predictive analytics for mess food wastage.
-   [ ] **Payment Gateway**: Integrated rent and mess fee payments.
-   [ ] **Visitor Management**: Digital gate pass system for guests.