from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Header, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse, Response
from pydantic import BaseModel

import os
import uuid
from datetime import datetime

try:
    from . import auth_core          # python -m uvicorn backend.main:app
    from . import db
except ImportError:
    import auth_core                 # python main.py (run from inside backend/)
    import db


# ============================================================
# APP CONFIGURATION
# ============================================================

app = FastAPI(
    title="CivicMap Mumbai API",
    description="Backend for CivicMap Mumbai civic complaint system",
    version="1.0.0"
)


# ============================================================
# CORS
# ============================================================
#
# This allows the frontend running on localhost:8080
# to communicate with this backend running on port 8000.
#

app.add_middleware(
    CORSMiddleware,
    # The API does not use cookies/authentication, so the browser can call it
    # from the local frontend or a separately hosted static frontend.
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# FOLDERS
# ============================================================

BASE_DIR = os.path.dirname(
    os.path.abspath(__file__)
)

DATABASE = os.path.join(
    BASE_DIR,
    "civicmap.db"
)

UPLOAD_FOLDER = os.path.join(
    BASE_DIR,
    "uploads"
)


try:
    os.makedirs(
        UPLOAD_FOLDER,
        exist_ok=True
    )
except OSError:
    # Read-only hosting (for example Vercel): photos live in the database.
    pass


# ============================================================
# STATIC PHOTO ACCESS
# ============================================================

# Photos are stored inside the database (Neon), because free hosting
# disks are erased on restart. Old photos saved on disk still work.

PHOTO_TYPES = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
}

MAX_PHOTO_BYTES = 5 * 1024 * 1024


@app.get("/uploads/{filename}")
def get_uploaded_photo(filename: str):

    filename = os.path.basename(filename)

    media_type = PHOTO_TYPES.get(
        os.path.splitext(filename)[1].lower(),
        "application/octet-stream"
    )

    connection = get_db()

    try:
        row = connection.execute(
            "SELECT data FROM report_photos WHERE filename = ?",
            (filename,)
        ).fetchone()
    finally:
        connection.close()

    if row and row[0] is not None:
        return Response(
            content=db.row_bytes(row[0]),
            media_type=media_type,
            headers={"Cache-Control": "public, max-age=86400"}
        )

    path = os.path.join(UPLOAD_FOLDER, filename)

    if os.path.isfile(path):
        return FileResponse(path, media_type=media_type)

    raise HTTPException(status_code=404, detail="Photo not found.")


# ============================================================
# DATABASE
# ============================================================

def get_db():

    # Postgres (Neon) when DATABASE_URL is set, otherwise local SQLite.
    return db.get_db()


def init_database():

    connection = get_db()

    cursor = connection.cursor()


    cursor.execute("""
        CREATE TABLE IF NOT EXISTS reports (

            id TEXT PRIMARY KEY,

            title TEXT NOT NULL,

            description TEXT NOT NULL,

            category TEXT NOT NULL,

            authority TEXT,

            status TEXT NOT NULL,

            latitude REAL NOT NULL,

            longitude REAL NOT NULL,

            location TEXT,

            photo_count INTEGER DEFAULT 0,

            created_at TEXT NOT NULL

        )
    """)


    cursor.execute("""
        CREATE TABLE IF NOT EXISTS report_photos (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            report_id TEXT NOT NULL,

            filename TEXT NOT NULL,

            original_name TEXT,

            uploaded_at TEXT NOT NULL,

            data BLOB,

            FOREIGN KEY(report_id)
                REFERENCES reports(id)

        )
    """)


    # Older databases: add the column that stores the photo itself.
    if "data" not in db.column_names(connection, "report_photos"):
        cursor.execute(
            "ALTER TABLE report_photos ADD COLUMN data BLOB"
        )


    connection.commit()

    connection.close()


init_database()

# Login system: users table, admin account and token secret.
SECRET = auth_core.init_auth(get_db)


# ============================================================
# LOGIN HELPERS
# ============================================================

class RegisterBody(BaseModel):
    name: str
    email: str
    password: str


class LoginBody(BaseModel):
    identifier: str
    password: str


class StatusBody(BaseModel):
    status: str
    failure_reason: str = ""


def user_from_header(authorization):
    """Return the logged-in user from 'Authorization: Bearer <token>', or None."""

    if not authorization or not authorization.lower().startswith("bearer "):
        return None

    data = auth_core.read_token(SECRET, authorization[7:].strip())

    if not data:
        return None

    connection = get_db()

    try:
        return auth_core.get_user(connection, data["uid"])
    finally:
        connection.close()


def current_user(authorization: str | None = Header(default=None)):

    user = user_from_header(authorization)

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Please log in to continue."
        )

    return user


def admin_user(user: dict = Depends(current_user)):

    if user["role"] != "admin":
        raise HTTPException(
            status_code=403,
            detail="Admin access only."
        )

    return user


# ============================================================
# KEEP PRIVATE FILES PRIVATE
# ============================================================
#
# The frontend is served from the project folder, which also contains
# backend/ (database + code). These paths must never be downloadable.
#

