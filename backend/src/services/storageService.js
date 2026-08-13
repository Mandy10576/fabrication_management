const { createClient } = require('@supabase/supabase-js');

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'uploads';

let client = null;
let bucketReadyPromise = null;

function getClient() {
  if (!client) {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not configured — uploads cannot be stored.');
    }
    client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false }
    });
  }
  return client;
}

/** Creates the storage bucket on first use if it doesn't already exist — a
 * public bucket, matching the previous local-disk behavior where every
 * uploaded file was reachable by its plain URL with no auth. */
async function ensureBucket() {
  if (!bucketReadyPromise) {
    bucketReadyPromise = (async () => {
      const supabase = getClient();
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();
      if (listError) throw listError;
      if (!buckets.some((b) => b.name === BUCKET)) {
        const { error: createError } = await supabase.storage.createBucket(BUCKET, { public: true });
        // A concurrent request may have created it first — ignore that race.
        if (createError && !/already exists/i.test(createError.message || '')) throw createError;
      }
    })();
  }
  return bucketReadyPromise;
}

/**
 * Uploads a buffer to Supabase Storage under `folder/filename` and returns
 * its public URL — the only thing callers persist to the database, same as
 * the old `/uploads/<filename>` relative-path convention.
 */
async function uploadFile({ buffer, filename, mimetype, folder = 'misc' }) {
  await ensureBucket();
  const supabase = getClient();
  const path = `${folder}/${filename}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType: mimetype,
    upsert: false
  });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

module.exports = { uploadFile };
