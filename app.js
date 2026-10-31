const $ = (s, r = document) => r.querySelector(s);

const $$ = (s, r = document) => [...r.querySelectorAll(s)];


/* =========================================================
   CIVICMAP MUMBAI — CLEAN VERSION
   ========================================================= */

const KEY = {
  reports: "civicmap_reports_clean",
  posts: "civicmap_posts_clean",
  theme: "civicmap_theme_clean",
  demoReports: "civicmap_demo_reports_admin",
  removedDemoReports: "civicmap_removed_demo_reports_admin",
  hiddenMyComplaints: "civicmap_hidden_my_complaints"
};

// Backend URL: explicit config wins. Otherwise local development uses the
// FastAPI server on port 8000. When the frontend itself is served by FastAPI,
// use the same origin so the complaint request cannot accidentally target the
// wrong host/port.
const API_BASE = (() => {
  // Optional production/deployment override.
  if (window.CIVICMAP_API_BASE) {
    return String(window.CIVICMAP_API_BASE).replace(/\/$/, "");
  }

  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  const port = window.location.port;

  // Opening the HTML directly from disk.
  if (protocol === "file:") {
    return "http://127.0.0.1:8000";
  }

  // When FastAPI serves the frontend, use the exact same origin.
  if (port === "8000") {
    return window.location.origin;
  }

  // Local static servers such as VS Code Live Server.
  if (["localhost", "127.0.0.1", "0.0.0.0"].includes(hostname)) {
    return "http://127.0.0.1:8000";
  }

  // For a separately hosted frontend, define window.CIVICMAP_API_BASE
  // before app.js with the public FastAPI URL.
  return window.location.origin;
})();

let serverReports = [];


/* =========================================================
   REMOVE OLD DEMO / TEST DATA
   ========================================================= */

const CLEAN_RESET_VERSION = "2026-10-03-clean-2";

if (localStorage.getItem("civicmap_clean_reset") !== CLEAN_RESET_VERSION) {

  [
    "civicmap_reports",
    "civicmap_reports_v2",
    "civicmap_reports_v3",
    "civicmap_reports_v4",

    "civicmap_posts",
    "civicmap_posts_v2",
    "civicmap_posts_v3",
    "civicmap_posts_v4",

    "civicmap_projects",

    "civicmap_theme",
    "civicmap_theme_v2",
    "civicmap_theme_v3",

    "civicmap_clean_reset"
  ].forEach(key => localStorage.removeItem(key));

  localStorage.setItem(
    "civicmap_clean_reset",
    CLEAN_RESET_VERSION
  );

  /* =========================================================
     ALSO START CLEAN WITH OUR NEW STORAGE KEYS
     ========================================================= */

  localStorage.removeItem(KEY.reports);
  localStorage.removeItem(KEY.posts);
}


/* =========================================================
   NO DEMO DATA
   ========================================================= */

const DEMO_REPORT_IMAGES = {
  Pothole: "assets/damage_road.png",
  Garbage: "assets/garbage_on_road.jfif",
  Streetlight: "assets/Street-lights.webp",
  Water: "assets/waterissue.webp",
  Footpath: "assets/footpath.jpg",
  Drainage: "assets/waterdrain.jfif",
  Other: "assets/damage_road.png"
};

const DEMO_REPORTS = [
  {id:"MUM-DEMO-001", title:"Large pothole near station entrance", description:"A deep pothole is affecting two-wheelers and buses near the station approach road.", category:"Pothole", authority:"BMC", status:"Work Completed", loc:"Dadar West, Mumbai", lat:19.0178, lng:72.8478, created_at:"2026-09-08T09:20:00+05:30", photoCount:2, image:DEMO_REPORT_IMAGES.Pothole, ward:"G-North"},
  {id:"MUM-DEMO-002", title:"Overflowing garbage bins", description:"Community bins are overflowing and waste is spreading onto the footpath.", category:"Garbage", authority:"BMC", status:"In Progress", loc:"Andheri East, Mumbai", lat:19.1197, lng:72.8468, created_at:"2026-09-13T10:10:00+05:30", photoCount:3, image:DEMO_REPORT_IMAGES.Garbage, ward:"K-East"},
  {id:"MUM-DEMO-003", title:"Streetlight not working", description:"The streetlight has been off for several nights, making the road difficult to use after dark.", category:"Streetlight", authority:"BMC", status:"Complaint Submitted", loc:"Kurla West, Mumbai", lat:19.0726, lng:72.8826, created_at:"2026-09-18T18:30:00+05:30", photoCount:1, image:DEMO_REPORT_IMAGES.Streetlight, ward:"L-Ward"},
  {id:"MUM-DEMO-004", title:"Water shortage and supply issue", description:"Residents are facing water-supply shortages and are collecting water during limited supply periods.", category:"Water", authority:"BMC", status:"Work Completed", loc:"Sion, Mumbai", lat:19.0466, lng:72.8634, created_at:"2026-08-26T08:45:00+05:30", photoCount:1, image:"assets/waterissue.webp", ward:"F-North"},
  {id:"MUM-DEMO-005", title:"Broken footpath tiles", description:"Loose and broken tiles are forcing pedestrians onto the road.", category:"Footpath", authority:"BMC", status:"In Progress", loc:"Bandra East, Mumbai", lat:19.0596, lng:72.8656, created_at:"2026-09-03T12:15:00+05:30", photoCount:2, image:DEMO_REPORT_IMAGES.Footpath, ward:"H-East"},
  {id:"MUM-DEMO-006", title:"Blocked storm-water drain", description:"The drain is blocked with plastic and silt and needs cleaning before heavy rain.", category:"Drainage", authority:"BMC", status:"Failed", failureReason:"Work could not be completed because the access point was blocked by ongoing utility work. Re-inspection is required.", loc:"Matunga, Mumbai", lat:19.0269, lng:72.8553, created_at:"2026-08-31T15:40:00+05:30", photoCount:2, image:DEMO_REPORT_IMAGES.Drainage, ward:"F-North"},
  {id:"MUM-DEMO-007", title:"Road surface damaged after digging", description:"A road section has remained uneven after utility trench work.", category:"Pothole", authority:"BMC", status:"Work Completed", loc:"Powai, Mumbai", lat:19.1176, lng:72.9060, created_at:"2026-08-18T11:00:00+05:30", photoCount:1, image:DEMO_REPORT_IMAGES.Pothole, ward:"S-Ward"},
  {id:"MUM-DEMO-008", title:"Garbage collection missed", description:"The scheduled collection was missed for two consecutive days in the lane.", category:"Garbage", authority:"BMC", status:"Complaint Submitted", loc:"Goregaon West, Mumbai", lat:19.1663, lng:72.8526, created_at:"2026-09-24T07:30:00+05:30", photoCount:1, image:DEMO_REPORT_IMAGES.Garbage, ward:"P-South"},
  {id:"MUM-DEMO-009", title:"Dark pedestrian crossing", description:"Two lamps around the crossing are not functioning.", category:"Streetlight", authority:"BMC", status:"In Progress", loc:"Vile Parle East, Mumbai", lat:19.0990, lng:72.8445, created_at:"2026-09-20T20:00:00+05:30", photoCount:2, image:DEMO_REPORT_IMAGES.Streetlight, ward:"K-East"},
  {id:"MUM-DEMO-010", title:"Waterlogging at junction", description:"Rainwater collects at the junction and remains for hours after rainfall.", category:"Drainage", authority:"BMC", status:"Work Completed", loc:"Chembur, Mumbai", lat:19.0628, lng:72.8970, created_at:"2026-08-14T13:00:00+05:30", photoCount:3, image:DEMO_REPORT_IMAGES.Drainage, ward:"M-West"},
  {id:"MUM-DEMO-011", title:"Broken pavement beside school", description:"A damaged pavement section is creating a safety issue for school children.", category:"Footpath", authority:"BMC", status:"Failed", failureReason:"Site verification found that the reported section belongs to a private access strip. The complaint was closed with an explanation.", loc:"Borivali West, Mumbai", lat:19.2307, lng:72.8567, created_at:"2026-08-21T09:10:00+05:30", photoCount:2, image:DEMO_REPORT_IMAGES.Footpath, ward:"R-Central"},
  {id:"MUM-DEMO-012", title:"Overflowing drain near market", description:"The drain beside the market is partially blocked and needs cleaning.", category:"Drainage", authority:"BMC", status:"In Progress", loc:"Malad East, Mumbai", lat:19.1874, lng:72.8484, created_at:"2026-09-28T16:25:00+05:30", photoCount:2, image:"assets/overflow-drain.jpg", ward:"P-North"}
];

