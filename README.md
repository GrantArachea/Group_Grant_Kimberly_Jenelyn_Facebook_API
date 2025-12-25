---

# Facebook Graph API Demo (OAuth 2.0)

## 📌 Project Overview

This project is a **Facebook Graph API demonstration web application** that uses **OAuth 2.0 authentication** and the **Fetch API** to retrieve user data.

The application allows users to:

* Log in using Facebook OAuth (redirect-based, no SDK)
* Fetch profile information
* Fetch profile picture
* View granted permissions
* Display raw JSON responses for debugging and demo purposes

This project is designed to satisfy **API usage, authentication, fetch implementation, and GitHub collaboration requirements**.

---

## 🛠️ Technologies Used

* HTML5
* CSS3
* JavaScript (Vanilla JS)
* Fetch API
* Facebook Graph API v24.0
* OAuth 2.0
* GitHub (Branches, Pull Requests, Collaboration)

---

## 🌐 API Information

### Base URL

```
https://graph.facebook.com/v24.0
```

---

### Endpoints Used

| Endpoint          | Method | Description                       |
| ----------------- | ------ | --------------------------------- |
| `/me`             | GET    | Fetch basic Facebook user profile |
| `/me/picture`     | GET    | Fetch profile picture             |
| `/me/permissions` | GET    | Fetch granted OAuth permissions   |

---

### Required Parameters

| Parameter      | Description                                         |
| -------------- | --------------------------------------------------- |
| `access_token` | OAuth access token                                  |
| `fields`       | Requested user fields (e.g. id, name, email)        |
| `type`         | Profile picture size (large, normal, small, square) |
| `redirect`     | Set to `0` to return JSON                           |

---

### Authentication

✔ OAuth 2.0
✔ Facebook Login (Redirect-based)
✔ Access Token

⚠️ **Note:** Facebook Login does **not work on `file://`**. A local server is required.

---

## 📄 Sample JSON Response

```json
{
  "id": "123456789",
  "name": "John Doe"
}
```

---

## 💻 Fetch API Implementation (JavaScript)

```javascript
fetch(`https://graph.facebook.com/v24.0/me?fields=id,name&access_token=YOUR_ACCESS_TOKEN`)
  .then(response => response.json())
  .then(data => console.log(data));
```

---

## ▶️ How to Run the Project

### ✅ Option 1: Run Using Live Server (Recommended)

OAuth redirect **will not work on file://**, so Live Server is required.

1. Install **Visual Studio Code**
2. Install the **Live Server** extension
3. Open the project folder in VS Code
4. Right-click `index.html`
5. Select **“Open with Live Server”**
6. Open browser at:

```
http://127.0.0.1:5500
```

---

### ✅ Option 2: Run Using Python Local Server

If Python is installed:

```bash
python -m http.server 5500
```

Then open:

```
http://localhost:5500
```

---

### ⚠️ Option 3: GitHub Pages (Optional)

1. Go to **Repository → Settings → Pages**
2. Set:

   * Branch: `main`
   * Folder: `/root`
3. Save and open the generated URL

⚠️ OAuth Login may be limited unless HTTPS redirect URIs are configured.

---

## 🔐 How to Use the Application

1. Click **Login** to authenticate using Facebook OAuth
2. OR paste a valid **Access Token** in the token input field
3. Click **Fetch**
4. View:

   * Profile information
   * Profile picture
   * Granted permissions
   * Raw JSON output
---

## ⚠️ Important Notes

* **Never commit real access tokens**
* Use placeholders like:

```
YOUR_ACCESS_TOKEN_HERE
```

* Facebook OAuth redirect **requires a local or hosted server**

---
