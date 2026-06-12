# 📚 Apex Library Management — Mobile App

A premium React Native companion app for the **Apex Library Management System**, built with **Expo SDK 54** and **expo-router**. Connects securely to the MERN backend with 2FA staff login, role-based dashboards (Admin, Librarian, Member), book catalog search, study pod bookings, digital eBook previews, and a live notifications inbox — all wrapped in a sleek glassmorphic dark theme.

---

## 🌐 Related Project — Web Application

This mobile app uses the same backend as the full-stack web version:

👉 **[Live Web App](https://mern-web-based-library-management-s.vercel.app)**
👉 **[Web App Source Code](https://github.com/Aaqib-boss/MERN-Web-Based-Library-Management-System)**

---

## 📲 Installation

### 🤖 Android

Scan the QR code below or click the link to download and install the APK directly on your device:

![Android QR Code](android-qr.png)

📥 **[Download APK](https://expo.dev/accounts/hilmes-organization/projects/apex-library/builds/a2bd5227-8a52-4444-a214-aa3a3c2ef7a5)**

> Note: You may need to allow "Install from unknown sources" in your Android settings.

### 🍎 iOS

Standalone iOS builds require an Apple Developer account. For now, run the app via **Expo Go**:

1. Install **[Expo Go](https://apps.apple.com/app/expo-go/id982107779)** from the App Store
2. Clone this repository:
```bash
   git clone https://github.com/Aaqib-boss/Apex-Library-Management-Mobile-App.git
   cd Apex-Library-Management-Mobile-App
   npm install
   npx expo start
```
3. Scan the QR code shown in your terminal using your iPhone Camera app

---

## 🔑 Demo Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@library.com | admin123 |
| Librarian | librarian@library.com | librarian123 |
| Member | john.doe@email.com | member123 |

---

## ✨ Features

- 🔐 Secure JWT Authentication with Staff 2FA
- 🧑‍💼 Role-based dashboards (Admin, Librarian, Member)
- 📖 Book catalog with search & category filters
- 📚 Active loans, reservations & return management
- 💳 Online fine payments (simulated)
- 🛋️ Study room / desk booking system
- 📱 Digital eBook chapter previews
- 🔔 Real-time notifications inbox
- 🎨 Sleek dark glassmorphic UI matching the web portal

---

## 🛠️ Tech Stack

- **Framework:** React Native (Expo SDK 54)
- **Routing:** expo-router (file-based)
- **Language:** TypeScript
- **State/Auth:** Context API + AsyncStorage
- **Backend:** Node.js + Express + MongoDB ([repo](https://github.com/Aaqib-boss/MERN-Web-Based-Library-Management-System))

---

## ⚙️ Local Development

```bash
git clone https://github.com/Aaqib-boss/Apex-Library-Management-Mobile-App.git
cd Apex-Library-Management-Mobile-App
npm install
npx expo start
```

Scan the QR code with **Expo Go** (Android/iOS) to run on your device.

---

## 📄 License

This project is for educational/demo purposes.
