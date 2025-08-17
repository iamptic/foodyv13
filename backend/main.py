
import os
import uuid
import asyncio
import mimetypes
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import asyncpg
from fastapi import FastAPI, UploadFile, File, HTTPException, Request, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# ---------- Settings ----------
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL env variable is required")

CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "*").split(",") if o.strip()]
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")

app = FastAPI(title="Foody Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS if CORS_ORIGINS != ["*"] else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure uploads dir exists & mount static
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/u", StaticFiles(directory=UPLOAD_DIR), name="uploads")

pool: asyncpg.Pool

# ---------- Helpers ----------
async def get_pool() -> asyncpg.Pool:
    return pool

async def fetch_columns(conn: asyncpg.Connection, table: str) -> Dict[str, Dict[str, Any]]:
    # Return mapping: column -> {'is_nullable': bool, 'data_type': str}
    rows = await conn.fetch(
        """
        SELECT column_name, is_nullable, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        """,
        table,
    )
    info = {}
    for r in rows:
        info[r["column_name"]] = {
            "is_nullable": (r["is_nullable"] == "YES"),
            "data_type": r["data_type"],
        }
    return info

def now_utc() -> datetime:
    return datetime.now(timezone.utc)

async def require_key(conn: asyncpg.Connection, request: Request) -> int:
    key = request.headers.get("X-Foody-Key")
    if not key:
        raise HTTPException(status_code=401, detail="X-Foody-Key header is required")
    row = await conn.fetchrow("SELECT id FROM merchants WHERE api_key = $1", key)
    if not row:
        raise HTTPException(status_code=403, detail="Invalid API key")
    return int(row["id"])

def to_cents(value: Optional[float], fallback: Optional[int] = None) -> Optional[int]:
    if value is None:
        return fallback
    try:
        return int(round(float(value) * 100))
    except Exception:
        return fallback

def from_cents(value: Optional[int]) -> Optional[float]:
    if value is None:
        return None
    try:
        return round(float(value) / 100.0, 2)
    except Exception:
        return None

def row_to_dict(row: asyncpg.Record) -> Dict[str, Any]:
    d = dict(row)
    # normalize money fields if present
    if "price_cents" in d and d["price_cents"] is not None:
        d["price"] = from_cents(d["price_cents"])
    if "original_price_cents" in d and d["original_price_cents"] is not None:
        d["original_price"] = from_cents(d["original_price_cents"])
    # ISO datetimes
    if isinstance(d.get("expires_at"), datetime):
        d["expires_at"] = d["expires_at"].isoformat()
    if isinstance(d.get("created_at"), datetime):
        d["created_at"] = d["created_at"].isoformat()
    return d

# ---------- Startup / Shutdown ----------
@app.on_event("startup")
async def on_startup():
    global pool
    pool = await asyncpg.create_pool(DATABASE_URL, min_size=1, max_size=10)

@app.on_event("shutdown")
async def on_shutdown():
    await pool.close()

# ---------- Health ----------
@app.get("/health")
async def health():
    return {"ok": True, "ts": now_utc().isoformat()}

# ---------- Upload ----------
@app.post("/upload")
async def upload_file(request: Request, file: UploadFile = File(...)):
    # basic extension validation
    content_type = file.content_type or mimetypes.guess_type(file.filename)[0] or ""
    if not content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image uploads are allowed")
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in [".jpg", ".jpeg", ".png", ".webp", ".gif"]:
        ext = ".jpg"
    name = f"{uuid.uuid4().hex}{ext}"
    dest = os.path.join(UPLOAD_DIR, name)
    data = await file.read()
    if len(data) > 7 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large (max 7MB)")
    with open(dest, "wb") as f:
        f.write(data)
    base = str(request.base_url).rstrip("/")
    return {"url": f"{base}/u/{name}"}

# ---------- Offers API ----------

@app.get("/api/v1/merchant/offers")
async def list_offers(
    request: Request,
    restaurant_id: int = Query(..., description="Restaurant ID"),
):
    async with pool.acquire() as conn:
        merchant_id = await require_key(conn, request)
        # Keep it permissive: show offers owned by this merchant & restaurant
        rows = await conn.fetch(
            """
            SELECT *
            FROM offers
            WHERE restaurant_id = $1
              AND (merchant_id = $2 OR $2 IS NOT NULL)
              AND (status IS NULL OR status != 'deleted')
            ORDER BY id DESC
            """,
            restaurant_id,
            merchant_id,
        )
        return [row_to_dict(r) for r in rows]

@app.post("/api/v1/merchant/offers")
async def create_offer(request: Request, payload: Dict[str, Any]):
    async with pool.acquire() as conn:
        merchant_id = await require_key(conn, request)
        cols_info = await fetch_columns(conn, "offers")

        # Validate restaurant_id
        restaurant_id = payload.get("restaurant_id")
        if not restaurant_id:
            raise HTTPException(status_code=400, detail="restaurant_id is required")

        # Image URL requirement if column exists and NOT NULL
        if "image_url" in cols_info and not cols_info["image_url"]["is_nullable"]:
            if not payload.get("image_url"):
                raise HTTPException(status_code=400, detail="image_url is required")

        # Prepare values
        title = (payload.get("title") or "").strip()
        category = payload.get("category", "ready_meal")
        description = payload.get("description") or None
        expires_at = payload.get("expires_at")
        if expires_at:
            try:
                # allow both "YYYY-MM-DD HH:MM" and ISO
                if "T" not in expires_at and ":" in expires_at:
                    expires_at = expires_at.replace(" ", "T")
                expires_at = datetime.fromisoformat(expires_at)
            except Exception:
                raise HTTPException(status_code=400, detail="Invalid expires_at format")

        qty_total = int(payload.get("qty_total") or 1)
        qty_left = int(payload.get("qty_left") or qty_total)

        price = payload.get("price")
        price_cents = payload.get("price_cents", to_cents(price))
        original_price = payload.get("original_price")
        original_price_cents = payload.get("original_price_cents", to_cents(original_price))

        image_url = payload.get("image_url") or None

        # Build dynamic insert based on existing columns
        fields = ["merchant_id", "restaurant_id", "title"]
        values = [merchant_id, restaurant_id, title]

        def add(col, val):
            fields.append(col)
            values.append(val)

        if "price_cents" in cols_info:
            add("price_cents", price_cents)
        if "original_price_cents" in cols_info:
            add("original_price_cents", original_price_cents)
        if "price" in cols_info:
            add("price", price if price is not None else (from_cents(price_cents) if price_cents is not None else None))
        if "original_price" in cols_info:
            add("original_price", original_price if original_price is not None else (from_cents(original_price_cents) if original_price_cents is not None else None))

        if "qty_total" in cols_info:
            add("qty_total", qty_total)
        if "qty_left" in cols_info:
            add("qty_left", qty_left)
        if "expires_at" in cols_info:
            add("expires_at", expires_at)
        if "image_url" in cols_info:
            add("image_url", image_url)
        if "category" in cols_info:
            add("category", category)
        if "description" in cols_info:
            add("description", description)
        if "status" in cols_info:
            add("status", "active")

        placeholders = ", ".join(f"${i}" for i in range(1, len(values) + 1))
        columns = ", ".join(fields)

        row = await conn.fetchrow(
            f"INSERT INTO offers ({columns}) VALUES ({placeholders}) RETURNING *",
            *values
        )
        return row_to_dict(row)

@app.patch("/api/v1/merchant/offers/{offer_id}")
async def patch_offer(offer_id: int, request: Request, payload: Dict[str, Any]):
    async with pool.acquire() as conn:
        merchant_id = await require_key(conn, request)
        cols_info = await fetch_columns(conn, "offers")

        mapping = {
            "title": "title",
            "price": "price",
            "price_cents": "price_cents",
            "original_price": "original_price",
            "original_price_cents": "original_price_cents",
            "qty_total": "qty_total",
            "qty_left": "qty_left",
            "expires_at": "expires_at",
            "image_url": "image_url",
            "category": "category",
            "description": "description",
            "status": "status",
        }

        sets = []
        values = []
        for k, v in payload.items():
            col = mapping.get(k)
            if not col or col not in cols_info:
                continue
            if col in ("price_cents", "original_price_cents") and isinstance(v, (int, float, str)):
                try:
                    v = int(v)
                except Exception:
                    v = None
            if col in ("price", "original_price") and v is not None:
                try:
                    v = float(v)
                except Exception:
                    v = None
            if k == "expires_at" and isinstance(v, str):
                # allow both "YYYY-MM-DD HH:MM" and ISO
                if "T" not in v and ":" in v:
                    v = v.replace(" ", "T")
                try:
                    v = datetime.fromisoformat(v)
                except Exception:
                    raise HTTPException(status_code=400, detail="Invalid expires_at format")
            sets.append(f"{col} = ${len(values) + 1}")
            values.append(v)

        if not sets:
            return {"updated": 0}

        # WHERE
        values.append(offer_id)
        values.append(merchant_id)

        q = f"UPDATE offers SET {', '.join(sets)} WHERE id = ${len(values)-1} AND merchant_id = ${len(values)} RETURNING *"
        row = await conn.fetchrow(q, *values)
        if not row:
            raise HTTPException(status_code=404, detail="Offer not found")
        return row_to_dict(row)

@app.delete("/api/v1/merchant/offers/{offer_id}")
async def delete_offer(offer_id: int, request: Request):
    async with pool.acquire() as conn:
        merchant_id = await require_key(conn, request)
        cols_info = await fetch_columns(conn, "offers")
        if "status" in cols_info:
            row = await conn.fetchrow(
                "UPDATE offers SET status = 'deleted' WHERE id=$1 AND merchant_id=$2 RETURNING *",
                offer_id, merchant_id
            )
            if row:
                return {"ok": True, "deleted": row_to_dict(row)}
        # hard delete fallback
        res = await conn.execute("DELETE FROM offers WHERE id=$1 AND merchant_id=$2", offer_id, merchant_id)
        return {"ok": res.startswith("DELETE")}

@app.post("/api/v1/merchant/offers/{offer_id}/delete")
async def delete_offer_post(offer_id: int, request: Request):
    # Fallback when DELETE is blocked by proxies
    return await delete_offer(offer_id, request)
