import { getStore } from "@netlify/blobs";

// Отдаёт посетителям актуальный каталог. Если админ ещё ничего не публиковал, возвращает null,
// и сайт показывает стартовые товары из страницы.
export default async () => {
  const store = getStore({ name: "catalog", consistency: "strong" });
  const data = await store.get("store", { type: "json" });
  return new Response(JSON.stringify(data ?? null), {
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
};

export const config = { path: "/api/catalog" };
