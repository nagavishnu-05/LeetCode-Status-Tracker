# 📊 LeetCode Status Tracker

A **full-stack web application** for tracking, reporting, and ranking LeetCode problem-solving progress for students at **Velammal College of Engineering and Technology (VCET)**, Department of Computer Science & Engineering.

[![React](https://img.shields.io/badge/React-19.x-61dafb?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-7.x-646cff?logo=vite)](https://vite.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-4.x-06b6d4?logo=tailwindcss)](https://tailwindcss.com/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.x-000000?logo=express)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb)](https://www.mongodb.com/)

---

## ✨ Features

### 📈 Core Functionality
- **Generate Reports:** View and download detailed LeetCode statistics for any batch/section.
- **View Rankings:** See leaderboards of top performers filtered by batch year and class section.
- **Monthly Reports:** Access weekly progress snapshots stored in a dedicated monthly database.
- **Export to Excel:** Download reports as `.xlsx` files with full student data and improvement metrics.

### 🔐 Staff Verification
- Secure authentication for authorized staff members before generating sensitive reports.
- Password visibility toggle for ease of use.

### 🎨 Modern UI/UX
- Beautiful, responsive design built with **Tailwind CSS** and **Framer Motion** animations.
- Mobile-friendly, scrollable data tables.
- Custom toast notifications and a global loading indicator.

### ⏰ Automated Monthly Reports

**Automatic Weekly Progress Reports** are generated on the **4th, 11th, 18th, 25th** of each month, and the **2nd** (for Week 5) at **6:00 PM IST**.

#### Multiple Trigger Methods:

1. **Node-cron (Built-in)**: Backend includes `node-cron` that auto-triggers reports if server runs continuously on Render
2. **GitHub Actions (Recommended)**: Reliable cloud-based scheduler in `.github/workflows/monthly-reports.yml`
3. **External Cron Services**: Configure cron-job.org or similar (see `Backend/CRON_SETUP.md`)

> **⚠️ Important for Render Free Tier**: Free instances spin down after 15 minutes of inactivity, which breaks the built-in cron. Use GitHub Actions or external cron services for reliability.

See [`Backend/CRON_SETUP.md`](Backend/CRON_SETUP.md) for detailed configuration instructions.

---

## 🛠 Tech Stack

| Layer      | Technologies                                                                 |
|------------|------------------------------------------------------------------------------|
| **Frontend** | React 19, Vite 7, Tailwind CSS 4, Framer Motion, Lucide Icons, XLSX         |
| **Backend**  | Node.js 20+, Express 5, Mongoose 8, MongoDB Atlas, node-cron, Axios         |
| **Database** | MongoDB (Main DB + Monthly Report DB)                                        |
| **Tooling**  | ESLint, Nodemon, dotenv                                                      |

---

## 🗂 Project Structure

```
LeetCode-Status-Tracker/
├── Backend/
│   ├── config/
│   │   └── db.js                # MongoDB connection (Main & Monthly DBs)
│   ├── models/
│   │   ├── Staff.js             # Staff schema (batchYear, section)
│   │   ├── Student.js           # Student schema (rollNo, name, statsHistory)
│   │   └── MonthlyReport.js     # Monthly report schema
│   ├── routes/
│   │   ├── staffRoutes.js       # /staffs endpoints
│   │   ├── studentRoutes.js     # /students endpoints
│   │   ├── reportRoutes.js      # /report/:batch/:section
│   │   ├── roundsRoutes.js      # /rounds (rankings)
│   │   ├── leetcodeRoutes.js    # /api (LeetCode API proxy)
│   │   └── monthlyReportRoutes.js # /monthly-report
│   ├── server.js                # Main Express server + Cron Job
│   ├── trigger_report.js        # Manual report trigger script
│   ├── package.json
│   └── .env                     # Environment variables (MONGO_URI, PORT)
│
├── Frontend/
│   ├── public/
│   │   ├── vcet-logo.jpg
│   │   ├── cse-logo.jpg
│   │   └── leetcode-logo.png
│   ├── src/
│   │   ├── components/
│   │   │   ├── Loader.jsx               # Global loading spinner
│   │   │   ├── Toast.jsx                # Toast notification component
│   │   │   ├── StaffVerificationModal.jsx # Password verification modal
│   │   │   └── MonthlyReportModal.jsx   # Monthly report viewer
│   │   ├── App.jsx              # Main application component
│   │   ├── api.js               # Axios instance for API calls
│   │   ├── index.css            # Global styles
│   │   ├── select.css           # Custom select styling
│   │   └── main.jsx             # React entry point
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v20 or higher
- **npm** or **yarn**
- **MongoDB** (local or Atlas cloud instance)

### 1. Clone the Repository

```bash
git clone https://github.com/nagavishnu-05/LeetCode-Status-Tracker.git
cd LeetCode-Status-Tracker
```

### 2. Install Dependencies

```bash
# Backend
cd Backend
npm install

# Frontend
cd ../Frontend
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the `Backend` directory:

```env
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<db_name>
MONTHLY_DB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<monthly_db_name>
```

### 4. Run the Application

**Start Backend:**
```bash
cd Backend
npm start
# or for development with hot-reload:
npm run dev
```

**Start Frontend:**
```bash
cd Frontend
npm run dev
```

**Access the App:** Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📡 API Endpoints

| Method | Endpoint                          | Description                                      |
|--------|-----------------------------------|--------------------------------------------------|
| GET    | `/health`                         | Health check endpoint (server status & cron info) |
| GET    | `/staffs/distinct`                | Get distinct batch years                        |
| GET    | `/report/:batchYear/:className`   | Get student stats for a specific batch/section  |
| GET    | `/rounds`                         | Get rankings (with optional `batchYear` & `className` query) |
| GET    | `/monthly-report/:batch/:class`   | Get monthly reports for a batch/class           |
| POST   | `/api/admin/trigger-report`       | Manually trigger cron job (admin only)          |

---

## 🖥 Usage Guide

1. **Select Batch Year & Section** from the dropdowns on the main page.
2. Click **Generate Report** to view LeetCode statistics.
3. Complete **Staff Verification** (password required).
4. View the **Student Performance Report** popup.
5. Click **Export to Excel** to download the report.
6. Use **View Rankings** to see leaderboards by batch/class.
7. Use **Monthly Report** to access weekly snapshots.

---

## 👨‍💻 Authors & Maintainers

- **Nagavishnu Karthik B S** - Frontend
- **Devis Aruna Devi D** - Backend

---

## 📜 License

This project is intended for **academic and internal use** by VCET's CSE Department. Redistribution or commercial use is not permitted without prior permission.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 🚀 Future Roadmap

- [ ] Role-based access for faculty and placement coordinators
- [ ] Automated email notifications for report generation
- [ ] AI-based performance insights and predictions
- [ ] Integration with more coding platforms (CodeChef, HackerRank)

---

<p align="center">
  <strong>© 2023 – 2027 | CSE Department, VCET</strong>
</p>

