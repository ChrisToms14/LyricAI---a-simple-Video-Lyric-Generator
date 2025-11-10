// Prefer Vite env in frontend, fallback to defaults provided
const CLOUD_NAME = (import.meta as any).env?.VITE_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME || 'dapxr5zok';
const UPLOAD_PRESET = (import.meta as any).env?.VITE_CLOUDINARY_UPLOAD_PRESET || process.env.CLOUDINARY_UPLOAD_PRESET || 'upld_lyc';

export async function uploadUnsigned(file: File, resourceType: 'video' | 'raw' = 'video') {
  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`;
  const form = new FormData();
  form.append('upload_preset', UPLOAD_PRESET);
  form.append('file', file);
  const res = await fetch(url, { method: 'POST', body: form });
  let payload: any;
  try { payload = await res.json(); } catch {}
  if (!res.ok) {
    const msg = payload?.error?.message || `Cloudinary upload failed (${res.status})`;
    throw new Error(msg);
  }
  return payload;
}

export const cloudinaryEnv = { CLOUD_NAME, UPLOAD_PRESET };