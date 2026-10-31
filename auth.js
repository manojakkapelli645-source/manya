/* =========================================================
   CIVICMAP MUMBAI — LOGIN HELPER (used on every page)
   - keeps the login in the browser
   - adds "Log in" / "Logout" to the header
   - gives login.html and admin.html a small API helper
   ========================================================= */

(function () {

  const STORE = "civicmap_auth";

  // Same backend rules as app.js
  function findApiBase() {

    if (window.CIVICMAP_API_BASE) {
      return String(window.CIVICMAP_API_BASE).replace(/\/$/, "");
    }

    const { protocol, hostname, port, origin } = window.location;

    if (protocol === "file:") return "http://127.0.0.1:8000";

    if (port === "8000") return origin;

    if (["localhost", "127.0.0.1", "0.0.0.0"].includes(hostname)) {
      return "http://127.0.0.1:8000";
    }

    return origin;
  }

  const apiBase = findApiBase();


  /* ---------- saved login ---------- */

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE));
      return saved && saved.token && saved.user ? saved : null;
    } catch (error) {
      return null;
    }
  }

  function save(token, user) {
    try {
      localStorage.setItem(STORE, JSON.stringify({ token, user }));
    } catch (error) { /* private mode: login lasts for this page only */ }
  }

  function clear() {
    try { localStorage.removeItem(STORE); } catch (error) {}
  }

  function getUser() { return load()?.user || null; }

  function getToken() { return load()?.token || ""; }

  function isAdmin() { return getUser()?.role === "admin"; }

  function authHeaders() {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }


  /* ---------- talk to the backend ---------- */

  async function request(path, options = {}) {

    const headers = { Accept: "application/json", ...authHeaders() };

    let body;

    if (options.body !== undefined) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(options.body);
    }

    let response;

    try {
      response = await fetch(`${apiBase}${path}`, {
        method: options.method || "GET",
        headers,
        body
      });
    } catch (error) {
      throw new Error(
        "Cannot reach the CivicMap server. Please start the backend (see README) and try again."
      );
    }

    let data = {};

    try { data = await response.json(); } catch (error) {}

    if (!response.ok) {

      // Login expired or not allowed
      if (response.status === 401 && getToken() && !path.startsWith("/api/auth/login")) {
        clear();
      }

      const error = new Error(
        typeof data.detail === "string"
          ? data.detail
          : `Something went wrong (${response.status}).`
      );

      error.status = response.status;
      throw error;
    }

    return data;
  }


  function logout(goTo = "index.html") {
    clear();
    window.location.href = goTo;
  }


  /* ---------- header: Log in / name / Logout ---------- */

  function escapeText(value) {
    const span = document.createElement("span");
    span.textContent = value;
    return span.innerHTML;
  }

  function buildHeader() {

    const actions = document.querySelector(".header-actions");

    if (!actions || actions.querySelector(".auth-box")) return;

    const user = getUser();
    const box = document.createElement("div");
    box.className = "auth-box";

    if (!user) {

      const next = window.location.pathname.split("/").pop() || "index.html";
      const target = next === "login.html"
        ? "login.html"
        : `login.html?next=${encodeURIComponent(next)}`;

      box.innerHTML = `<a class="auth-login" href="${target}">Log in</a>`;

    } else {

      const first = user.name.split(" ")[0];

      box.innerHTML = `
        <span class="auth-user" title="${escapeText(user.email)}">
          👤 ${escapeText(first)}${user.role === "admin" ? ' <b class="auth-badge">Admin</b>' : ""}
        </span>
        <button type="button" class="auth-logout">Log out</button>
      `;

      box.querySelector(".auth-logout").addEventListener("click", () => logout());

      // "Admin" link in the main menu for admins
      const nav = document.querySelector(".nav");

      if (user.role === "admin" && nav && !nav.querySelector('a[href="admin.html"]')) {
        const link = document.createElement("a");
        link.href = "admin.html";
        link.textContent = "Admin";
        if (window.location.pathname.endsWith("admin.html")) link.className = "active";
        nav.appendChild(link);
      }
    }

    actions.insertBefore(box, actions.firstChild);
  }


  window.CivicAuth = {
    apiBase,
    getUser,
    getToken,
    isAdmin,
    authHeaders,
    save,
    clear,
    logout,
    request
  };

  document.addEventListener("DOMContentLoaded", buildHeader);

})();
