# LeetCode Status Tracker

A full-stack web application for tracking and reporting LeetCode problem-solving progress for students, with batch and class-based filtering, rankings, and downloadable reports.

## Features

### Frontend
- Built with React and Vite
- Modern UI with Tailwind CSS and Framer Motion animations
- Staff selection and class/batch filtering
- Rankings popup with batch year and class section dropdowns
- Responsive tables for student stats and rankings
- Downloadable Excel reports
- Clean, mobile-friendly design

### Backend
- Node.js + Express REST API
- MongoDB for data storage
- Endpoints for staff, student, report, and rankings data
- Filtering and sorting logic for batch year and class section
- Excel report generation

## Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm
- MongoDB (local or cloud)

### Installation

1. Clone the repository:
   ```sh
   git clone https://github.com/nagavishnu-05/LeetCode-Status-Tracker.git
   cd LeetCode-Status-Tracker
   ```

2. Install dependencies for both frontend and backend:
   ```sh
   cd Backend
   npm install
   cd ../Frontend
   npm install
   ```

3. Configure MongoDB connection in `Backend/config/db.js`.

### Running the App

#### Backend
```sh
cd Backend
npm start
```

#### Frontend
```sh
cd Frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## API Endpoints

- `GET /staffs` — List all staff
- `GET /students` — List all students
- `GET /report/:staffId` — Get student stats for a staff/class
- `GET /ranking` — Get rankings with optional batch/class filters

## Usage

- Select a staff/class in-charge to view student stats
- Click "Next" to view the stats popup
- Download Excel report for the selected class
- Click "View Rankings" to see rankings by batch/class
- Filter rankings by batch year and class section (A, B, C, D)

## Technologies Used
- React, Vite, Tailwind CSS, Framer Motion
- Node.js, Express, MongoDB, Mongoose
- XLSX (Excel export)

## Folder Structure
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

## Contributing
Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

## License
MIT
