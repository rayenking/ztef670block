# ZTE Puppeteer Network Monitor

A TypeScript-based application that uses Puppeteer and Express to monitor, block, and unblock network requests.

## Features

- Network request monitoring
- URL blocking and unblocking
- Real-time request tracking
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

- `POST /api/initialize` - Initialize Puppeteer browser
- `POST /api/navigate` - Navigate to a URL
  - Body: `{ "url": "https://example.com" }`
- `POST /api/block` - Block a URL
  - Body: `{ "url": "https://example.com" }`
- `POST /api/unblock` - Unblock a URL
  - Body: `{ "url": "https://example.com" }`
- `GET /api/blocked` - Get list of blocked URLs
- `GET /api/requests` - Get network request history
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