@app.middleware("http")
async def block_private_files(request: Request, call_next):

    path = request.url.path.lower()

    if (
        path.startswith("/backend")
        or path.endswith((".db", ".py", ".pyc", ".sqlite", ".sqlite3"))
        or "/." in path
    ):
        return JSONResponse(
            status_code=404,
            content={"detail": "Not found"}
        )

    return await call_next(request)


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/")
def home():

    # Serve the CivicMap frontend from the same origin as the API.
    # This is the safest local/demo setup because the browser cannot
    # accidentally point the complaint request at a different server.
    index_file = os.path.join(
        os.path.dirname(BASE_DIR),
        "index.html"
    )

    if os.path.exists(index_file):
        return FileResponse(index_file)

    return {
        "message": "CivicMap Mumbai backend is running",
        "status": "online"
    }



# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/api/health")
def api_health():
    return {
        "status": "online",
        "service": "CivicMap Mumbai API"
    }

# ============================================================
# CREATE CIVIC COMPLAINT
# ============================================================

@app.post("/api/reports")
async def create_report(

    title: str = Form(...),

    description: str = Form(...),

    category: str = Form(...),

    authority: str = Form(""),

    latitude: float = Form(...),

    longitude: float = Form(...),

    location: str = Form(""),

    photos: list[UploadFile] | None = File(default=None),

    authorization: str | None = Header(default=None)

):

    # --------------------------------------------------------
    # BASIC VALIDATION
    # --------------------------------------------------------

    title = title.strip()

    description = description.strip()

    category = category.strip()

    authority = authority.strip()

    location = location.strip()


    if not title:

        raise HTTPException(
            status_code=400,
            detail="Issue title is required."
        )


    if not description:

        raise HTTPException(
            status_code=400,
            detail="Issue description is required."
        )


    if not category:

        raise HTTPException(
            status_code=400,
            detail="Issue category is required."
        )


    # Login is optional for reporting. If the person is logged in,
    # the complaint is linked to their account.
    reporter = user_from_header(authorization)


    # --------------------------------------------------------
    # GENERATE CIVICMAP COMPLAINT ID
    # --------------------------------------------------------

    year = datetime.now().year

    unique_number = str(
        uuid.uuid4().int
    )[:6]


    report_id = (
        f"MUM-{year}-{unique_number}"
    )


    created_at = datetime.now().isoformat(
        timespec="seconds"
    )


    # --------------------------------------------------------
    # SAVE REPORT
    # --------------------------------------------------------

    connection = get_db()

    cursor = connection.cursor()


    cursor.execute(
        """
        INSERT INTO reports (
            id,
            title,
            description,
            category,
            authority,
            status,
            latitude,
            longitude,
            location,
            photo_count,
            created_at,
            user_id
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            report_id,
            title,
            description,
            category,
            authority,
            "Reported",
            latitude,
            longitude,
            location,
            0,
            created_at,
            reporter["id"] if reporter else None
        )
    )


    # --------------------------------------------------------
    # SAVE PHOTOS
    # --------------------------------------------------------

    saved_photos = 0


    if photos:

        for photo in photos[:5]:

            if not photo.filename:

                continue


            # Allow only common image types

            allowed_types = {
                "image/jpeg",
                "image/png",
                "image/webp"
            }


            if photo.content_type not in allowed_types:

                continue


            extension = os.path.splitext(
                photo.filename
            )[1].lower()


            safe_filename = (
                f"{report_id}_"
                f"{uuid.uuid4().hex}"
                f"{extension}"
            )


            contents = await photo.read()


            # Skip empty or very large photos (max 5 MB each)

            if not contents or len(contents) > MAX_PHOTO_BYTES:

                continue


            cursor.execute(
                """
                INSERT INTO report_photos (
                    report_id,
                    filename,
                    original_name,
                    uploaded_at,
                    data
                )
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    report_id,
                    safe_filename,
                    photo.filename,
                    created_at,
                    contents
                )
            )


            saved_photos += 1


    # --------------------------------------------------------
    # UPDATE PHOTO COUNT
    # --------------------------------------------------------

    cursor.execute(
        """
        UPDATE reports
        SET photo_count = ?
        WHERE id = ?
        """,
        (
            saved_photos,
            report_id
        )
    )


    connection.commit()

    connection.close()


    # --------------------------------------------------------
    # RESPONSE TO FRONTEND
    # --------------------------------------------------------

    return {

        "success": True,

        "id": report_id,

        "title": title,

        "description": description,

        "category": category,

        "authority": authority,

        "status": "Reported",

        "latitude": latitude,

        "longitude": longitude,

        "location": location,

        "photo_count": saved_photos,

        "date": datetime.now().strftime(
            "%d %b %Y"
        )

    }


# ============================================================
# GET ONE COMPLAINT
# ============================================================

