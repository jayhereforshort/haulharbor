"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Photo = {
  id: string;
  object_key: string;
  object_url: string;
  display_order: number;
};

type Props = {
  accountId: string;
  itemId: string;
  photos: Photo[];
};

function imageUrl(photoId: string) {
  return `/api/inventory/photos/${photoId}/image`;
}

export function PhotoGallery({ accountId, itemId, photos }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(photos[0]?.id ?? null);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const sortedPhotos = useMemo(
    () => [...photos].sort((a, b) => a.display_order - b.display_order),
    [photos]
  );

  useEffect(() => {
    if (!sortedPhotos.length) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !sortedPhotos.some((photo) => photo.id === selectedId)) {
      setSelectedId(sortedPhotos[0].id);
    }
  }, [selectedId, sortedPhotos]);

  const selectedPhoto = sortedPhotos.find((p) => p.id === selectedId);
  const selectedIndex = selectedPhoto ? sortedPhotos.indexOf(selectedPhoto) : -1;

  async function upload(file: File) {
    setError(null);
    setBusy("upload");
    try {
      const presign = await fetch("/api/inventory/photos/presign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          itemId,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
        }),
      });
      if (!presign.ok) throw new Error("Could not create upload URL.");
      const { uploadUrl, objectKey, objectUrl } = (await presign.json()) as {
        uploadUrl: string;
        objectKey: string;
        objectUrl: string;
      };

      const uploaded = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "content-type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!uploaded.ok) throw new Error("Upload failed.");

      const supabase = createClient();
      const nextOrder = sortedPhotos.length;
      const { error: insertErr } = await supabase.from("inventory_photos").insert({
        account_id: accountId,
        inventory_item_id: itemId,
        object_key: objectKey,
        object_url: objectUrl,
        display_order: nextOrder,
      });
      if (insertErr) throw insertErr;

      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(null);
    }
  }

  async function deletePhoto(photoId: string) {
    setError(null);
    setBusy(photoId);
    try {
      const res = await fetch(`/api/inventory/photos/${photoId}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to delete photo.");
      }
      if (selectedId === photoId) {
        const next = sortedPhotos.filter((p) => p.id !== photoId)[0];
        setSelectedId(next?.id ?? null);
      }
      setLightboxOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setBusy(null);
    }
  }

  async function move(photo: Photo, direction: -1 | 1) {
    setError(null);
    setBusy(photo.id);
    const idx = sortedPhotos.findIndex((p) => p.id === photo.id);
    const swapWith = sortedPhotos[idx + direction];
    if (idx < 0 || !swapWith) {
      setBusy(null);
      return;
    }

    const supabase = createClient();
    const { error: errA } = await supabase
      .from("inventory_photos")
      .update({ display_order: swapWith.display_order })
      .eq("id", photo.id);
    const { error: errB } = await supabase
      .from("inventory_photos")
      .update({ display_order: photo.display_order })
      .eq("id", swapWith.id);

    if (errA || errB) {
      setError(errA?.message ?? errB?.message ?? "Could not reorder photos.");
      setBusy(null);
      return;
    }

    setBusy(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-destructive">{error}</p>}

      {sortedPhotos.length === 0 ? (
        <div className="space-y-3">
          <div className="flex aspect-video w-full items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 text-muted-foreground">
            <span className="text-sm">No photos yet</span>
          </div>
          <label className="flex cursor-pointer justify-center">
            <span className="inline-flex items-center justify-center rounded-lg border border-input bg-background px-4 py-2.5 text-sm font-medium hover:bg-muted/50">
              Upload images
            </span>
            <input
              className="hidden"
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void upload(file);
                e.currentTarget.value = "";
              }}
              disabled={Boolean(busy)}
            />
          </label>
        </div>
      ) : (
        <>
          {/* Main image with overlay */}
          <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border bg-muted/20">
            {selectedPhoto && (
              <>
                <button
                  type="button"
                  className="absolute inset-0 z-0 flex w-full items-center justify-center focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  onClick={() => setLightboxOpen(true)}
                  aria-label="View full size"
                >
                  <Image
                    src={imageUrl(selectedPhoto.id)}
                    alt={`Photo ${selectedIndex + 1} of ${sortedPhotos.length}`}
                    fill
                    sizes="(max-width: 768px) 100vw, 520px"
                    unoptimized
                    className="object-contain"
                  />
                </button>
                <div className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-between bg-gradient-to-t from-black/60 to-transparent p-2">
                  <span className="rounded bg-black/50 px-2 py-1 text-xs font-medium text-white">
                    #{selectedIndex}
                  </span>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-7 rounded bg-black/50 px-2 text-xs text-white hover:bg-red-600 hover:text-white"
                    onClick={() => void deletePhoto(selectedPhoto.id)}
                    disabled={busy === selectedPhoto.id}
                  >
                    Delete
                  </Button>
                </div>
              </>
            )}
          </div>

          {/* Thumbnail strip */}
          <div className="flex flex-wrap gap-2">
            {sortedPhotos.map((photo, idx) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => setSelectedId(photo.id)}
                className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-md border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 ${
                  selectedId === photo.id
                    ? "border-primary ring-1 ring-primary"
                    : "border-border hover:border-muted-foreground/50"
                }`}
              >
                <Image
                  src={imageUrl(photo.id)}
                  alt={`Thumbnail ${idx + 1}`}
                  fill
                  sizes="64px"
                  unoptimized
                  className="object-cover"
                />
              </button>
            ))}
          </div>

          {/* Reorder selected */}
          {selectedPhoto && sortedPhotos.length > 1 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Reorder:</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void move(selectedPhoto, -1)}
                disabled={selectedIndex <= 0 || busy === selectedPhoto.id}
              >
                Up
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void move(selectedPhoto, 1)}
                disabled={
                  selectedIndex >= sortedPhotos.length - 1 || busy === selectedPhoto.id
                }
              >
                Down
              </Button>
            </div>
          )}

          {/* Upload images button */}
          <label className="block">
            <span className="inline-flex w-full cursor-pointer items-center justify-center rounded-lg border border-input bg-background py-2.5 text-sm font-medium hover:bg-muted/50">
              Upload images
            </span>
            <input
              className="hidden"
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                const files = e.target.files;
                if (files?.length) {
                  for (let i = 0; i < files.length; i++) void upload(files[i]);
                }
                e.currentTarget.value = "";
              }}
              disabled={Boolean(busy)}
            />
          </label>
        </>
      )}

      {/* Full-size lightbox */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent
          className="max-h-[90vh] max-w-[90vw] border-0 bg-black/95 p-0 focus:outline-none"
          showClose={false}
        >
          <DialogTitle className="sr-only">View image full size</DialogTitle>
          <DialogClose
            className="absolute right-3 top-3 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-black shadow-lg transition-colors hover:bg-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black/95"
            aria-label="Close"
          >
            <X className="h-5 w-5" strokeWidth={2.5} />
          </DialogClose>
          {selectedPhoto && (
            <div className="relative flex min-h-[200px] items-center justify-center p-4">
              <Image
                src={imageUrl(selectedPhoto.id)}
                alt={`Photo ${selectedIndex + 1} of ${sortedPhotos.length}`}
                width={1200}
                height={900}
                unoptimized
                className="max-h-[85vh] w-auto max-w-full object-contain"
              />
              <p className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded bg-black/60 px-2 py-1 text-xs text-white">
                #{selectedIndex} of {sortedPhotos.length}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
