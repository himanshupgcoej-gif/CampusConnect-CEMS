# CampusConnect – College Events Management System

CampusConnect is a web-based College Events Management System (CEMS) designed to simplify event management and participation within a college campus.

It provides separate interfaces for Students, Organizers, and Administrators to manage college events, registrations, attendance, and certificates.

## 🌐 Live Application

- **Frontend:** https://campusconnect-cems.netlify.app/
- **Backend API:** https://campusconnect-cems-api.onrender.com/
- **GitHub Repository:** https://github.com/himanshupgcoej-gif/CampusConnect-CEMS

## ✨ Features

### Student
- Student registration and login
- Browse available college events
- Register for events
- View registration approval status
- Check attendance status
- Download participation certificates
- Verify certificates using QR codes

### Organizer
- Organizer login
- Manage college events
- View student registrations
- Approve or reject registrations
- Mark student attendance
- Generate certificates

### Administrator
- Admin dashboard
- Manage users and system information
- Monitor event-related activities

## 🛠️ Technology Stack

### Frontend
- HTML5
- CSS3
- JavaScript

### Backend
- Python
- Flask
- Flask-CORS
- Gunicorn
- ReportLab

### Database
- PostgreSQL
- Supabase

### Deployment
- Netlify – Frontend hosting
- Render – Backend hosting
- Supabase – Database hosting
- GitHub – Version control

## 📁 Project Structure

```text
CampusConnect-CEMS/
│
├── backend/
│   ├── app.py
│   ├── database.py
│   ├── requirements.txt
│   └── routes/
│
├── frontend/
│   ├── assets/
│   │   └── js/
│   │       └── config.js
│   ├── index.html
│   └── [other frontend pages]
│
├── .gitignore
└── README.md
```

## ⚙️ Local Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/himanshupgcoej-gif/CampusConnect-CEMS.git
```

```bash
cd CampusConnect-CEMS
```

### 2. Set Up the Backend

```bash
cd backend
```

Create a virtual environment:

```bash
python -m venv .venv
```

Activate it on Windows:

```powershell
.venv\Scripts\Activate.ps1
```

Install dependencies:

```bash
pip install -r requirements.txt
```

### 3. Configure Environment Variables

Create a `.env` file inside the `backend` directory.

Add the following variables with your own values:

```env
DATABASE_URL=your_supabase_postgresql_connection_string
CEMS_SECRET_KEY=your_secret_key
CEMS_ENV=development
```

Never commit your actual `.env` file or secret keys to GitHub.

### 4. Run the Backend

```bash
python app.py
```

The backend will run locally at:

`http://127.0.0.1:5000`

### 5. Run the Frontend

Open the frontend `index.html` file using VS Code Live Server or another static web server.

The frontend API configuration is located at:

`frontend/assets/js/config.js`

## 🚀 Deployment

- Frontend is deployed using Netlify.
- Backend is deployed using Render.
- PostgreSQL database is hosted on Supabase.
- GitHub is used for source code management and deployment integration.

## 🔐 Security

- Environment variables are used for sensitive configuration.
- Database credentials are not stored in frontend code.
- Role-based access is implemented for application operations.
- Backend API access is configured using CORS.

## 🎯 Project Objective

The objective of CampusConnect is to provide a centralized platform for managing college events, reducing manual administrative work, simplifying student registrations, tracking attendance, and generating verifiable certificates.

## 👨‍💻 Development Team

**CampusConnect – College Events Management System**

Developed as an engineering academic project.

## 📄 License

This project is developed for academic and educational purposes.