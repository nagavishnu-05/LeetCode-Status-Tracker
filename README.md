# LeetCode Status Tracker

The **LeetCode Status Tracker** is a full-stack web application for tracking and reporting LeetCode problem-solving progress for students, with batch and class-based filtering, rankings, and downloadable reports.

## 📌 Features

### Frontend

* Built with React and Vite  
* Modern UI with Tailwind CSS and Framer Motion animations  
* Staff selection and class/batch filtering  
* Rankings popup with batch year and class section dropdowns  
* Responsive tables for student stats and rankings  
* Downloadable Excel reports  
* Clean, mobile-friendly design

### Backend

* Node.js + Express REST API  
* MongoDB for data storage  
* Endpoints for staff, student, report, and rankings data  
* Filtering and sorting logic for batch year and class section  
* Excel report generation

## 🗂 File Structure

```
LeetCode-Status-Tracker/
├── Backend/
│   ├── config/
│   ├── models/
│   ├── routes/
│   ├── server.js
│   └── package.json
├── Frontend/
│   ├── public/
│   ├── src/
│   ├── index.html
│   ├── App.jsx
│   └── package.json
└── README.md
```

## 🚀 Installation & Setup

### Prerequisites

* Node.js (v18+ recommended)  
* npm  
* MongoDB (local or cloud)

### 1. Clone the Repository

```bash
git clone https://github.com/nagavishnu-05/LeetCode-Status-Tracker.git
cd LeetCode-Status-Tracker
```

### 2. Install Dependencies

```bash
cd Backend
npm install
cd ../Frontend
npm install
```

### 3. Configure Database

Update MongoDB connection in `Backend/config/db.js`.

### 4. Run the App

#### Backend
```bash
cd Backend
npm start
```
#### Frontend
```bash
cd Frontend
npm run dev
```
Open `http://localhost:5173` in your browser.

## 🛠 API Endpoints

* `GET /staffs` — List all staff  
* `GET /students` — List all students  
* `GET /report/:staffId` — Get student stats for a staff/class  
* `GET /ranking` — Get rankings with optional batch/class filters

## 🎮 Usage

* Select a staff/class in-charge to view student stats  
* Click "Next" to view the stats popup  
* Download Excel report for the selected class  
* Click "View Rankings" to see rankings by batch/class  
* Filter rankings by batch year and class section (A, B, C, D)

## ⚙️ Tech Stack

* React, Vite, Tailwind CSS, Framer Motion  
* Node.js, Express, MongoDB, Mongoose  
* XLSX for Excel export

## 👨‍💻 Developed & Maintained By

* Devis Aruna Devi D  
* Nagavishnu Karthik B S

---

## 📜 License

This project is intended for academic and internal use by the LeetCode Status Tracker team. Redistribution or commercial use is not permitted without prior permission.

## 🛠 Badges

![React](https://img.shields.io/badge/React-18.0-blue) 
![Vite](https://img.shields.io/badge/Vite-Frontend-purple) 
![License](https://img.shields.io/badge/License-Academic-orange) 
![PRs](https://img.shields.io/badge/PRs-Welcome-brightgreen)

## 🤝 Contributing

1. Fork the repository  
2. Create a new branch (`feature-name`)  
3. Commit your changes  
4. Push to the branch  
5. Submit a pull request

## 🚀 Future Enhancements

* Role-based access for faculty and placement coordinators  
* Automated resume generation for students  
* AI-based placement prediction and insights  
* Email & SMS notifications for drive updates

---

<h3 align="center">© 2023 – 2027 CSE B of VCET</h3>
