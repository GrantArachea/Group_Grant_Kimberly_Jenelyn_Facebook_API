# 📘 Facebook Graph API Demo — OAuth 2.0

## 📌 Project Overview

This project is a frontend web application that demonstrates how to integrate the **Facebook Graph API** using **OAuth 2.0 authentication**.

Users authenticate using their own Facebook accounts. After successful login, the application fetches and displays:

- Basic profile information
- Profile picture
- Granted permissions (OAuth scopes)
- Raw JSON API responses for debugging and demonstration

The project follows OAuth 2.0 best practices, avoids committing sensitive tokens, and complies with the **Advanced API Group Project requirements**.

---

## 🎯 Project Objectives

- Demonstrate OAuth 2.0 authentication using Facebook Login
- Use real access tokens (no mock data)
- Fetch and display data using JavaScript Fetch API
- Implement error handling, loading states, and input validation
- Demonstrate API testing using Postman
- Follow proper GitHub collaboration workflow
- Use HTTPS for OAuth via Cloudflare Tunnel

---

## 🧰 Technologies Used

- HTML5  
- CSS3  
- JavaScript (Vanilla)  
- Fetch API  
- Facebook Graph API (v24.0)  
- OAuth 2.0  
- Cloudflare Tunnel (HTTPS for local development)  
- GitHub  

---

## 🌐 API Information

### Base URL
https://graph.facebook.com/v24.0


---

### Endpoints Used

| Endpoint | Method | Description |
|--------|--------|-------------|
| `/me` | GET | Retrieves basic user profile information |
| `/me/picture` | GET | Retrieves the user’s profile picture |
| `/me/permissions` | GET | Retrieves OAuth permissions granted to the app |

---

### Required Parameters

- `access_token` – OAuth 2.0 User Access Token  
- `fields` – Requested user fields (e.g. `id,name,email`)  
- `type` – Profile picture size (`large`, `normal`, `small`, `square`)  
- `redirect=0` – Returns JSON instead of redirecting to image  

---

## 🔐 Authentication

- OAuth 2.0 (Facebook Login)
- Redirect-based OAuth (no backend server)
- Tokens are generated securely by Facebook and used only in memory

⚠️ Facebook Login does NOT work using `file://`.  
A local or hosted HTTP/HTTPS server is required.

---

## 🔒 HTTPS & Cloudflare Tunnel (IMPORTANT)

Facebook requires **HTTPS** for OAuth.  
To securely expose the local project, **Cloudflare Tunnel (Quick Tunnel)** is used.

### Why Cloudflare?
- Free
- No account login required
- Instant HTTPS
- Accepted by Facebook OAuth

---

### Running Cloudflare Tunnel

Ensure your local server is running on port `5500`, then run:

```powershell
cloudflared tunnel --url http://127.0.0.1:5500

```

## 🔒 HTTPS via Cloudflare Tunnel

Cloudflare generates a **temporary HTTPS URL** for local development, such as:

```powershell
https://counting-where-patients-fares.trycloudflare.com/
```


⚠️ **This URL changes every time the tunnel restarts.**  
This is expected behavior and is acceptable for development and demo purposes.

---

## ⚙️ Meta (Facebook Developer) Setup

### 1️⃣ App Domains
**Location:**  
App Settings → Basic

```
example_domain_name_from_cloudflare.com
```

---

### 2️⃣ Website Platform
**Location:**  
App Settings → Basic → Add Platform → Website

```
example_domain_name_from_cloudflare.com
```

---

### 3️⃣ Valid OAuth Redirect URIs
**Location:**  
usecase customize → Settings

```
example_domain_name_from_cloudflare.com
```

⚠️ Must match **exactly**, including the trailing slash.

---

## 👥 App Roles (Testers, Developers, Admins)

Since the application runs in **Development Mode**, only assigned users can log in.

### Adding Testers
1. Go to:  
   `Roles → Test Users`
2. Add testers using their Facebook email address
3. Testers must **accept the invitation**

After accepting, testers can log in using their **own Facebook accounts**.

---

## 🔑 Who Logs In When Clicking “Login with Facebook”?

- Facebook authenticates the account currently logged into the browser
- The application does **not** force a specific account
- Use **Incognito / Private Window** to test different users

---

## 🧪 API Testing Using Postman (MANDATORY)

All endpoints were tested using **Postman** before frontend integration:

- Authentication using access token
- Valid API requests
- Error responses:
  - 401 Unauthorized
  - 403 Forbidden
  - 404 Not Found
  - 429 Too Many Requests

Postman testing is demonstrated in the demo video.

---

## 🧑‍💻 Sample Fetch Request

```javascript
fetch("https://graph.facebook.com/v24.0/me?fields=id,name&access_token=YOUR_ACCESS_TOKEN")
  .then(res => res.json())
  .then(data => console.log(data));
```




