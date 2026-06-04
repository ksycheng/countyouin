// ============================================================
//  photoUpload.js  —  shrink + upload an image to Supabase Storage
//  Put this file in your project's  src/  folder.
//
//  Shrinks the photo in the browser BEFORE uploading (fast, cheap,
//  stays well within the free storage tier), then returns a public
//  URL you can save on a member or event.
// ============================================================
import { supabase } from "./supabaseClient.js";

// shrink an image File to maxSize px (longest edge), return a Blob
function shrinkImage(file, maxSize = 400, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = (e) => { img.src = e.target.result; };
    reader.onerror = reject;
    img.onload = () => {
      let { width, height } = img;
      if (width > height && width > maxSize) { height = height * maxSize / width; width = maxSize; }
      else if (height > maxSize) { width = width * maxSize / height; height = maxSize; }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Could not process image")), "image/jpeg", quality);
    };
    img.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Upload a member/event photo. `folder` is "members" or "events",
// `id` is that record's id. Returns the public URL (or null on failure).
export async function uploadPhoto(file, folder, id) {
  try {
    if (!file) return null;
    if (!file.type.startsWith("image/")) { alert("Please choose an image file."); return null; }

    const blob = await shrinkImage(file);
    const path = `${folder}/${id}-${Date.now()}.jpg`;

    const { error } = await supabase.storage.from("photos")
      .upload(path, blob, { contentType: "image/jpeg", upsert: true });
    if (error) { console.warn("upload failed:", error.message); alert("Could not upload photo: " + error.message); return null; }

    const { data } = supabase.storage.from("photos").getPublicUrl(path);
    return data?.publicUrl || null;
  } catch (e) {
    console.warn("photo error:", e);
    alert("Could not process that image. Try a different one.");
    return null;
  }
}
