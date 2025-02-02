
# URL Shortening App

This is a simple URL shortening application built with Node.js and Express. It supports Google OAuth for authentication and provides analytics on shortened URLs.

## Features

- Shorten a URL and get a custom alias.
- Redirect users from the shortened URL to the original long URL.
- Track analytics like clicks, unique users, OS type, device type, and more for each shortened URL.
- Google OAuth login for users.
- Rate limiting and caching with Redis.

## Tech Stack

- **Node.js** - Backend runtime environment
- **Express** - Web framework for Node.js
- **MongoDB** - Database to store URLs, users, and analytics
- **Redis** - Caching layer for faster lookups of long URLs and analytics
- **Passport.js** - Authentication middleware
- **Google OAuth** - Used for user authentication
- **Swagger** - API documentation

## Setup

1. Clone the repository:
   ```
   git clone https://github.com/your-repo-url.git
   cd your-repo-name
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env.dev` file and add the following environment variables:
   ```
   SESSION_SECRET=your_session_secret
   clientid=your_google_client_id
   clientsecret=your_google_client_secret
   ```

4. Run the application:
   ```
   npm start
   ```

5. The application will be available at `http://localhost:5000`.

## API Endpoints

### POST /api/shorten
Shortens a given long URL.

**Request Body**:
```json
{
  "longUrl": "http://example.com",
  "customAlias": "custom123",
  "topic": "tech"
}
```

**Response**:
```json
{
  "shortUrl": "https://short-url-app-one.vercel.app/custom123",
  "createdAt": "2025-02-02T12:34:56.789Z"
}
```

### GET /api/shorten/:shortUrl
Redirects to the long URL for a given short URL.

### GET /api/analytics/:alias
Fetches click analytics for a specific short URL.

**Response**:
```json
{
  "totalClicks": 100,
  "uniqueUsers": 75,
  "clicksByDate": [
    {
      "date": "2025-02-01",
      "clicks": 50
    },
    {
      "date": "2025-02-02",
      "clicks": 50
    }
  ],
  "osType": [
    {
      "osName": "Windows",
      "uniqueClicks": 30,
      "uniqueUsers": 25
    }
  ],
  "deviceType": [
    {
      "deviceName": "Mobile",
      "uniqueClicks": 40,
      "uniqueUsers": 35
    }
  ]
}
```

### GET /api/analytics/topic/:topic
Fetches analytics for URLs under a specific topic.

### GET /api/analytics/overall
Fetches overall analytics for the logged-in user, including click and user statistics for all their URLs.

## Redis Integration

The application uses Redis to cache URLs for fast retrieval. It also stores click analytics in Redis for efficient querying.

## License

This project is licensed under the MIT License.
