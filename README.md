# Technoceram Help Desk Application

A full-stack help desk application built with React JS, Python Flask, and PostgreSQL.

## 🚀 Project Overview

- **Company Name:** Technoceram
- **Brand Colors:** Black (#000000), White (#FFFFFF), Red (#E53935)
- **Frontend:** React JS with Vite
- **Backend:** Python Flask
- **Database:** PostgreSQL

## 📁 Project Structure

```
PROJECT 2/
├── frontend/                 # React JS Frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── Login/       # Login page component
│   │   │   └── Dashboard/   # Dashboard component
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.jsx
│   ├── package.json
│   ├── vite.config.js
│   └── index.html
├── backend/                  # Python Flask Backend
│   ├── app.py              # Main application
│   ├── requirements.txt    # Python dependencies
│   └── .env               # Environment variables
├── database/               # Database scripts
│   └── schema.sql
└── SPEC.md                # Project specification
```

## 🛠️ Setup Instructions

### Prerequisites
- Node.js (v18+)
- Python (v3.9+)
- PostgreSQL (v14+)

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment:
```bash
python -m venv venv
```

3. Activate the virtual environment:
```bash
# Windows
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate
```

4. Install dependencies:
```bash
pip install -r requirements.txt
```

5. (Optional) Set up PostgreSQL:
   - Create a database named `technoceram_helpdesk`
   - Update the `.env` file with your database credentials

6. Run the backend server:
```bash
python app.py
```

The backend will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:3000`

## 🔐 Demo Credentials

| Email | Password | Role |
|-------|----------|------|
| admin@technoceram.com | admin123 | Admin |
| support@technoceram.com | support123 | Agent |
| user@technoceram.com | user123 | User |

## 📝 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/verify` - Verify JWT token

### Health Check
- `GET /` - API status

## 🎨 Features

### Login Page
- ✅ Technoceram branding (Black, White, Red theme)
- ✅ Email/password validation
- ✅ Remember me functionality
- ✅ Error handling with user feedback
- ✅ Loading states
- ✅ JWT token authentication
- ✅ Responsive design

### Dashboard
- ✅ Welcome message
- ✅ Quick action cards
- ✅ User info display
- ✅ Logout functionality

## 🔜 Next Steps

1. Connect to PostgreSQL database
2. Create ticket management system
3. Implement user roles and permissions
4. Add knowledge base
5. Implement ticket assignment workflow
6. Add email notifications
7. Deploy to production

## 📄 License

Copyright © 2024 Technoceram. All rights reserved.

