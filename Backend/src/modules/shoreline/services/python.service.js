const PY_INFER_URL =
  process.env.AI_SERVICE_URL || "http://127.0.0.1:8000/ai/shoreline";

export async function predictViaPython(buffer, filename, mimetype) {
  const form = new FormData();

  const blob = new Blob([buffer], {
    type: mimetype || "application/octet-stream",
  });

  form.append("file", blob, filename || "image.jpg");

  // ✅ IMPORTANT: correct endpoint
  const res = await fetch(`${PY_INFER_URL}/predict`, {
    method: "POST",
    body: form,
  });

  const text = await res.text();
  console.log("Python raw status:", res.status);
  console.log("Python raw text:", text.slice(0, 200));

  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}

  return { status: res.status, body: json ?? { detail: text } };
}
