# SDUCS - MK Multitasking

A full-stack File Management & Cloud Storage system built across Web (React), Backend (Express/MongoDB), and Mobile (Flutter/Android).

## Tech Stack
- **Web Frontend**: React, React Router, TailwindCSS/Glassmorphism, Context API
- **Mobile Frontend**: Android/Flutter
- **Backend**: Node.js, Express, Mongoose, Server-side MD5 Hash checking
- **Storage/DB**: MongoDB, AWS S3/Cloud Storage Simulator
- **Authentication**: JWT & Firebase OAuth

## How to Initialize and Access Features

### Step 1: Backend Setup
1. CD into the backend `cd backend`
2. Run `npm install` 
3. Edit your `.env` to include your Mongo connection URI and API Keys.
4. Run `npm run dev` to start the backend on port 5000.

### Step 2: Web Frontend Setup
1. CD into the web directory `cd web`
2. Run `npm install`
3. Edit your `.env` to map `REACT_APP_API_URL` to your backend URL.
4. Run `npm start` to run the frontend on port 3000.

### Step 3: Flutter / Android Codebase Setup
1. Run `flutter pub get` inside the `mobile` directory.
2. Ensure you have an Android device / emulator running.
3. Run `flutter run`

## Git Usage
To push to your Github profile:
1. `git init` and `git add .`
2. `git commit -m "Initial checkin"`
3. Create your repository on Github.
4. Use `git remote add origin YOUR_URL`
5. `git push -u origin main`
# SDUCS
# SDUCS
# SDUCS
