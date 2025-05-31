# Email Tracking System

A complete email tracking system built with Node.js, Express, MongoDB, and React. This system allows you to send HTML emails with tracking pixels and monitor when recipients open them.

## Features

- Send HTML emails with embedded tracking pixels
- Track email opens with timestamps
- MongoDB database for storing email and tracking data
- React admin dashboard to visualize email statistics
- Filter and sort emails by status, time, etc.

## Tech Stack

### Backend

- Node.js
- Express.js
- MongoDB with Mongoose
- Nodemailer for sending emails

### Frontend

- React
- TypeScript
- Vite
- React Router
- Tailwind CSS

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- npm or yarn

### Installation

1. Clone the repository

2. Install dependencies

   ```
   npm run setup
   ```

   This will install both server and client dependencies.

3. Configure environment variables

   - Rename `.env.example` to `.env`
   - Update the values with your MongoDB connection string and email service credentials

4. Start the development servers
   ```
   npm run dev
   ```
   This will start both the backend server and the React frontend.

### Usage

1. Access the admin dashboard at `http://localhost:5173`
2. Use the dashboard to compose and send emails
3. Monitor email opens and statistics

## API Endpoints

- `POST /api/emails` - Send a new email
- `GET /api/emails` - Get all emails
- `GET /api/emails/:id` - Get a specific email
- `GET /track/open` - Tracking pixel endpoint

## License

MIT
