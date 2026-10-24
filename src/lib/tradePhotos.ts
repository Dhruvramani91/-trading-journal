import { supabase, isSupabaseConfigured } from '@/lib/supabase';

const BUCKET = 'trade-photos';
const SIGNED_URL_EXPIRES_IN = 60 * 60; // 1 hour

export type TradePhotoSlot = 'htf' | 'itf' | 'ltf' | `image${number}`;

export interface TradePhotos {
  htf?: string;
  itf?: string;
  ltf?: string;
  /** Additional image slots after the original three. */
  additional?: string[];
}

const BASE_PHOTO_SLOTS = ['htf', 'itf', 'ltf'] as const;

function photoEntries(photos: TradePhotos | undefined): [TradePhotoSlot, string | undefined][] {
  if (!photos) return [];
  return [
    ...BASE_PHOTO_SLOTS.map((slot) => [slot, photos[slot]] as [TradePhotoSlot, string | undefined]),
    ...(photos.additional ?? []).map((value, index) => [`image${index + 4}`, value] as [TradePhotoSlot, string | undefined]),
  ];
}

function setPhoto(photos: TradePhotos, slot: TradePhotoSlot, value: string): void {
  if (slot === 'htf' || slot === 'itf' || slot === 'ltf') photos[slot] = value;
  else {
    const index = Number(slot.slice(5)) - 4;
    photos.additional ??= [];
    photos.additional[index] = value;
  }
}

function assertConfigured() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(
      'Supabase is not configured. Check your Supabase environment variables.'
    );
  }
}

function isMissingStorageObject(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const storageError = error as {
    status?: number;
    statusCode?: string;
    message?: string;
  };

  return (
    storageError.status === 404 ||
    storageError.statusCode === '404' ||
    /object (was )?not found/i.test(storageError.message ?? '')
  );
}

function isDataUrl(value: string): boolean {
  return value.startsWith('data:image/');
}

function isStoragePath(value: string): boolean {
  return (
    value.length > 0 &&
    !value.startsWith('data:') &&
    !value.startsWith('http://') &&
    !value.startsWith('https://')
  );
}

function isOwnedTradePhotoPath(
  value: string,
  userId: string,
  expectedTradeId?: string,
): boolean {
  const [ownerId, tradeId, fileName, ...rest] = value.split('/');
  const uuid = '[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';

  return (
    rest.length === 0 &&
    ownerId === userId &&
    (expectedTradeId === undefined || tradeId === expectedTradeId) &&
    new RegExp(`^${uuid}$`, 'i').test(tradeId ?? '') &&
    new RegExp(`^(htf|itf|ltf|image[4-9][0-9]*)-${uuid}\\.(jpg|png|webp|gif|bmp)$`, 'i').test(fileName ?? '')
  );
}

function extensionFromMimeType(
  mimeType: string,
): string {
  switch (mimeType) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/gif':
      return 'gif';
    case 'image/bmp':
      return 'bmp';
    default:
      return 'jpg';
  }
}

async function dataUrlToBlob(
  dataUrl: string,
): Promise<Blob> {
  const response = await fetch(dataUrl);
  return response.blob();
}

async function getCurrentUserId(): Promise<string> {
  assertConfigured();

  const { data, error } =
    await supabase!.auth.getUser();

  if (error) {
    throw new Error(
      `Unable to get authenticated user: ${error.message}`,
    );
  }

  if (!data.user) {
    throw new Error('No authenticated user.');
  }

  return data.user.id;
}

