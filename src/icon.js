// new helpers: map character -> asset filename and preload icon
export function cleanedIconBase(name) {
  if (!name) return null;
  // remove periods and spaces, keep ampersands and letters intact to match filenames like "MrGame&WatchHeadSSBM.png"
  return name.replace(/\./g, "").replace(/\s+/g, "");
}

export function loadCharacterIcon(character) {
  return new Promise((resolve) => {
    if (!character) return resolve(null);
    const base = cleanedIconBase(character);
    if (!base) return resolve(null);
    const filename = `${base}HeadSSBM.png`;
    // resolve relative to this module so Vite will handle the asset path
    const url = new URL(`../assets/stockicons/${filename}`, import.meta.url)
      .href;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}