# ====== OFFERS EDIT/DELETE PATCH ======
from typing import Optional
from fastapi import Request, HTTPException

def _require_key(request: Request) -> str:
    key = request.headers.get("X-Foody-Key")
    if not key:
        raise HTTPException(status_code=401, detail="X-Foody-Key required")
    return key

async def _get_merchant_id(conn, key: str) -> int:
    row = await conn.fetchrow("SELECT id FROM merchants WHERE api_key=$1", key)
    if not row:
        raise HTTPException(status_code=403, detail="Invalid API Key")
    return row["id"]

@app.patch("/api/v1/merchant/offers/{offer_id}")
async def patch_offer(offer_id: int, payload: dict, request: Request):
    key = _require_key(request)
    async with pool.acquire() as conn:
        merchant_id = await _get_merchant_id(conn, key)
        # Build dynamic SET
        fields = []
        values = []
        mapping = {
            "title":"title",
            "price":"price",
            "price_cents":"price_cents",
            "original_price":"original_price",
            "original_price_cents":"original_price_cents",
            "qty_total":"qty_total",
            "qty_left":"qty_left",
            "expires_at":"expires_at",
            "image_url":"image_url",
            "category":"category",
            "description":"description",
            "status":"status",
        }
        for k,v in payload.items():
            col = mapping.get(k)
            if col is None: 
                continue
            fields.append(f"{col} = ${len(values)+1}")
            values.append(v)
        if not fields:
            return {"updated": 0}
        values.extend([offer_id, merchant_id])
        q = "UPDATE offers SET " + ", ".join(fields) + " WHERE id=$%d AND merchant_id=$%d" % (len(values)-1, len(values))
        res = await conn.execute(q, *values)
        return {"ok": True, "res": res}

@app.delete("/api/v1/merchant/offers/{offer_id}")
async def delete_offer(offer_id: int, request: Request):
    key = _require_key(request)
    async with pool.acquire() as conn:
        merchant_id = await _get_merchant_id(conn, key)
        # soft delete
        await conn.execute("UPDATE offers SET status='deleted' WHERE id=$1 AND merchant_id=$2", offer_id, merchant_id)
    return {"ok": True}

@app.post("/api/v1/merchant/offers/{offer_id}/delete")
async def delete_offer_post(offer_id: int, request: Request):
    # Fallback for proxies that block DELETE
    return await delete_offer(offer_id, request)
# ===== END PATCH =====