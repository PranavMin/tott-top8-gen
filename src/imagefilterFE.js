
// ============================================
// HSL IMAGE FILTER EVENT LISTENERS
// ============================================

let currentImageFile = null;

// Handle image file selection
imageInput.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (file && file.type.startsWith("image/")) {
    currentImageFile = file;
    applyHslBtn.style.display = "block";
    hslResultArea.innerHTML = "";
  } else {
    currentImageFile = null;
    applyHslBtn.style.display = "none";
    hslResultArea.innerHTML = "";
  }
});

// Apply HSL filter
applyHslBtn.addEventListener("click", async () => {
  if (!currentImageFile) {
    hslResultArea.innerText = "Please select an image first.";
    return;
  }

  applyHslBtn.disabled = true;
  hslResultArea.innerHTML = "Applying filter...";

  try {
    // Fixed HSL values: Hue 24, Saturation 26
    const hueShift = 24;
    const saturationAdjust = 26;
    const lightnessAdjust = 0;
    const removeBg = bgRemovalCheckbox.checked;

    const filteredBlob = await applyHslFilter(
      currentImageFile,
      hueShift,
      saturationAdjust,
      lightnessAdjust,
      removeBg
    );

    hslResultArea.innerHTML = "";

    // Create image preview
    const previewImg = document.createElement("img");
    previewImg.src = getBlobUrl(filteredBlob);
    previewImg.className = "hsl-preview-image";
    previewImg.style.maxWidth = "500px";
    previewImg.style.marginTop = "16px";
    hslResultArea.appendChild(previewImg);

    // Create download button
    const downloadBtn = document.createElement("button");
    downloadBtn.textContent = "Download Image";
    downloadBtn.className = "hsl-download-btn";
    downloadBtn.style.display = "block";
    downloadBtn.style.margin = "16px auto";
    downloadBtn.onclick = () => {
      const url = getBlobUrl(filteredBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `filtered-${Date.now()}.png`;
      a.click();
      revokeBlobUrl(url);
    };
    hslResultArea.appendChild(downloadBtn);
  } catch (err) {
    console.error(err);
    hslResultArea.innerText = `Error applying filter: ${err.message}`;
  } finally {
    applyHslBtn.disabled = false;
  }
});
