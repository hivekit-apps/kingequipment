'use client';

import { useState, useRef, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';

type Photo = { src: string; alt: string };

type Props = {
  id: string;
  initialPhotos: Photo[];
};

export function PhotoManager({ id, initialPhotos }: Props) {
  const router = useRouter();
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
  const [uploading, setUploading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const fileRef = useRef<HTMLInputElement | null>(null);

  async function onFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    setErrorMsg('');
    try {
      // Upload serially so error messages are deterministic.
      const nextPhotos = [...photos];
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('alt', `${id} photo`);
        const res = await fetch(`/api/admin/equipment/${id}/photos`, {
          method: 'POST',
          body: fd,
        });
        const data = (await res.json().catch(() => ({}))) as { error?: string; photo?: Photo };
        if (!res.ok || !data.photo) {
          setErrorMsg(data.error || `Upload failed (${res.status})`);
          setUploading(false);
          if (fileRef.current) fileRef.current.value = '';
          setPhotos(nextPhotos);
          return;
        }
        nextPhotos.push(data.photo);
      }
      setPhotos(nextPhotos);
      if (fileRef.current) fileRef.current.value = '';
      router.refresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Network error');
    } finally {
      setUploading(false);
    }
  }

  async function onDelete(src: string) {
    if (!confirm('Remove this photo?')) return;
    try {
      const res = await fetch(`/api/admin/equipment/${id}/photos/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ src }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setErrorMsg(data.error || `Delete failed (${res.status})`);
        return;
      }
      setPhotos((prev) => prev.filter((p) => p.src !== src));
      router.refresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Network error');
    }
  }

  async function onAltSave(src: string, alt: string) {
    try {
      const res = await fetch(`/api/admin/equipment/${id}/photos`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ src, alt }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setErrorMsg(data.error || `Save failed (${res.status})`);
        return;
      }
      setPhotos((prev) => prev.map((p) => (p.src === src ? { ...p, alt } : p)));
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Network error');
    }
  }

  return (
    <section className="mt-8 bg-white rounded-lg border border-gray-200 p-5">
      <h2 className="text-lg font-bold text-gray-900">Photos</h2>
      <p className="mt-1 text-xs text-gray-600">
        Upload replaces the current photo list on the public site. First photo is used as the hero.
      </p>

      <div className="mt-4">
        <label className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-gray-300 bg-gray-50 hover:bg-gray-100 cursor-pointer text-sm font-medium">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            onChange={onFiles}
            disabled={uploading}
            className="hidden"
          />
          {uploading ? 'Uploading…' : '+ Upload photos'}
        </label>
        {errorMsg && <span className="ml-3 text-sm text-red-700">{errorMsg}</span>}
      </div>

      {photos.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500">No photos yet.</p>
      ) : (
        <ul className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {photos.map((p) => (
            <li key={p.src} className="flex gap-3 border border-gray-200 rounded-md p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.src}
                alt={p.alt}
                className="w-32 h-32 object-contain rounded border border-gray-200 bg-white"
              />
              <div className="flex-1 min-w-0">
                <label className="block text-xs font-medium text-gray-700">Alt text</label>
                <input
                  type="text"
                  defaultValue={p.alt}
                  onBlur={(e) => {
                    if (e.target.value !== p.alt) onAltSave(p.src, e.target.value);
                  }}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                />
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="truncate text-gray-500" title={p.src}>
                    {p.src.split('/').slice(-1)[0]}
                  </span>
                  <button
                    type="button"
                    onClick={() => onDelete(p.src)}
                    className="text-red-700 hover:text-red-900 font-medium"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
