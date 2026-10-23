'use client';

// Upload a photo from the editor's computer: shrunk in the browser (JPEG, longest side 2000 px; GIFs as they are),
// stored by POST /api/studio/media/upload, returned as an absolute URL for the story's image field.
const MAX_IMAGE_SIDE = 2000;

/** Shrink a photo in the browser before upload (JPEG, longest side MAX_IMAGE_SIDE); GIFs are sent as they are. */
async function shrink(file: File): Promise<Blob> {
  if (file.type === 'image/gif') return file;
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext('2d')?.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b ?? file), 'image/jpeg', 0.88));
}

export async function uploadImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append('file', await shrink(file), file.name.replace(/\.[^.]+$/, '') + (file.type === 'image/gif' ? '.gif' : '.jpg'));
  const r = await fetch('/api/studio/media/upload', { method: 'POST', body: fd });
  const j = await r.json().catch(() => null);
  if (!r.ok || !j?.ok) throw new Error(j?.error?.message ?? String(r.status));
  return `${window.location.origin}${j.data.path as string}`;
}