const COMMUNITY_BASE_POSTS = [
  {title:"Pothole repaired near Dadar station", category:"Pothole", location:"Dadar West", body:"The large pothole reported by residents has been filled and the road surface is usable again.", status:"Solved"},
  {title:"Garbage pickup still irregular in Andheri", category:"Garbage", location:"Andheri East", body:"Collection is happening, but some lanes are still being missed. Residents are requesting a more reliable schedule.", status:"Needs Work"},
  {title:"Streetlights being checked this week", category:"Streetlight", location:"Kurla West", body:"Residents have noticed inspection work around several dark stretches. Hoping the repairs are completed soon.", status:"Ongoing"},
  {title:"Water leakage finally stopped", category:"Water", location:"Sion", body:"The leak near the main road was repaired. Footpath cleanup is also underway.", status:"Solved"},
  {title:"Broken footpath needs attention", category:"Footpath", location:"Bandra East", body:"Parents and senior citizens are finding it difficult to use this stretch safely.", status:"Needs Work"},
  {title:"Drain cleaning before monsoon", category:"Drainage", location:"Chembur", body:"Local residents are discussing the drain cleaning schedule and sharing updates from the area.", status:"Ongoing"},
  {title:"Flooded lane needs better drainage", category:"Drainage", location:"Kurla East", body:"Water remains on the lane after heavy rain. Residents are requesting drain cleaning and a permanent solution.", status:"Needs Work"},
  {title:"Road resurfacing work started", category:"Road", location:"Borivali West", body:"Barricades and repair crews have arrived and resurfacing work has started.", status:"Ongoing"},
  {title:"Community water tanker schedule shared", category:"Water", location:"Ghatkopar East", body:"Residents have shared the updated tanker timing and requested a more predictable supply schedule.", status:"Ongoing"},
  {title:"Waste collection point cleaned", category:"Garbage", location:"Powai", body:"The overflowing waste collection point has been cleaned and regular pickup has resumed.", status:"Solved"}
];

const COMMUNITY_PEOPLE = [
  ["@aisha_khan", "Aisha Khan", "Resident / Community Member", "people"],
  ["@rohit_shah", "Rohit Shah", "Resident / Community Member", "people"],
  ["@neha_mumbai", "Neha Joshi", "Resident / Community Member", "people"],
  ["@sameer_patel", "Sameer Patel", "Resident / Community Member", "people"],
  ["@priya_nair", "Priya Nair", "Resident / Community Member", "people"]
];

const COMMUNITY_BMC_OFFICIALS = [
  ["@bmc_amit_patil", "Amit Patil", "Ward Maintenance Officer • BMC", "bmc"],
  ["@bmc_neha_shinde", "Neha Shinde", "Sanitation Inspector • BMC", "bmc"],
  ["@bmc_rohan_jadhav", "Rohan Jadhav", "Road Maintenance Engineer • BMC", "bmc"],
  ["@bmc_pooja_kadam", "Pooja Kadam", "Water Supply Officer • BMC", "bmc"],
  ["@bmc_vivek_more", "Vivek More", "Drainage Maintenance Officer • BMC", "bmc"]
];

const DEMO_POSTS = Array.from({length: 100}, (_, index) => {
  const base = COMMUNITY_BASE_POSTS[index % COMMUNITY_BASE_POSTS.length];
  const isOfficial = index % 5 === 0 || base.status === "Ongoing" && index % 3 === 0;
  const person = isOfficial
    ? COMMUNITY_BMC_OFFICIALS[index % COMMUNITY_BMC_OFFICIALS.length]
    : COMMUNITY_PEOPLE[index % COMMUNITY_PEOPLE.length];

  const suffix = Math.floor(index / COMMUNITY_BASE_POSTS.length) + 1;
  let body = base.body;

  if (isOfficial) {
    body = `${base.body} BMC update: the concerned civic team has inspected the location and ${base.status === "Solved" ? "the reported work has been completed." : "the required work is being coordinated and monitored."}`;
  } else if (suffix > 1) {
    body = `${base.body} Residents are continuing to follow up through the community.`;
  }

  return {
    id: `DEMO-P-${String(index + 1).padStart(3, "0")}`,
    title: suffix > 1 ? `${base.title} — Community Update ${suffix}` : base.title,
    category: base.category,
    location: base.location,
    body,
    status: base.status,
    username: person[0],
    author: person[1],
    position: person[2],
    authorType: person[3],
    created_at: new Date(Date.now() - (index + 1) * 3600000).toISOString(),
    replies: []
  };
});

const seedReports = [];
const seedPosts = [];

const civicProjects = [];

const PLATFORM_STATS = {
  total: 1000,
  resolved: 500,
  inProgress: 300,
  submitted: 100,
  failed: 100
};

/* =========================================================
   LIVE COMPLAINT WORKFLOW SIMULATION
   ========================================================= */
const LIVE_WORKFLOW = {
  verifyAfterMs: 60 * 1000,
  startAfterMs: 2 * 60 * 1000,
  completeAfterMs: 10 * 60 * 1000
};

let workflowTimer = null;


/* =========================================================
   MAP VARIABLES
   ========================================================= */

let map = null;
let markerLayer = null;

let selectedLocation = {
  lat: 19.076,
  lng: 72.8777,
  address: "Mumbai"
};

let selectedCat = "Pothole";


const icons = {
  Pothole: "🚧",
  Garbage: "🗑️",
  Streetlight: "💡",
  Water: "💧",
  Footpath: "🚶",
  Drainage: "🌊",
  Other: "📍"
};


/* =========================================================
   STORAGE HELPERS
   ========================================================= */