@app.get("/api/reports/{report_id}")
def get_report(
    report_id: str
):

    connection = get_db()

    cursor = connection.cursor()


    cursor.execute(
        """
        SELECT *
        FROM reports
        WHERE id = ?
        """,
        (report_id,)
    )


    report = cursor.fetchone()


    if not report:

        connection.close()

        raise HTTPException(
            status_code=404,
            detail="Complaint not found."
        )


    result = dict(report)

    result.pop("user_id", None)


    # --------------------------------------------------------
    # GET PHOTOS
    # --------------------------------------------------------

    cursor.execute(
        """
        SELECT filename, original_name
        FROM report_photos
        WHERE report_id = ?
        """,
        (report_id,)
    )


    photos = cursor.fetchall()


    result["photos"] = [

        {
            "filename": p["filename"],

            "original_name":
                p["original_name"],

            "url":
                f"/uploads/{p['filename']}"

        }

        for p in photos

    ]


    connection.close()


    return result


# ============================================================
# GET ALL COMPLAINTS
# ============================================================

@app.get("/api/reports")
def get_reports():

    connection = get_db()

    cursor = connection.cursor()


    cursor.execute(
        """
        SELECT *
        FROM reports
        ORDER BY created_at DESC
        """
    )


    reports = cursor.fetchall()


    connection.close()


    return {

        "count": len(reports),

        "reports": [
            {k: v for k, v in dict(report).items() if k != "user_id"}
            for report in reports
        ]

    }

# ============================================================
# LOGIN / REGISTER
# ============================================================

@app.post("/api/auth/register")
def register(body: RegisterBody):

    connection = get_db()

    try:
        user = auth_core.create_user(
            connection,
            body.name,
            body.email,
            body.password
        )
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))
    finally:
        connection.close()

    return {
        "token": auth_core.make_token(SECRET, user["id"]),
        "user": user
    }


@app.post("/api/auth/login")
def login(body: LoginBody):

    key = body.identifier.strip().lower()

    wait = auth_core.seconds_locked(key)

    if wait:
        raise HTTPException(
            status_code=429,
            detail=f"Too many wrong attempts. Try again in {wait} seconds."
        )

    connection = get_db()

    try:
        user = auth_core.authenticate(
            connection,
            body.identifier,
            body.password
        )
    finally:
        connection.close()

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Wrong email/username or password."
        )

    return {
        "token": auth_core.make_token(SECRET, user["id"]),
        "user": user
    }


@app.get("/api/auth/me")
def me(user: dict = Depends(current_user)):

    return {"user": user}


# ============================================================
# ADMIN API  (admin account only)
# ============================================================

@app.get("/api/admin/stats")
def admin_stats(admin: dict = Depends(admin_user)):

    connection = get_db()

    try:
        return auth_core.admin_stats(connection)
    finally:
        connection.close()


@app.get("/api/admin/reports")
def admin_reports(admin: dict = Depends(admin_user)):

    connection = get_db()

    try:
        reports = auth_core.admin_list_reports(connection)
    finally:
        connection.close()

    return {
        "count": len(reports),
        "reports": reports
    }


@app.patch("/api/admin/reports/{report_id}")
def admin_change_status(
    report_id: str,
    body: StatusBody,
    admin: dict = Depends(admin_user)
):

    connection = get_db()

    try:
        found = auth_core.admin_update_status(
            connection,
            report_id,
            body.status,
            body.failure_reason
        )
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))
    finally:
        connection.close()

    if not found:
        raise HTTPException(
            status_code=404,
            detail="Complaint not found."
        )

    return {"success": True}


@app.delete("/api/admin/reports/{report_id}")
def admin_remove_report(
    report_id: str,
    admin: dict = Depends(admin_user)
):

    connection = get_db()

    try:
        filenames = auth_core.admin_delete_report(
            connection,
            report_id
        )
    finally:
        connection.close()

    if filenames is None:
        raise HTTPException(
            status_code=404,
            detail="Complaint not found."
        )

    # Also delete the uploaded photo files from disk.
    for filename in filenames:

        path = os.path.join(
            UPLOAD_FOLDER,
            os.path.basename(filename)
        )

        if os.path.exists(path):
            os.remove(path)

    return {"success": True}


@app.get("/api/admin/users")
def admin_users(admin: dict = Depends(admin_user)):

    connection = get_db()

    try:
        users = auth_core.admin_list_users(connection)
    finally:
        connection.close()

    return {
        "count": len(users),
        "users": users
    }


# ============================================================
# SERVE FRONTEND FROM FASTAPI (LOCAL/SELF-HOSTED MODE)
# ============================================================
# Serving the frontend from the same FastAPI origin removes the most common
# "Failed to fetch" cause: the browser cannot reach a separately-running
# frontend/backend origin or the API port is wrong. API routes above remain
# available because they are registered before this catch-all mount.

FRONTEND_DIR = os.path.dirname(BASE_DIR)

app.mount(
    "/",
    StaticFiles(directory=FRONTEND_DIR, html=True),
    name="frontend"
)


# ============================================================
# LOCAL LAUNCH
# ============================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=True
    )
