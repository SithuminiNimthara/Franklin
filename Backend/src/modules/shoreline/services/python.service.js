import FormData from "form-data";

const PY_INFER_URL = process.env.PY_INFER_URL || "http://localhost:9000";

export async function predictViaPython(buffer, filename, mimetype) {
  const form = new FormData();
  form.append("file", buffer, { filename, contentType: mimetype });

  const res = await fetch(`${PY_INFER_URL}/predict`, {
    method: "POST",
    body: form,
    headers: form.getHeaders(),
  });

  return { status: res.status, body: await res.json() };
}