function get(key, fallback = []) {

  try {

    const value = JSON.parse(
      localStorage.getItem(key)
    );

    return value ?? fallback;

  } catch (error) {

    return fallback;

  }

}


function set(key, value) {

  localStorage.setItem(
    key,
    JSON.stringify(value)
  );

}


/* =========================================================
   HTML SAFETY
   ========================================================= */

function escapeHtml(value = "") {

  return String(value).replace(
    /[&<>"']/g,

    character => ({

      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"

    }[character])

  );

}


/* =========================================================
   TOAST
   ========================================================= */

function toast(message) {

  const element = $("#toast");

  if (!element) return;

  element.textContent = message;

  element.classList.add("show");

  clearTimeout(window.__civicToast);

  window.__civicToast = setTimeout(
    () => element.classList.remove("show"),
    3000
  );

}


/* =========================================================
   DARK MODE
   ========================================================= */

function theme() {

  const saved =
    localStorage.getItem(KEY.theme) || "light";

  const isDark = saved === "dark";

  document.documentElement.classList.toggle(
    "dark",
    isDark
  );

  document.body.classList.toggle(
    "dark",
    isDark
  );

  const button = $("#themeToggle");

  if (button) {

    button.innerHTML = saved === "dark" ? "☀ <span>Light</span>" : "☾ <span>Dark</span>";

    button.title =
      saved === "dark"
        ? "Switch to light mode"
        : "Switch to dark mode";

    button.setAttribute("aria-label", saved === "dark" ? "Switch to light mode" : "Switch to dark mode");
  }

}


function toggleTheme() {

  const current =
    document.documentElement.classList.contains("dark") ||
    document.body.classList.contains("dark");

  localStorage.setItem(
    KEY.theme,
    current ? "light" : "dark"
  );

  theme();

}
window.toggleTheme = toggleTheme;


/* =========================================================
   REPORT DATA
   ========================================================= */

function normalizeReport(report) {

  return {
    ...report,
    id: report.id,
    title: report.title || "Civic issue",
    description: report.description || "",
    cat: report.cat || report.category || "Other",
    category: report.category || report.cat || "Other",
    authority: report.authority || "BMC",
    status: report.status || "Reported",
    lat: Number(report.lat ?? report.latitude ?? 19.076),
    lng: Number(report.lng ?? report.longitude ?? 72.8777),
    loc: report.loc || report.location || report.address || "Mumbai",
    location: report.location || report.loc || report.address || "Mumbai",
    address: report.address || report.location || report.loc || "Mumbai",
    created_at: report.created_at || new Date().toISOString(),
    photoCount: Number(report.photoCount ?? report.photo_count ?? 0),
    image: report.image || report.clientImage || DEMO_REPORT_IMAGES[report.cat] || "assets/damage_road.png",
    clientImage: report.clientImage || "",
    workflowStartedAt: report.workflowStartedAt || null,
    workflowNoticeShown: Boolean(report.workflowNoticeShown),
    failureReason: report.failureReason || report.failure_reason || "",
    source: report.source || (String(report.id || "").startsWith("MUM-DEMO-") ? "demo" : "live")
  };
}

function getManagedDemoReports() {
  const custom = get(KEY.demoReports, []).map(normalizeReport);
  return [...DEMO_REPORTS, ...custom].map(normalizeReport);
}

function getHiddenMyComplaints() {
  return new Set(get(KEY.hiddenMyComplaints, []));
}

function myComplaintReports() {
  const hidden = getHiddenMyComplaints();
  const combined = new Map();

  [
    ...getManagedDemoReports(),
    ...currentUserReports()
  ]
    .map(normalizeReport)
    .forEach(report => {
      if (!hidden.has(report.id)) {
        combined.set(report.id, report);
      }
    });

  return [...combined.values()]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

function allReports() {
  const combined = new Map();
  [...getManagedDemoReports(), ...seedReports, ...serverReports, ...get(KEY.reports, [])]
    .map(normalizeReport)
    .forEach(report => combined.set(report.id, report));
  return [...combined.values()].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

function currentUserReports() {
  return get(KEY.reports, []).map(normalizeReport);
}

/* =========================================================
   DASHBOARD SAMPLE COMPLAINT MANAGEMENT
   ========================================================= */

function isDemoReport(report) {
  return String(report.id || "").startsWith("MUM-DEMO-") ||
    String(report.id || "").startsWith("MUM-SAMPLE-");
}

function removeMyComplaint(id) {
  const report = myComplaintReports().find(item => item.id === id);
  if (!report) {
    toast("Complaint not found.");
    return;
  }

  const confirmed = window.confirm(
    `Are you sure you want to remove "${report.title}" from My Complaints?`
  );

  if (!confirmed) return;

  const hidden = getHiddenMyComplaints();
  hidden.add(id);
  set(KEY.hiddenMyComplaints, [...hidden]);

  // Remove only the browser-local copy of a real user complaint.
  // The backend record remains available to Civic Complaints and Progress.
  set(
    KEY.reports,
    get(KEY.reports, []).filter(item => String(item.id) !== String(id))
  );

  renderMyReports();
  renderDashboard();
  toast(`Complaint removed from My Complaints: ${report.title}`);
}

function resetDemoReports() {
  set(KEY.hiddenMyComplaints, []);
  set(KEY.removedDemoReports, []);
  set(KEY.demoReports, []);
  renderMyReports();
  renderDashboard();
  renderMapMarkers("all");
  toast("My Complaints samples have been restored.");
}

async function addDashboardSampleComplaint(event) {
  event?.preventDefault();

  const title = $("#sampleTitle")?.value.trim() || "";
  const description = $("#sampleDescription")?.value.trim() || "";
  const category = $("#sampleCategory")?.value || "Other";
  const address = $("#sampleAddress")?.value.trim() || "Mumbai";
  const status = $("#sampleStatus")?.value || "Complaint Submitted";
  const authority = $("#sampleAuthority")?.value.trim() || "BMC";
  const imageInput = $("#sampleImage");
  const imageFile = imageInput?.files?.[0] || null;

  if (!title || !description || !address) {
    toast("Please enter the title, description and address.");
    return;
  }

  let image = DEMO_REPORT_IMAGES[category] || DEMO_REPORT_IMAGES.Other;

  if (imageFile) {
    if (!imageFile.type.startsWith("image/")) {
      toast("Please select a valid image file.");
      return;
    }

    if (imageFile.size > 5 * 1024 * 1024) {
      toast("Please choose an image smaller than 5 MB.");
      return;
    }

    try {
      image = await fileToDataUrl(imageFile);
    } catch (error) {
      console.error("Could not read uploaded image:", error);
      toast("Could not read the selected image.");
      return;
    }
  }

  const id = `MUM-SAMPLE-${Date.now().toString().slice(-7)}`;
  const sample = normalizeReport({
    id,
    title,
    description,
    category,
    authority,
    status,
    loc: address,
    location: address,
    address,
    lat: 19.076,
    lng: 72.8777,
    created_at: new Date().toISOString(),
    photoCount: image ? 1 : 0,
    image,
    clientImage: imageFile ? image : "",
    ward: "Demo",
    source: "demo"
  });

  const custom = get(KEY.demoReports, []);
  custom.unshift(sample);
  set(KEY.demoReports, custom);

  const hidden = getHiddenMyComplaints();
  hidden.delete(id);
  set(KEY.hiddenMyComplaints, [...hidden]);

  event?.target?.reset?.();

  const preview = $("#sampleImagePreview");
  if (preview) {
    preview.src = "";
    preview.hidden = true;
  }

  renderMyReports();
  renderDashboard();
  renderMapMarkers("all");
  toast("Complaint added to My Complaints with the uploaded image.");
}


function initDashboardSampleManager() {
  const form = $("#sampleComplaintForm");
  const resetButton = $("#resetDemoReports");
  const imageInput = $("#sampleImage");
  const imagePreview = $("#sampleImagePreview");

  if (form) form.addEventListener("submit", addDashboardSampleComplaint);
  if (resetButton) resetButton.addEventListener("click", resetDemoReports);

  if (imageInput && imagePreview) {
    imageInput.addEventListener("change", () => {
      const file = imageInput.files?.[0];

      if (!file) {
        imagePreview.src = "";
        imagePreview.hidden = true;
        return;
      }

      if (!file.type.startsWith("image/")) {
        imageInput.value = "";
        imagePreview.src = "";
        imagePreview.hidden = true;
        toast("Please select a valid image file.");
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        imageInput.value = "";
        imagePreview.src = "";
        imagePreview.hidden = true;
        toast("Please choose an image smaller than 5 MB.");
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        imagePreview.src = String(reader.result || "");
        imagePreview.hidden = false;
      };
      reader.readAsDataURL(file);
    });
  }

  document.addEventListener("click", event => {
    const removeButton = event.target.closest("[data-remove-my]");
    if (removeButton) {
      removeMyComplaint(removeButton.dataset.removeMy);
    }
  });
}


async function checkBackendConnection() {
  if (!API_BASE) return false;

  try {
    const response = await fetch(`${API_BASE}/api/health`, {
      method: "GET",
      headers: { Accept: "application/json" }
    });
    return response.ok;
  } catch (error) {
    console.warn("CivicMap backend is unreachable:", API_BASE, error);
    return false;
  }
}

async function loadBackendReports() {

  if (!API_BASE) return;

  try {
    const response = await fetch(`${API_BASE}/api/reports`, {
      method: "GET",
      headers: { Accept: "application/json" }
    });

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }

    const data = await response.json();
    serverReports = Array.isArray(data.reports)
      ? data.reports.map(normalizeReport)
      : [];

    // If an admin changed a complaint's status, that decision wins over the
    // browser-side demo workflow for this browser's own copy of the complaint.
    const adminDecisions = new Map(
      serverReports
        .filter(item => Number(item.admin_updated) === 1)
        .map(item => [item.id, item])
    );

    if (adminDecisions.size) {
      let syncedAny = false;

      const synced = get(KEY.reports, []).map(local => {
        const decision = adminDecisions.get(local.id);

        if (!decision) return local;

        if (
          local.status === decision.status &&
          (local.failureReason || "") === (decision.failureReason || "") &&
          !local.workflowStartedAt
        ) {
          return local;
        }

        syncedAny = true;

        return {
          ...local,
          status: decision.status,
          failureReason: decision.failureReason || "",
          workflowStartedAt: null
        };
      });

      if (syncedAny) set(KEY.reports, synced);
    }

    renderMapMarkers(selectedCat || "all");
    renderMyReports();
    renderDashboard();
  } catch (error) {
    console.warn("Could not load CivicMap backend reports:", error);
  }
}


/* =========================================================
   MAP
   ========================================================= */

function initMap() {

  const mapElement = $("#map");

  if (!mapElement || typeof L === "undefined") {
    return;
  }

  map = L.map(mapElement, {
    zoomControl: true
  }).setView(
    [19.076, 72.8777],
    11
  );


  L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      maxZoom: 19,
      attribution: "© OpenStreetMap contributors"
    }
  ).addTo(map);


  markerLayer =
    L.layerGroup().addTo(map);


  renderMapMarkers("all");


  map.on("click", async event => {

    selectedLocation = {

      lat: event.latlng.lat,
      lng: event.latlng.lng,

      address:
        `Selected location (${event.latlng.lat.toFixed(5)}, ${event.latlng.lng.toFixed(5)})`

    };


    setLocationText();


    if (
      window.location.pathname.endsWith(
        "map-report.html"
      )
    ) {

      window.location.hash =
        "report-form";

    }


    try {

      const response = await fetch(

        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${event.latlng.lat}&lon=${event.latlng.lng}&zoom=18&addressdetails=1`,

        {
          headers: {
            Accept: "application/json"
          }
        }

      );


      const data =
        await response.json();


      if (data.display_name) {

        selectedLocation.address =
          data.display_name;

        setLocationText();

      }


    } catch (error) {

      console.log(
        "Reverse geocoding unavailable."
      );

    }


    toast(
      "Location selected. Continue with the report form."
    );

  });


  setTimeout(
    () => map.invalidateSize(true),
    250
  );


  window.addEventListener(
    "resize",
    () => map?.invalidateSize(true)
  );

}


/* =========================================================
   MAP MARKER ICON
   ========================================================= */

function markerIcon(category) {

  return L.divIcon({

    className: "civic-pin",

    html: `
      <div style="
        width:34px;
        height:34px;
        border-radius:50%;
        display:grid;
        place-items:center;
        background:#0c1712;
        color:#c8ef7d;
        border:3px solid white;
        box-shadow:0 4px 12px #0004;
        font-size:17px;
      ">
        ${icons[category] || "📍"}
      </div>
    `,

    iconSize: [34, 34],
    iconAnchor: [17, 17]

  });

}


/* =========================================================
   MAP MARKERS
   ========================================================= */

function renderMapMarkers(filter = "all") {

  if (!map || !markerLayer) {
    return;
  }


  markerLayer.clearLayers();


  allReports()

    .filter(report =>
      filter === "all" ||
      report.cat === filter
    )

    .forEach(report => {

      const marker =
        L.marker(
          [report.lat, report.lng],
          {
            icon:
              markerIcon(report.cat)
          }
        )
        .addTo(markerLayer);


      marker.bindPopup(`

        <b>
          ${icons[report.cat] || "📍"}
          ${escapeHtml(report.title)}
        </b>

        <br>

        <small>
          ${escapeHtml(report.loc || "")}
        </small>

        <br>

        <span>
          ${escapeHtml(
            report.status || "Reported"
          )}
        </span>

        <br>

        <button
          style="margin-top:8px"
          onclick="focusReport('${escapeHtml(report.id)}')"
        >
          View report
        </button>

      `);

    });


  renderIssueList(filter);

}


/* =========================================================
   ISSUE LIST
   ========================================================= */

function renderIssueList(filter = "all") {

  const box = $("#issueList");

  if (!box) return;


  const rows = allReports()

    .filter(report =>
      filter === "all" ||
      report.cat === filter
    )

    .slice(0, 12);


  if (!rows.length) {

    box.innerHTML = `

      <div class="empty-state">

        <div style="font-size:42px">
          📍
        </div>

        <h3>
          No reports yet
        </h3>

        <p>
          CivicMap is ready for the first civic issue.
          Click the map and submit a report to get started.
        </p>

      </div>

    `;

    return;

  }


  box.innerHTML = rows.map(report => `

    <article
      class="issue"
      onclick="focusReport('${escapeHtml(report.id)}')"
    >

      <span class="badge">
        ${icons[report.cat] || "📍"}
        ${escapeHtml(report.cat)}
      </span>

      <h3>
        ${escapeHtml(report.title)}
      </h3>

      <p>
        📍 ${escapeHtml(report.loc || "Mumbai")}
      </p>

      <small>
        ${escapeHtml(report.status || "Reported")}
      </small>

    </article>

  `).join("");

}


/* =========================================================
   FOCUS REPORT
   ========================================================= */

function focusReport(id) {

  const report =
    allReports().find(
      item => item.id === id
    );

  if (!report) return;


  if (map) {

    map.setView(
      [report.lat, report.lng],
      16
    );

  }


  toast(
    `${report.title} — ${report.status || "Reported"}`
  );

}


/* =========================================================
   LOCATION TEXT
   ========================================================= */

function setLocationText() {

  const elements = [
    $("#selectedLocation"),
    $("#locationText"),
    $("#selectedLocationText")
  ].filter(Boolean);

  elements.forEach(element => {
    element.textContent = selectedLocation.address;
  });

  // Keep the values sent to FastAPI synchronized with the map selection.
  const latInput = $("#lat");
  const lngInput = $("#lng");
  const locationInput = $("#location");

  if (latInput) latInput.value = String(selectedLocation.lat);
  if (lngInput) lngInput.value = String(selectedLocation.lng);
  if (locationInput) locationInput.value = selectedLocation.address;
}


/* =========================================================
   CATEGORY
   ========================================================= */

function selectCategory(category, button) {

  selectedCat = category;


  $$(".category-btn").forEach(
    element =>
      element.classList.remove("active")
  );


  if (button) {
    button.classList.add("active");
  }


  renderMapMarkers(category);

}


/* =========================================================
   REPORT FORM
   ========================================================= */

function initReportForm() {
  // The current UI uses a button instead of a native <form> submit.
  const button = $("#submitComplaintBtn");
  if (button) {
    button.addEventListener("click", submitComplaint);
  }

  // The HTML category controls use .cat[data-cat].
  $$(".cat[data-cat]").forEach(categoryButton => {
    categoryButton.addEventListener("click", () => {
      $$(".cat[data-cat]").forEach(item => item.classList.remove("selected"));
      categoryButton.classList.add("selected");
      selectedCat = categoryButton.dataset.cat || "Other";

      const routeIssue = $("#routeIssue");
      if (routeIssue) routeIssue.textContent = selectedCat;
      renderMapMarkers("all");
    });
  });
}

async function submitComplaint() {
  const button = $("#submitComplaintBtn");
  if (button?.disabled) return;

  const title = $("#issueTitle")?.value.trim() || "";
  const description = $("#description")?.value.trim() || "";
  const selectedCategoryButton = $(".cat.selected") || $(".cat[data-cat].selected");
  const category =
    selectedCategoryButton?.dataset.cat ||
    selectedCat ||
    "Other";
  const authority = $("#authoritySelect")?.value || "BMC";
  const location = $("#location")?.value.trim() || selectedLocation.address || "Mumbai";
  const lat = Number($("#lat")?.value || selectedLocation.lat || 19.076);
  const lng = Number($("#lng")?.value || selectedLocation.lng || 72.8777);
  const photoInput = $("#photoInput");

  if (!title || !description) {
    toast("Please enter the issue title and description.");
    return;
  }

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    toast("Please select a valid location on the map.");
    return;
  }

  if (!API_BASE) {
    toast("Complaint service is not configured for this website.");
    return;
  }

  const formData = new FormData();
  formData.append("title", title);
  formData.append("description", description);
  formData.append("category", category);
  formData.append("authority", authority);
  formData.append("latitude", String(lat));
  formData.append("longitude", String(lng));
  formData.append("location", location);

  if (photoInput?.files?.length) {
    [...photoInput.files].slice(0, 5).forEach(file => {
      formData.append("photos", file, file.name);
    });
  }

  if (button) {
    button.disabled = true;
    button.dataset.originalText = button.textContent.trim();
    button.textContent = "Submitting complaint…";
  }

  try {
    const response = await fetch(`${API_BASE}/api/reports`, {
      method: "POST",
      // If the citizen is logged in, the complaint is linked to their account.
      headers: window.CivicAuth ? window.CivicAuth.authHeaders() : {},
      body: formData
    });

    let data = {};
    try {
      data = await response.json();
    } catch (_) {}

    if (!response.ok || !data.success) {
      throw new Error(data.detail || `Submission failed (${response.status})`);
    }

    let report = normalizeReport(data);

    // New complaints start a local demo workflow. The backend remains the
    // source of the actual submission, while the browser simulates the
    // verification/work-status changes for the project demonstration.
    report = {
      ...report,
      status: "Complaint Submitted",
      workflowStartedAt: new Date().toISOString(),
      source: "live"
    };

    // Keep the first uploaded photo with the browser-local report so it
    // appears on the Dashboard after submission.
    if (photoInput?.files?.length) {
      try {
        report.clientImage = await fileToDataUrl(photoInput.files[0]);
        report.image = report.clientImage;
      } catch (imageError) {
        console.warn("Could not save the local complaint photo preview:", imageError);
      }
    }

    const reports = get(KEY.reports, []);
    const withoutDuplicate = reports.filter(item => item.id !== report.id);
    withoutDuplicate.push(report);
    set(KEY.reports, withoutDuplicate);

    serverReports = [report, ...serverReports.filter(item => item.id !== report.id)];

    const form = $("#reportForm");
    if (form) form.reset();

    selectedLocation = {
      lat: 19.076,
      lng: 72.8777,
      address: "Mumbai"
    };

    setLocationText();
    renderMapMarkers("all");
    renderMyReports();
    renderDashboard();

    const modal = $("#modal");
    const modalId = $("#modalId");
    if (modal && modalId) {
      modalId.textContent = report.id;
      modal.classList.add("show");
      modal.setAttribute("aria-hidden", "false");
    }

    toast(`Complaint submitted successfully. ID: ${report.id}`);

  } catch (error) {
    console.error("Complaint submission failed:", error);

    if (error instanceof TypeError && /fetch/i.test(error.message || "")) {
      toast("Cannot reach the CivicMap server. Start the FastAPI backend on http://127.0.0.1:8000 and try again.");
    } else {
      toast(error.message || "Unable to submit complaint. Please try again.");
    }
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = button.dataset.originalText || "Submit civic complaint →";
    }
  }
}

window.submitComplaint = submitComplaint;

/* =========================================================
   SUCCESS MODAL
   ========================================================= */

function closeModal() {
  const modal = $("#modal");
  if (!modal) return;

  modal.classList.remove("show");
  modal.setAttribute("aria-hidden", "true");
}

window.closeModal = closeModal;

function openDashboard() {
  window.location.href = "dashboard.html";
}

window.openDashboard = openDashboard;


/* =========================================================
   LIVE COMPLAINT WORKFLOW
   ========================================================= */

function saveUserReports(reports) {
  set(KEY.reports, reports);
}

function addBmcWorkflowUpdate(report, statusText) {
  if (!report?.id) return;

  const posts = get(KEY.posts, []);
  const postId = `BMC-UPDATE-${report.id}`;
  if (posts.some(post => post.id === postId)) return;

  posts.push({
    id: postId,
    title: `BMC update: ${report.title}`,
    category: "BMC Official",
    status: "Ongoing",
    username: "@bmc_civic_response",
    author: "BMC Civic Response Team",
    position: "Civic Response Officer • BMC",
    authorType: "bmc",
    location: report.loc || report.location || "Mumbai",
    body: `Update for complaint ${report.id}: ${statusText}. The concerned civic team has started action on this issue and the work is currently being monitored.`,
    created_at: new Date().toISOString(),
    replies: []
  });

  set(KEY.posts, posts);
}

function advanceLiveComplaintWorkflow() {
  const reports = get(KEY.reports, []);
  if (!reports.length) return false;

  const now = Date.now();
  let changed = false;

  const updated = reports.map(raw => {
    const report = normalizeReport(raw);
    if (report.source === "demo" || !report.workflowStartedAt) return raw;

    const started = new Date(report.workflowStartedAt).getTime();
    if (!Number.isFinite(started)) return raw;

    const elapsed = now - started;
    let nextStatus = report.status || "Complaint Submitted";

    if (elapsed >= LIVE_WORKFLOW.completeAfterMs) {
      nextStatus = "Work Completed";
    } else if (elapsed >= LIVE_WORKFLOW.startAfterMs) {
      nextStatus = "Work In Progress";
    } else if (elapsed >= LIVE_WORKFLOW.verifyAfterMs) {
      nextStatus = "Verified";
    } else {
      nextStatus = "Complaint Submitted";
    }

    if (nextStatus !== report.status) {
      changed = true;
      const next = { ...raw, status: nextStatus };
      if (nextStatus === "Work In Progress") {
        addBmcWorkflowUpdate(report, "work is in progress");
        next.workflowNoticeShown = true;
      }
      return next;
    }

    return raw;
  });

  if (changed) {
    saveUserReports(updated);
    renderMyReports();
    renderDashboard();
    renderCommunity();
    renderMapMarkers("all");
  }

  return changed;
}

function startLiveWorkflowTimer() {
  advanceLiveComplaintWorkflow();
  if (workflowTimer) clearInterval(workflowTimer);
  workflowTimer = setInterval(advanceLiveComplaintWorkflow, 5000);
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve("");
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* =========================================================
   MY REPORTS
   ========================================================= */

function statusKey(status = "") {
  const value = String(status).toLowerCase();
  if (value.includes("fail")) return "failed";
  if (value.includes("complete") || value.includes("resolved")) return "completed";
  if (value.includes("progress") || value.includes("started") || value.includes("ongoing")) return "in_progress";
  if (value.includes("verif")) return "verified";
  return "submitted";
}

function statusLabel(status = "") {
  const key = statusKey(status);
  if (key === "completed") return "Work Completed";
  if (key === "in_progress") return "Work In Progress";
  if (key === "verified") return "Verified";
  if (key === "failed") return "Failed";
  return "Complaint Submitted";
}

function renderProgress(report) {
  const key = statusKey(report.status);
  if (key === "failed") {
    return `<div class="civic-progress failed-progress">
      <div class="progress-step done"><span>✓</span><b>Complaint Submitted</b></div>
      <div class="progress-line"></div>
      <div class="progress-step failed"><span>!</span><b>Failed</b></div>
    </div>
    <div class="failure-note"><strong>Why it failed:</strong> ${escapeHtml(report.failureReason || "The issue could not be completed at this time. A new inspection may be required.")}</div>`;
  }

  const verified = key === "verified" || key === "in_progress" || key === "completed";
  const started = key === "in_progress" || key === "completed";
  const completed = key === "completed";
  const steps = [
    {label:"Complaint Submitted", done:true},
    {label:"Verified", done:verified},
    {label:"Work Started", done:started},
    {label:"Work Completed", done:completed}
  ];

  return `<div class="civic-progress civic-progress-four">${steps.map((step, i) => `${i ? '<div class="progress-line"></div>' : ''}<div class="progress-step ${step.done ? 'done' : ''} ${step.label === 'Verified' && verified ? 'verified-step' : ''}"><span>${step.done ? '✓' : (i + 1)}</span><b>${step.label}</b></div>`).join('')}</div>`;
}

function reportCardHtml(report, detailed = false) {
  const normalizedStatus = statusLabel(report.status);
  return `<article class="report-card ${detailed ? 'detailed-report-card' : ''}">
    ${detailed ? `<div class="report-image-wrap"><img src="${escapeHtml(report.image || DEMO_REPORT_IMAGES[report.cat])}" alt="${escapeHtml(report.cat)} issue photo" loading="lazy"><span class="photo-count">📷 ${Number(report.photoCount || 0) || 1}</span></div>` : ''}
    <div class="report-card-body">
      <div class="report-card-top">
        <span class="badge">${icons[report.cat] || "📍"} ${escapeHtml(report.cat)}</span>
        <span class="status status-${statusKey(report.status)}">${escapeHtml(normalizedStatus)}</span>
      </div>
      <h3>${escapeHtml(report.title)}</h3>
      <p>${escapeHtml(report.description)}</p>
      <p class="muted">📍 ${escapeHtml(report.loc || "Mumbai")}</p>
      ${detailed ? `<div class="report-meta"><span>🆔 ${escapeHtml(report.id)}</span><span>🏛️ ${escapeHtml(report.authority || "BMC")}</span></div>${report.address || report.loc ? `<p class="sample-address"><b>Address:</b> ${escapeHtml(report.address || report.loc || "Mumbai")}</p>` : ""}${renderProgress(report)}` : `<small>Report ID: ${escapeHtml(report.id)}</small>`}
    </div>
  </article>`;
}

function myComplaintCardHtml(report) {
  const image = report.image || report.clientImage || DEMO_REPORT_IMAGES[report.cat] || "assets/damage_road.png";
  const status = statusLabel(report.status);

  return `
    <article class="report-card my-complaint-card">
      <div class="my-complaint-image-wrap">
        <img
          src="${escapeHtml(image)}"
          alt="${escapeHtml(report.title)} issue photo"
          loading="lazy"
          onerror="this.onerror=null;this.src='assets/damage_road.png';"
        >
      </div>

      <div class="report-card-body">
        <div class="report-card-top">
          <span class="badge">${icons[report.cat] || "📍"} ${escapeHtml(report.cat)}</span>
          <span class="status status-${statusKey(report.status)}">${escapeHtml(status)}</span>
        </div>

        <h3>${escapeHtml(report.title)}</h3>

        <p class="my-complaint-description">
          ${escapeHtml(report.description)}
        </p>

        <p class="muted my-complaint-location">
          📍 ${escapeHtml(report.address || report.loc || "Mumbai")}
        </p>

        <div class="my-complaint-meta">
          <span>🆔 <b>Report ID:</b> ${escapeHtml(report.id)}</span>
        </div>

        <div class="my-complaint-actions">
          <button
            type="button"
            class="my-complaint-remove"
            data-remove-my="${escapeHtml(report.id)}"
          >
            Remove Complaint
          </button>
        </div>
      </div>
    </article>
  `;
}

function renderMyReports() {
  const box = $("#myReports") || $("#dashboardMyReports");
  if (!box) return;

  const reports = myComplaintReports();

  if (!reports.length) {
    box.innerHTML = `
      <div class="empty-state">
        <div style="font-size:44px">📋</div>
        <h3>No complaints in My Complaints</h3>
        <p>Your complaints will appear here with their uploaded images, location, Report ID and current status.</p>
      </div>
    `;
    return;
  }

  box.innerHTML = reports.map(report => myComplaintCardHtml(report)).join("");
}
function renderAllComplaintCards() {
  const box = $("#allComplaintCards");
  if (!box) return;
  const reports = allReports();
  box.innerHTML = reports.map(report => reportCardHtml(report, true)).join("");
}

/* =========================================================
   DASHBOARD
   ========================================================= */

function renderDashboard() {
  const reports = allReports();
  // Real counts: only complaints actually submitted (demo/sample cases are NOT counted)
  const live = reports.filter(r => !isDemoReport(r));
  const stats = {
    total: live.length,
    resolved: live.filter(r => r.status === "Work Completed").length,
    inProgress: live.filter(r => r.status === "In Progress" || r.status === "Work In Progress").length,
    submitted: live.filter(r => r.status === "Complaint Submitted" || r.status === "Verified" || r.status === "Reported").length,
    failed: live.filter(r => r.status === "Failed").length
  };
  const setText = (sel, value) => { const el = $(sel); if (el) el.textContent = value; };
  setText("#dashTotal", stats.total.toLocaleString());
  setText("#dashResolved", stats.resolved.toLocaleString());
  setText("#dashOpen", stats.inProgress.toLocaleString());
  setText("#dashMine", currentUserReports().length);
  setText("#dashSubmitted", stats.submitted.toLocaleString());
  setText("#dashFailed", stats.failed.toLocaleString());
  const pct = stats.total ? Math.round((stats.resolved / stats.total) * 100) : 0;
  setText("#resolutionPercentage", `${pct}%`);
  const resolutionText = document.querySelector("#resolutionPercentage + p");
  if (resolutionText) resolutionText.textContent = `${stats.resolved.toLocaleString()} resolved · ${stats.inProgress.toLocaleString()} in progress · ${stats.failed.toLocaleString()} failed`;
  renderMyReports();
  renderAllComplaintCards();
  const sampleCount = $("#sampleCaseCount");
  if (sampleCount) {
    const count = allReports().filter(isDemoReport).length;
    sampleCount.textContent = `${count} sample case${count === 1 ? "" : "s"}`;
  }
  renderCategoryStats(reports);
  renderWardSnapshot(reports);
  renderInbox(reports);
  renderProjects();
}

/* =========================================================
   CATEGORY STATISTICS
   ========================================================= */

function renderCategoryStats(reports) {

  const box =
    $("#categoryAnalytics") ||
    $("#categoryStats");

  if (!box) return;


  if (!reports.length) {

    box.innerHTML = `

      <div class="empty-state">

        <p>
          No report statistics available yet.
        </p>

      </div>

    `;

    return;

  }


  const counts = {};


  reports.forEach(report => {

    const category =
      report.cat || "Other";

    counts[category] =
      (counts[category] || 0) + 1;

  });


  box.innerHTML =
    Object.entries(counts)
      .map(([category, count]) => `

        <div class="stat-row">

          <span>
            ${icons[category] || "📍"}
            ${escapeHtml(category)}
          </span>

          <strong>
            ${count}
          </strong>

        </div>

      `)
      .join("");

}


/* =========================================================
   WARD SNAPSHOT
   ========================================================= */

function renderWardSnapshot(reports) {

  const table =
    $("#wardSnapshot") ||
    $("#wardTable");

  if (!table) return;


  if (!reports.length) {

    table.innerHTML = `

      <div class="empty-state">

        <p>
          No ward data available yet.
        </p>

      </div>

    `;

    return;

  }


  const wards = {};


  reports.forEach(report => {

    const ward =
      report.ward ||
      "Not specified";


    if (!wards[ward]) {

      wards[ward] = {
        reports: 0,
        resolved: 0,
        open: 0
      };

    }


    wards[ward].reports++;


    if (
      String(report.status)
        .toLowerCase() === "resolved"
    ) {

      wards[ward].resolved++;

    } else {

      wards[ward].open++;

    }

  });


  table.innerHTML = `

    <div class="tr th">

      <span>Ward</span>
      <span>Reports</span>
      <span>Resolved</span>
      <span>Open</span>

    </div>

    ${
      Object.entries(wards)
        .map(
          ([ward, data]) => `

            <div class="tr">

              <span>
                ${escapeHtml(ward)}
              </span>

              <span>
                ${data.reports}
              </span>

              <span>
                ${data.resolved}
              </span>

              <span>
                ${data.open}
              </span>

            </div>

          `
        )
        .join("")
    }

  `;

}


/* =========================================================
   AUTHORITY INBOX
   ========================================================= */

function renderInbox(reports) {

  const box =
    $("#inbox");

  if (!box) return;


  if (!reports.length) {

    box.innerHTML = `

      <div class="empty-state">

        <div style="font-size:40px">
          📬
        </div>

        <h3>
          Authority inbox is empty
        </h3>

        <p>
          Submitted reports will appear here.
        </p>

      </div>

    `;

    return;

  }


  box.innerHTML =
    reports
      .slice(0, 20)
      .map(report => `

        <div class="inbox-row">

          <div>

            <strong>
              ${escapeHtml(report.title)}
            </strong>

            <p class="muted">
              ${escapeHtml(
                report.authority ||
                "Authority not specified"
              )}
            </p>

          </div>

          <span class="status">

            ${escapeHtml(
              report.status ||
              "Reported"
            )}

          </span>

        </div>

      `)
      .join("");

}


/* =========================================================
   PROJECT OUTCOMES
   ========================================================= */

function filterProjects(filter = "all", button) {

  $$(".project-filter").forEach(
    element =>
      element.classList.remove("active")
  );


  if (button) {

    button.classList.add("active");

  }


  renderProjects(filter);

}


function renderProjects(filter = "all") {

  const grid =
    $("#projectsGrid");

  if (!grid) return;


  const projects =
    civicProjects.filter(project => {

      if (filter === "all") {
        return true;
      }

      return String(project.status)
        .toLowerCase() === filter;

    });


  const allCount =
    $("#projectCount-all");


  const completedCount =
    $("#projectCount-completed");


  const pendingCount =
    $("#projectCount-pending");


  const failedCount =
    $("#projectCount-failed");


  if (allCount) {

    allCount.textContent =
      civicProjects.length;

  }


  if (completedCount) {

    completedCount.textContent =
      civicProjects.filter(
        project =>
          String(project.status)
            .toLowerCase() === "completed"
      ).length;

  }


  if (pendingCount) {

    pendingCount.textContent =
      civicProjects.filter(
        project =>
          String(project.status)
            .toLowerCase() === "pending"
      ).length;

  }


  if (failedCount) {

    failedCount.textContent =
      civicProjects.filter(
        project =>
          String(project.status)
            .toLowerCase()
            .includes("failed")
      ).length;

  }


  if (!projects.length) {

    grid.innerHTML = `

      <div class="empty-state">

        <div style="font-size:44px">
          🏗️
        </div>

        <h3>
          No project outcomes yet
        </h3>

        <p>
          Civic project outcomes will appear here when real project records are added.
        </p>

      </div>

    `;

    return;

  }


  grid.innerHTML =
    projects
      .map(project => `

        <article class="project-card">

          <h3>
            ${escapeHtml(project.title)}
          </h3>

          <p>
            ${escapeHtml(
              project.description || ""
            )}
          </p>

          <span class="status">
            ${escapeHtml(project.status)}
          </span>

        </article>

      `)
      .join("");

}


/* =========================================================
   COMMUNITY
   ========================================================= */

function renderCommunity() {
  const feed = $("#communityFeed");
  const count = $("#communityCount");
  if (!feed) return;

  const posts = [...DEMO_POSTS, ...get(KEY.posts, [])]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  if (count) count.textContent = posts.length;

  if (!posts.length) {
    feed.innerHTML = `<div class="empty-state"><div style="font-size:44px">💬</div><h3>No discussions yet</h3><p>Start the first community discussion about a civic issue in your neighbourhood.</p></div>`;
    return;
  }

  feed.innerHTML = posts.map(post => {
    const official = String(post.authorType || "").toLowerCase() === "bmc" || /bmc/i.test(post.position || "");
    return `
      <article class="community-post">
        <div class="community-post-top">
          <span class="badge">${escapeHtml(post.category || "General")}</span>
          <span class="community-status">${escapeHtml(post.status || "Discussion")}</span>
        </div>
        <div class="community-author-row">
          <div class="community-avatar">${official ? "🏛️" : "👤"}</div>
          <div class="community-author-block">
            <strong>${escapeHtml(post.username || "@community_member")}</strong>
            <span>${escapeHtml(post.author || "Community Member")}</span>
            <small>${escapeHtml(post.position || "Resident / Community Member")}${official ? ' · <b class="bmc-official-badge">✓ BMC Official</b>' : ""}</small>
          </div>
        </div>
        <h3>${escapeHtml(post.title)}</h3>
        <p>${escapeHtml(post.body)}</p>
        <small>📍 ${escapeHtml(post.location || "Mumbai")} · 💬 ${Number(post.replies?.length || 0)} replies</small>
      </article>`;
  }).join("");
}

/* =========================================================
   CREATE COMMUNITY POST
   ========================================================= */

function createPost() {
  const username = $("#postUsername")?.value.trim() || "";
  const position = $("#postPosition")?.value || "Resident / Community Member";
  const title = $("#postTitle")?.value.trim() || "";
  const category = $("#postCategory")?.value || "General";
  const location = $("#postLocation")?.value.trim() || "";
  const body = $("#postBody")?.value.trim() || "";

  if (!username || !title || !location || !body) {
    toast("Please fill in username, heading, location and message.");
    return false;
  }

  const cleanUsername = username.startsWith("@") ? username : `@${username.replace(/\s+/g, "_")}`;
  const isBmc = position !== "Resident / Community Member";
  const posts = get(KEY.posts, []);

  posts.push({
    id: `P-${Date.now()}`,
    username: cleanUsername,
    author: cleanUsername.replace(/^@/, "").replace(/_/g, " "),
    position,
    authorType: isBmc ? "bmc" : "people",
    title,
    category,
    location,
    body,
    status: "Community Update",
    created_at: new Date().toISOString(),
    replies: []
  });

  set(KEY.posts, posts);
  renderCommunity();

  ["postUsername", "postTitle", "postLocation", "postBody"].forEach(id => {
    const field = $("#" + id);
    if (field) field.value = "";
  });
  const role = $("#postPosition");
  if (role) role.value = "Resident / Community Member";

  toast("Your update has been posted to the community feed.");
  return false;
}
window.createPost = createPost;

function initCommunity() {
  const button = $("#communityPostButton") || $("button[onclick='createPost()']");
  if (button) {
    button.addEventListener("click", event => {
      event.preventDefault();
      createPost();
    });
  }
}

/* =========================================================
   PHOTO PREVIEW
   ========================================================= */

function initPhotoPreview() {

  const input =
    $("#photoInput");


  const preview =
    $("#previews");


  if (!input || !preview) {
    return;
  }


  input.addEventListener(
    "change",
    () => {

      preview.innerHTML = "";


      [...input.files]
        .slice(0, 5)
        .forEach(file => {

          const reader =
            new FileReader();


          reader.onload =
            event => {

              const image =
                document.createElement(
                  "img"
                );


              image.src =
                event.target.result;


              image.style.width =
                "100px";


              image.style.height =
                "100px";


              image.style.objectFit =
                "cover";


              image.style.borderRadius =
                "12px";


              preview.appendChild(
                image
              );

            };


          reader.readAsDataURL(file);

        });

    }
  );

}


/* =========================================================
   INITIALIZATION
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    /* Apply saved theme */
    theme();

    /* One shared theme button on every page. */
    const themeButton = $("#themeToggle");
    if (themeButton) {
      themeButton.addEventListener("click", toggleTheme);
    }

    /* Mobile navigation — presentation only; existing links remain unchanged. */
    const mobileMenuToggle = $("#mobileMenuToggle");
    const navigation = $(".nav");
    if (mobileMenuToggle && navigation) {
      mobileMenuToggle.addEventListener("click", () => {
        const open = navigation.classList.toggle("mobile-open");
        mobileMenuToggle.setAttribute("aria-expanded", String(open));
        mobileMenuToggle.textContent = open ? "✕" : "☰";
      });

      navigation.addEventListener("click", (event) => {
        if (event.target.closest("a")) {
          navigation.classList.remove("mobile-open");
          mobileMenuToggle.setAttribute("aria-expanded", "false");
          mobileMenuToggle.textContent = "☰";
        }
      });
    }

    initMap();

    initDashboardSampleManager();

    initReportForm();

    /* Success modal actions */
    const modal = $("#modal");
    const closeButton = modal?.querySelector("[data-modal-close]");
    const dashboardButton = modal?.querySelector("[data-modal-dashboard]");

    if (closeButton) {
      closeButton.addEventListener("click", closeModal);
    }

    if (dashboardButton) {
      dashboardButton.addEventListener("click", openDashboard);
    }

    if (modal) {
      modal.addEventListener("click", (event) => {
        if (event.target === modal) {
          closeModal();
        }
      });
    }

    initCommunity();

    initPhotoPreview();

    renderMyReports();

    renderDashboard();

    renderCommunity();

    setLocationText();

    // Load the real SQLite-backed complaints so Dashboard/Map stay in sync.
    loadBackendReports();

    // Start the browser-side demo workflow for newly submitted complaints.
    startLiveWorkflowTimer();

  }
);