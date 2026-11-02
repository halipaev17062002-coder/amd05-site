import { getStore } from "@netlify/blobs";
import { timingSafeEqual, randomUUID, createHash } from "node:crypto";

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

// Сравнение паролей без утечки по времени ответа.
function samePassword(a, b) {
  const ha = createHash("sha256").update(String(a)).digest();
  const hb = createHash("sha256").update(String(b)).digest();
  return timingSafeEqual(ha, hb);
}

const str = (v, max) => String(v ?? "").slice(0, max);
const ID = /[^A-Za-z0-9_-]/g;
const IMG = /^\/(api\/img|img)\/[A-Za-z0-9._-]{1,80}$/;

// Принимаем только ожидаемую структуру и обрезаем лишнее.
function cleanStore(s) {
  if (!s || typeof s !== "object") throw new Error("bad_store");
  const categories = (Array.isArray(s.categories) ? s.categories : [])
    .slice(0, 60)
    .map((c) => ({ id: str(c?.id, 40).replace(ID, ""), name: str(c?.name, 80) }))
    .filter((c) => c.id && c.name);
  const products = (Array.isArray(s.products) ? s.products : [])
    .slice(0, 500)
    .map((p) => ({
      id: str(p?.id, 60).replace(ID, ""),
      cat: str(p?.cat, 40),
      name: str(p?.name, 200),
      price: str(p?.price, 60),
      desc: str(p?.desc, 300),
      note: str(p?.note, 2000),
      stock: !!p?.stock,
      imgs: (Array.isArray(p?.imgs) ? p.imgs : []).filter((u) => typeof u === "string" && IMG.test(u)).slice(0, 8),
    }))
    .filter((p) => p.id && p.name);
  const info = s.info && typeof s.info === "object" ? s.info : {};
  return {
    meta: { updatedAt: Date.now() },
    info: { about: str(info.about, 5000), hours: str(info.hours, 200), address: str(info.address, 300) },
    categories,
    products,
  };
}

export default async (req) => {
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return json({ error: "not_configured" }, 500);

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad_json" }, 400);
  }

  if (!samePassword(body?.password ?? "", expected)) {
    await new Promise((r) => setTimeout(r, 700)); // замедляем перебор паролей
    return json({ error: "unauthorized" }, 401);
  }

  switch (body.action) {
    case "check":
      return json({ ok: true });

    case "image": {
      const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(body.data || ""));
      if (!m) return json({ error: "bad_image" }, 400);
      const buf = Buffer.from(m[2], "base64");
      if (buf.length > 2_000_000) return json({ error: "too_large" }, 413);
      const ext = m[1] === "image/png" ? "png" : m[1] === "image/webp" ? "webp" : "jpg";
      const id = `${randomUUID()}.${ext}`;
      const data = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
      await getStore({ name: "images", consistency: "strong" }).set(id, data, { metadata: { contentType: m[1] } });
      return json({ url: `/api/img/${id}` });
    }

    case "save": {
      let cleaned;
      try {
        cleaned = cleanStore(body.store);
      } catch {
        return json({ error: "bad_store" }, 400);
      }
      const store = getStore({ name: "catalog", consistency: "strong" });
      const previous = await store.get("store", { type: "json" });
      if (previous) await store.setJSON("previous", previous); // копия на случай, если нужно откатиться
      await store.setJSON("store", cleaned);
      return json({ ok: true, store: cleaned });
    }

    default:
      return json({ error: "unknown_action" }, 400);
  }
};

export const config = { path: "/api/admin" };
