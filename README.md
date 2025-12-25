# Facebook Graph API Demo (OAuth 2.0)

## Project Overview

This project is a web application that demonstrates the use of the **Facebook Graph API** with **OAuth 2.0 authentication**. It allows users to log in using Facebook, fetch basic profile information, view their profile picture, and check the permissions granted to the application.

Data is requested using **JavaScript’s Fetch API** and displayed both visually and as raw JSON to make the API responses easier to understand and debug.

## Technologies Used

* HTML
* CSS
* JavaScript (Vanilla JS)
* Fetch API
* Facebook Graph API (v24.0)
* OAuth 2.0
* GitHub

## API Information

### Base URL

```
https://graph.facebook.com/v24.0
```

### Endpoints Used

| Endpoint          | Method | Description                    |
| ----------------- | ------ | ------------------------------ |
| `/me`             | GET    | Fetch user profile information |
| `/me/picture`     | GET    | Fetch profile picture          |
| `/me/permissions` | GET    | Fetch granted permissions      |

### Required Parameters

* `access_token` – OAuth access token
* `fields` – Requested user data (id, name, email)
* `type` – Profile picture size
* `redirect` – Set to `0` to return JSON

## Authentication

* OAuth 2.0
* Facebook Login (redirect-based, no SDK)
⚠️ Facebook login does not work using `file://`. A local or hosted server is required.

## Sample Fetch Request

```javascript
fetch("https://graph.facebook.com/v24.0/me?fields=id,name&access_token=YOUR_ACCESS_TOKEN")
  .then(response => response.json())
  .then(data => console.log(data));
```

## How to Run the Project

### Option 1: Live Server (Recommended)

1. Open the project folder in Visual Studio Code
2. Install the **Live Server** extension
3. Right-click `index.html` and select **Open with Live Server**

### Option 2: Python Local Server

```bash
python -m http.server 5500
```

Open in browser:

```
http://localhost:5500
```

## How to Use the Application

1. Click **Login** to authenticate using Facebook
2. Allow the requested permissions
3. Click **Fetch**
4. View:

   * Profile information
   * Profile picture
   * Granted permissions
   * Raw JSON response

## Important Notes

* Never commit real access tokens
* Always use placeholders such as:

```
YOUR_ACCESS_TOKEN_HERE
```

* OAuth authentication requires a local or hosted server

## GitHub Collaboration

This project follows standard GitHub collaboration practices:

* One shared repository
* Each member worked on their own branch
* Meaningful commits were made
* Pull Requests were used for merging
* Temporary branches were deleted after completion
