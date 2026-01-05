const PY_INFER_URL = process.env.PY_INFER_URL || "http://localhost:9000";

export async function predictViaPython(buffer, filename, mimetype) {
  // ✅ prove what runtime objects you have
  console.log(
    "Node FormData:",
    typeof FormData,
    "Blob:",
    typeof Blob,
    "fetch:",
    typeof fetch
  );

  const form = new FormData();
  const blob = new Blob([buffer], {
    type: mimetype || "application/octet-stream",
  });

  form.append("file", blob, filename || "image.jpg");

  const res = await fetch(`${PY_INFER_URL}/predict`, {
    method: "POST",
    body: form,
    // ❌ DO NOT set headers here
  });

  const text = await res.text();
  console.log("Python raw status:", res.status);
  console.log("Python raw text:", text.slice(0, 200)); // first 200 chars

  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}

  return { status: res.status, body: json ?? { detail: text } };
}
