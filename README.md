# ZTE Puppeteer Network Scanner

A TypeScript-based web application that uses Puppeteer and Express to scan your local network, view connected devices, and manage device access through a user-friendly interface.

## Features

- Network device scanning
- Device blocking and unblocking
- Real-time device status monitoring
- Simple web interface
- RESTful API endpoints

## Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

## Development

To run the development server:
```bash
npm run dev
```

## API Endpoints

- `GET /api/initialize` - Initialize Puppeteer browser
- `GET /api/scan` - Scan network for connected devices
- `POST /api/block` - Block a device
  - Body: `{ "type": "device_type", "macAddress": "device_mac_address" }`
- `POST /api/unblock` - Unblock a device
  - Body: `{ "type": "device_type", "macAddress": "device_mac_address" }`
- `GET /api/blocked` - Get list of blocked devices
- `POST /api/close` - Close the browser

## Building

To build the project:
```bash
npm run build
```

To start the production server:
```bash
npm start
```

## Technologies Used

- TypeScript
- Express.js
- Puppeteer
- Node.js

## Project Structure

```
src/
├── index.ts           # Main application entry point
├── public/           # Static files
│   └── index.html    # Web interface
└── services/         # Business logic
    └── puppeteer.service.ts  # Puppeteer automation service
``` 