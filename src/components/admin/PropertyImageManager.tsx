import { useEffect, useMemo, useRef, useState, type DragEvent, type SetStateAction } from "react";
import {
  Check,
  GripVertical,
  ImagePlus,
  LoaderCircle,
  RefreshCw,
  Star,
  Trash2,
  Upload,
  Video,
  X,
} from "lucide-react";
import type { Upload as TusUpload } from "tus-js-client";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { PropertyImageLightbox } from "@/components/property/PropertyImageLightbox";
import { useLanguage } from "@/i18n/LanguageProvider";
import { adminMediaPreviewUrl } from "@/lib/admin/media";
import {
  areDuplicateMediaFiles,
  createPropertyMediaPath,
  uploadPropertyMedia,
  validatePropertyMediaFile,
} from "@/lib/admin/property-images";
import { mediaUrl } from "@/lib/media";
import { supabase } from "@/integrations/supabase/client";

export type ManagedPropertyImage = {
  id?: string;
  url: string;
  preview_url?: string;
  storage_path?: string | null;
  sort_order: number;
  name?: string;
  persisted?: boolean;
};

type UploadTask = {
  id: string;
  file: File;
  path: string;
  progress: number;
  status: "waiting" | "uploading" | "uploaded" | "failed";
  storageUploaded?: boolean;
  error?: string;
  replaceTarget?: ManagedPropertyImage;
};

type Props = {
  images: ManagedPropertyImage[];
  onImagesChange: (update: SetStateAction<ManagedPropertyImage[]>) => void;
  coverUrl: string;
  onCoverChange: (url: string) => void;
  onImageRemoved: (image: ManagedPropertyImage) => void;
  onNewUpload: (path: string) => void;
  onDiscardedUpload: (path: string) => void;
  onUploadingChange: (uploading: boolean) => void;
  disabled?: boolean;
};

const MAX_PARALLEL_UPLOADS = 3;