export async function uploadTradePhoto(
  tradeId: string,
  slot: TradePhotoSlot,
  dataUrl: string,
): Promise<string> {
  assertConfigured();

  if (!isDataUrl(dataUrl)) {
    throw new Error(
      'Trade photo upload expected an image data URL.',
    );
  }

  const userId = await getCurrentUserId();

  const blob = await dataUrlToBlob(dataUrl);

  const extension = extensionFromMimeType(
    blob.type,
  );

  const path =
    `${userId}/${tradeId}/${slot}-${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase!.storage
    .from(BUCKET)
    .upload(path, blob, {
      contentType: blob.type,
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    throw new Error(
      `Trade photo upload failed: ${error.message}`,
    );
  }

  return path;
}

export async function persistTradePhotos(
  tradeId: string,
  photos: TradePhotos | undefined,
): Promise<TradePhotos> {
  if (!photos) {
    return {};
  }

  const result: TradePhotos = {};

  for (const [slot, value] of photoEntries(photos)) {

    if (!value) {
      continue;
    }

    if (isDataUrl(value)) {
      setPhoto(result, slot, await uploadTradePhoto(tradeId, slot, value));
      continue;
    }

    setPhoto(result, slot, value);
  }

  return result;
}

export async function deleteTradePhoto(
  value: string | undefined,
): Promise<void> {
  if (
    !value ||
    value.startsWith('data:') ||
    value.startsWith('http://') ||
    value.startsWith('https://')
  ) {
    return;
  }

  assertConfigured();
  const userId = await getCurrentUserId();

  // Only delete objects matching our user/trade/slot-UUID filename layout.
  if (!isStoragePath(value) || !isOwnedTradePhotoPath(value, userId)) {
    return;
  }

  const { error } = await supabase!.storage
    .from(BUCKET)
    .remove([value]);

  if (error && !isMissingStorageObject(error)) {
    throw new Error(
      `Trade photo deletion failed: ${error.message}`,
    );
  }
}

export async function deleteTradePhotosForTrade(
  tradeId: string,
  photos: TradePhotos | undefined,
): Promise<void> {
  if (!photos) return;

  const candidates = photoEntries(photos)
    .map(([, value]) => value)
    .filter(
      (value): value is string =>
        typeof value === 'string' && value.length > 0 && isStoragePath(value),
    );
  if (candidates.length === 0) return;

  assertConfigured();
  const userId = await getCurrentUserId();
  const paths = candidates.filter((value) =>
    isOwnedTradePhotoPath(value, userId, tradeId),
  );
  if (paths.length === 0) return;

  const { error } = await supabase!.storage
    .from(BUCKET)
    .remove(paths);

  if (error && !isMissingStorageObject(error)) {
    throw new Error(
      `Trade photo deletion failed: ${error.message}`,
    );
  }
}

export async function persistEditedTradePhotos(
  tradeId: string,
  previousPhotos: TradePhotos | undefined,
  nextPhotos: TradePhotos | undefined,
  savePhotos: (photos: TradePhotos) => Promise<unknown>,
): Promise<TradePhotos> {
  const persisted: TradePhotos = {};
  const uploadedPaths: string[] = [];
  let saveStarted = false;

  try {
    const slots = new Set(photoEntries(previousPhotos).concat(photoEntries(nextPhotos)).map(([slot]) => slot));
    for (const slot of slots) {
      const previous = photoEntries(previousPhotos).find(([candidate]) => candidate === slot)?.[1] || undefined;
      const next = photoEntries(nextPhotos).find(([candidate]) => candidate === slot)?.[1] || undefined;

      if (previous === next) {
        if (previous) setPhoto(persisted, slot, previous);
        continue;
      }

      if (!next) continue;

      const savedValue = isDataUrl(next)
        ? await uploadTradePhoto(tradeId, slot, next)
        : next;

      if (savedValue) {
        setPhoto(persisted, slot, savedValue);
        if (isDataUrl(next)) uploadedPaths.push(savedValue);
      }
    }

    saveStarted = true;
    await savePhotos(persisted);
  } catch (error) {
    // Before the DB update starts, uploaded replacements cannot be referenced
    // by the trade and can be safely cleaned up. Once it starts, its outcome
    // may be ambiguous (for example, a lost response), so retain new objects.
    if (!saveStarted) {
      await Promise.allSettled(uploadedPaths.map(deleteTradePhoto));
    }
    throw error;
  }

  for (const [slot, previous] of photoEntries(previousPhotos)) {
    const current = photoEntries(persisted).find(([candidate]) => candidate === slot)?.[1];
    if (previous && previous !== current) {
      await deleteTradePhoto(previous);
    }
  }

  return persisted;
}

export async function resolveTradePhotoUrl(
  value: string | undefined,
): Promise<string | undefined> {
  if (!value) {
    return undefined;
  }

  // Legacy photos stored as Base64 data URLs.
  if (isDataUrl(value)) {
    return value;
  }

  // Legacy/external URLs.
  if (
    value.startsWith('http://') ||
    value.startsWith('https://')
  ) {
    return value;
  }

  // New private Supabase Storage path.
  if (isStoragePath(value)) {
    assertConfigured();

    const { data, error } =
      await supabase!.storage
        .from(BUCKET)
        .createSignedUrl(
          value,
          SIGNED_URL_EXPIRES_IN,
        );

    if (error) {
      throw new Error(
        `Unable to create trade photo URL: ${error.message}`,
      );
    }

    return data.signedUrl;
  }

  return undefined;
}
