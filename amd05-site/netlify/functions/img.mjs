import { getStore } from "@netlify/blobs";

// Отдаёт фото товаров, загруженные через панель администратора.
export default async (req, context) => {
  const id = context.params.id;
  if (!/^[A-Za-z0-9._-]{1,80}$/.test(id)) return new Response("Not found", { status: 404 });
  const store = getStore({ name: "images", consistency: "strong" });
  const res = await store.getWithMetadata(id, { type: "arrayBuffer" });
  if (!res) return new Response("Not found", { status: 404 });
  return new Response(res.data, {
    headers: {
      "content-type": res.metadata?.contentType || "image/jpeg",
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
};

export const config = { path: "/api/img/:id" };
