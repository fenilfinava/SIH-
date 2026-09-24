# 🌾 Krushi Sarathi (કૃષિ સારથી)

Krushi Sarathi is an AI-powered digital assistant for Indian farmers, designed to provide smart agricultural solutions. It leverages the power of GenAI to bridge the information gap in farming, offering localized, voice-enabled, and multilingual guidance.

Built for **Smart India Hackathon (SIH)**.

## ✨ Features

- **🌐 Multilingual Support:** Full support for Gujarati, Hindi, and English. The app translates UI elements and even user-generated database content dynamically!
- **🎙️ Voice Assistant:** Type or just speak! Uses speech recognition to fill out farm details and ask questions.
- **📸 Crop Disease Detection:** Upload a photo of a diseased plant, and the Gemini AI model instantly identifies the disease, its primary solution, and recommended fertilizers/medicines.
- **🌱 Smart Crop Advisor:** Enter your soil type and season to get AI-powered recommendations on what crops to grow for maximum yield.
- **💧 Soil & Irrigation Test:** Analyzes farm data and provides suggestions on irrigation schedules and soil treatment.
- **🔔 AI Farm Alerts:** Add your farms with sowing dates, and receive automated, timed alerts (e.g., "Time to add fertilizer", "Pesticide check due") on the dashboard.
- **📜 Activity History:** Keep track of your past disease scans, soil tests, and advisor queries.

## 🛠️ Tech Stack

- **Frontend:** Next.js (App Router), React, Tailwind CSS, Lucide Icons
- **Backend:** Next.js Route Handlers (`/api/*`)
- **Database:** Supabase (PostgreSQL) + REST API
- **AI Integration:** Google Gemini (Generative Language API) via raw fetch
- **Styling:** Glassmorphism UI, Responsive Mobile-First Design

## 🚀 Getting Started

### Prerequisites
Make sure you have Node.js (v18+) installed.

### 1. Clone the repository
```bash
git clone https://github.com/fenilfinava/Krushi-Sarathi-SIH.git
cd Krushi-Sarathi-SIH
```

### 2. Install dependencies
```bash
npm install
```

### 3. Environment Variables
Create a `.env.local` file in the root directory and add your Gemini API Key:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```
*(Note: Supabase credentials are pre-configured in `src/lib/supabase.ts` for this hackathon build).*

### 4. Run the development server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser to see the app.