export function PropertyImageManager({
  images,
  onImagesChange,
  coverUrl,
  onCoverChange,
  onImageRemoved,
  onNewUpload,
  onDiscardedUpload,
  onUploadingChange,
  disabled = false,
}: Props) {
  const { t } = useLanguage();
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const [draggingFiles, setDraggingFiles] = useState(false);
  const [draggedImage, setDraggedImage] = useState<number | null>(null);
  const [imageToRemove, setImageToRemove] = useState<ManagedPropertyImage | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const uploadControllers = useRef(new Map<string, TusUpload>());
  const replaceTarget = useRef<ManagedPropertyImage | null>(null);

  const overallProgress = useMemo(() => {
    const activeTasks = tasks.filter((task) => task.status === "uploading");
    if (activeTasks.length === 0) return null;
    return Math.round(
      activeTasks.reduce((sum, task) => sum + task.progress, 0) / activeTasks.length,
    );
  }, [tasks]);
  const previewImages = useMemo(
    () =>
      images
        .filter((image) => !/\.(mp4|webm|ogv|ogg|mov|m4v|avi|mkv)(\?|$)/i.test(image.url))
        .map((image) => image.preview_url ?? image.url),
    [images],
  );
  const isUploading = tasks.some((task) => task.status === "uploading");

  useEffect(() => onUploadingChange(isUploading), [isUploading, onUploadingChange]);

  function updateTask(id: string, update: Partial<UploadTask>) {
    setTasks((current) => current.map((task) => (task.id === id ? { ...task, ...update } : task)));
  }

  async function uploadTask(task: UploadTask) {
    updateTask(task.id, { status: "uploading", progress: 0, error: undefined });
    try {
      if (!task.storageUploaded) {
        await uploadPropertyMedia(
          task.file,
          task.path,
          (progress) => updateTask(task.id, { progress }),
          (upload) => uploadControllers.current.set(task.id, upload),
          () => {
            updateTask(task.id, { storageUploaded: true });
            onNewUpload(task.path);
          },
        );
      }
      await attachUploadedTask(task);
    } catch (error) {
      updateTask(task.id, {
        status: "failed",
        error: error instanceof Error ? error.message : t("admin.images.uploadError"),
      });
    } finally {
      uploadControllers.current.delete(task.id);
    }
  }

  async function attachUploadedTask(task: UploadTask) {
    try {
      const url = mediaUrl(task.path);
      const previewUrl = await adminMediaPreviewUrl(url);
      const image: ManagedPropertyImage = {
        url,
        preview_url: previewUrl,
        storage_path: task.path,
        sort_order: images.length,
        name: task.file.name,
      };
      onNewUpload(task.path);
      if (task.replaceTarget) {
        onImageRemoved(task.replaceTarget);
        onImagesChange((current) => {
          const index = current.findIndex((item) => isSameImage(item, task.replaceTarget!));
          if (index < 0) return [...current, { ...image, sort_order: current.length }];
          const next = [...current];
          next[index] = { ...image, sort_order: index };
          return next;
        });
        if (coverUrl === task.replaceTarget.url) onCoverChange(url);
      } else {
        onImagesChange((current) => [...current, { ...image, sort_order: current.length }]);
        if (!coverUrl) onCoverChange(url);
      }
      updateTask(task.id, { status: "uploaded", progress: 100 });
    } catch (error) {
      updateTask(task.id, {
        status: "failed",
        storageUploaded: true,
        error: error instanceof Error ? error.message : t("admin.images.uploadError"),
      });
    }
  }

  async function processTasks(queue: UploadTask[]) {
    let nextIndex = 0;
    const worker = async () => {
      while (nextIndex < queue.length) {
        const index = nextIndex++;
        await uploadTask(queue[index]);
      }
    };
    await Promise.all(Array.from({ length: Math.min(MAX_PARALLEL_UPLOADS, queue.length) }, worker));
  }

  async function addFiles(fileList: FileList | File[], replacement?: ManagedPropertyImage) {
    const files = Array.from(fileList);
    if (files.length === 0) return;
    const existing = tasks.map((task) => task.file);
    const accepted: UploadTask[] = [];

    for (const file of files) {
      const validation = validatePropertyMediaFile(file);
      if (!validation.valid) {
        toast.error(
          validation.reason === "too_large"
            ? t("admin.images.fileTooLarge").replace("{name}", file.name)
            : t("admin.images.invalidFile").replace("{name}", file.name),
        );
        continue;
      }
      if (
        [...existing, ...accepted.map((task) => task.file)].some((added) =>
          areDuplicateMediaFiles(added, file),
        )
      ) {
        toast.error(t("admin.images.duplicate").replace("{name}", file.name));
        continue;
      }
      accepted.push({
        id: crypto.randomUUID(),
        file,
        path: createPropertyMediaPath(file),
        progress: 0,
        status: "waiting",
        ...(replacement ? { replaceTarget: replacement } : {}),
      });
    }

    if (accepted.length === 0) return;
    setTasks((current) => [...current, ...accepted]);
    void processTasks(accepted);
  }

  async function retryTask(task: UploadTask) {
    if (task.storageUploaded) {
      updateTask(task.id, { status: "uploading", error: undefined });
      await attachUploadedTask(task);
      return;
    }
    await uploadTask(task);
  }

  async function discardTask(task: UploadTask) {
    const controller = uploadControllers.current.get(task.id);
    if (controller) await controller.abort(true);

    const isInImages = images.some((image) => image.storage_path === task.path);
    if (task.storageUploaded || task.status === "uploaded" || isInImages) {
      const { error } = await supabase.storage.from("property-images").remove([task.path]);
      if (error) {
        toast.error(`${t("admin.images.cleanupError")} ${error.message}`);
        return;
      }
      onImagesChange((current) => current.filter((image) => image.storage_path !== task.path));
      onDiscardedUpload(task.path);
      if (coverUrl === mediaUrl(task.path)) {
        const nextCover = images.find(
          (image) => image.storage_path !== task.path && !isVideo(image.url),
        );
        onCoverChange(nextCover?.url ?? "");
      }
    }
    setTasks((current) => current.filter((item) => item.id !== task.id));
  }

  function moveImage(from: number, to: number) {
    if (to < 0 || to >= images.length || from === to) return;
    onImagesChange((current) => {
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next.map((image, sort_order) => ({ ...image, sort_order }));
    });
  }

  async function removeImage(image: ManagedPropertyImage) {
    if (!image.id && !image.persisted && image.storage_path) {
      const { error } = await supabase.storage.from("property-images").remove([image.storage_path]);
      if (error) {
        toast.error(`${t("admin.images.cleanupError")} ${error.message}`);
        return;
      }
      onDiscardedUpload(image.storage_path);
      setTasks((current) => current.filter((task) => task.path !== image.storage_path));
    }
    if (image.id || image.persisted) onImageRemoved(image);
    onImagesChange((current) => {
      const next = current.filter((item) => !isSameImage(item, image));
      return next.map((item, sort_order) => ({ ...item, sort_order }));
    });
    if (coverUrl === image.url) {
      const nextCover = images.find((item) => !isSameImage(item, image) && !isVideo(item.url));
      onCoverChange(nextCover?.url ?? "");
    }
    setImageToRemove(null);
  }

  function beginReplace(image: ManagedPropertyImage) {
    replaceTarget.current = image;
    replaceInputRef.current?.click();
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDraggingFiles(false);
    if (!disabled) void addFiles(event.dataTransfer.files);
  }

  return (
    <section aria-labelledby="property-images-heading" className="space-y-4">
      <div>
        <h3 id="property-images-heading" className="text-sm font-semibold text-navy">
          {t("admin.images.title")}
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {t("admin.images.description")}
        </p>
      </div>

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDraggingFiles(true);
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setDraggingFiles(false);
          }
        }}
        onDrop={handleDrop}
        className={`rounded-xl border-2 border-dashed p-4 text-center transition-colors sm:p-5 ${
          draggingFiles ? "border-gold bg-gold/10" : "border-slate-300 bg-slate-50/70"
        }`}
      >
        <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-white text-navy shadow-sm">
          <Upload className="h-5 w-5" aria-hidden="true" />
        </div>
        <p className="mt-2 text-sm font-medium text-navy">
          {draggingFiles ? t("admin.images.drop") : t("admin.images.choose")}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("admin.images.formats")} · {t("admin.images.maxSize")}
        </p>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className="mt-3 min-h-11"
          onClick={() => fileInputRef.current?.click()}
        >
          <ImagePlus className="mr-2 h-4 w-4" aria-hidden="true" />
          {t("admin.images.choose")}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          disabled={disabled}
          className="sr-only"
          onChange={(event) => {
            if (event.currentTarget.files) void addFiles(event.currentTarget.files);
            event.currentTarget.value = "";
          }}
        />
        <input
          ref={replaceInputRef}
          type="file"
          accept="image/*,video/*"
          className="sr-only"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (file && replaceTarget.current) {
              void addFiles([file], replaceTarget.current);
            }
            replaceTarget.current = null;
            event.currentTarget.value = "";
          }}
        />
      </div>

      {overallProgress !== null && (
        <div className="space-y-1.5" role="status" aria-live="polite">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{t("admin.images.uploading")}</span>
            <span>{t("admin.images.progress").replace("{percent}", String(overallProgress))}</span>
          </div>
          <div
            role="progressbar"
            aria-label={t("admin.images.uploading")}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={overallProgress}
            className="h-2 overflow-hidden rounded-full bg-slate-200"
          >
            <div
              className="h-full rounded-full bg-gold transition-[width] duration-150 ease-out"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>
      )}

      {images.length === 0 && (
        <div className="rounded-lg bg-slate-50 px-4 py-6 text-center text-sm text-muted-foreground">
          {t("admin.images.noImages")}
        </div>
      )}

      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((image, index) => {
            const video = isVideo(image.url);
            const task = tasks.find((item) => item.path === image.storage_path);
            const selectedCover = !video && coverUrl === image.url;
            return (
              <article
                key={image.id ?? image.storage_path ?? image.url}
                draggable={!disabled}
                onDragStart={() => setDraggedImage(index)}
                onDragEnd={() => setDraggedImage(null)}
                onDragOver={(event) => {
                  if (draggedImage !== null) event.preventDefault();
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  if (draggedImage !== null) moveImage(draggedImage, index);
                  setDraggedImage(null);
                }}
                className={`group overflow-hidden rounded-xl border bg-white shadow-sm ${
                  draggedImage === index ? "opacity-55" : ""
                }`}
              >
                <div className="relative aspect-[4/3] bg-slate-100">
                  {video ? (
                    <video
                      src={image.preview_url ?? image.url}
                      muted
                      playsInline
                      preload="metadata"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        setLightboxIndex(previewImages.indexOf(image.preview_url ?? image.url))
                      }
                      aria-label={t("property.openImagePreview")}
                      className="absolute inset-0 h-full w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold"
                    >
                      <img
                        src={image.preview_url ?? image.url}
                        alt={image.name ?? ""}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover"
                        onError={(event) => {
                          event.currentTarget.alt = t("property.imageUnavailable");
                          event.currentTarget.classList.add("opacity-0");
                        }}
                      />
                    </button>
                  )}
                  {selectedCover && (
                    <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-gold px-2.5 py-1 text-[11px] font-semibold text-navy-deep">
                      <Star className="h-3 w-3 fill-current" aria-hidden="true" />
                      {t("admin.images.cover")}
                    </span>
                  )}
                  <span className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-navy/75 text-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                    <GripVertical className="h-4 w-4" aria-hidden="true" />
                  </span>
                  {video && (
                    <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded bg-navy/80 px-2 py-1 text-[11px] text-white">
                      <Video className="h-3 w-3" aria-hidden="true" />
                      {t("admin.images.video")}
                    </span>
                  )}
                </div>
                <div className="space-y-2 p-2.5">
                  <div className="truncate text-xs font-medium text-slate-700" title={image.name}>
                    {image.name ?? `${t("admin.images.title")} ${index + 1}`}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {!video && !selectedCover && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={disabled}
                        onClick={() => onCoverChange(image.url)}
                        className="min-h-9 flex-1 px-2 text-[11px]"
                      >
                        <Star className="mr-1 h-3 w-3" aria-hidden="true" />
                        {t("admin.images.setCover")}
                      </Button>
                    )}
                    {image.id && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={disabled}
                        onClick={() => beginReplace(image)}
                        className="min-h-9 flex-1 px-2 text-[11px]"
                      >
                        <RefreshCw className="mr-1 h-3 w-3" aria-hidden="true" />
                        {t("admin.images.replace")}
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={disabled}
                      onClick={() => setImageToRemove(image)}
                      aria-label={`${t("admin.images.remove")} ${index + 1}`}
                      className="h-9 w-9 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                    <span>{task ? taskLabel(task, t) : t("admin.images.uploaded")}</span>
                    {task?.status === "uploading" && (
                      <span className="tabular-nums">{Math.round(task.progress)}%</span>
                    )}
                    {!task && <Check className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {tasks.some((task) => task.status === "failed" || task.status === "waiting") && (
        <ul className="space-y-2" aria-label={t("admin.images.title")}>
          {tasks
            .filter((task) => task.status === "failed" || task.status === "waiting")
            .map((task) => (
              <li
                key={task.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{task.file.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {task.status === "failed"
                      ? task.error || t("admin.images.uploadError")
                      : t("admin.images.waiting")}
                  </div>
                </div>
                <div className="flex gap-2">
                  {task.status === "failed" && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="min-h-9"
                      onClick={() => void retryTask(task)}
                    >
                      <RefreshCw className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                      {t("admin.images.retry")}
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    aria-label={`${t("admin.images.remove")} ${task.file.name}`}
                    onClick={() => void discardTask(task)}
                  >
                    {task.status === "uploading" ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <X className="h-4 w-4" aria-hidden="true" />
                    )}
                  </Button>
                </div>
              </li>
            ))}
        </ul>
      )}

      <AlertDialog
        open={Boolean(imageToRemove)}
        onOpenChange={(open) => !open && setImageToRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.images.remove")}</AlertDialogTitle>
            <AlertDialogDescription>{t("admin.images.deleteConfirm")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("admin.images.keepImage")}</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={isUploading}
              onClick={() => imageToRemove && void removeImage(imageToRemove)}
            >
              {t("admin.images.remove")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PropertyImageLightbox
        images={previewImages}
        title={t("admin.images.title")}
        open={lightboxIndex !== null}
        initialIndex={lightboxIndex ?? 0}
        onOpenChange={(open) => !open && setLightboxIndex(null)}
      />
    </section>
  );
}

function isVideo(url: string) {
  return /\.(mp4|webm|ogv|ogg|mov|m4v|avi|mkv)(\?|$)/i.test(url);
}

function isSameImage(left: ManagedPropertyImage, right: ManagedPropertyImage) {
  return Boolean(
    (left.id && right.id && left.id === right.id) ||
    (left.storage_path && right.storage_path && left.storage_path === right.storage_path) ||
    left.url === right.url,
  );
}

function taskLabel(task: UploadTask, t: ReturnType<typeof useLanguage>["t"]) {
  switch (task.status) {
    case "waiting":
      return t("admin.images.waiting");
    case "uploading":
      return t("admin.images.uploading");
    case "uploaded":
      return t("admin.images.uploaded");
    case "failed":
      return t("admin.images.failed");
  }
}
