import { applyHslFilter, getBlobUrl, revokeBlobUrl } from "./filter.js";

// Encapsulate the entire HSL filter section creation and logic
export function createHslFilterSection() {
  // ============================================
  // HSL IMAGE FILTER SECTION UI CREATION
  // ============================================
  const hslSection = document.createElement("section");
  hslSection.id = "hsl-filter-section";
  hslSection.className = "hsl-filter-section";

  const hslTitle = document.createElement("h2");
  hslTitle.textContent = "Image Filter";
  hslSection.appendChild(hslTitle);

  const hslFieldset = document.createElement("fieldset");
  hslFieldset.id = "hsl-fieldset";
  hslFieldset.role = "group";
  hslSection.appendChild(hslFieldset);

  // Paste Box (replaces file input)
  const pasteBox = document.createElement("div");
  pasteBox.id = "hsl-paste-box";
  pasteBox.textContent = "Click to Paste Image or Ctrl+V";
  pasteBox.className = "hsl-paste-box";
  // Basic styling for the paste box
  pasteBox.style.border = "2px dashed #ccc";
  pasteBox.style.borderRadius = "8px";
  pasteBox.style.padding = "20px";
  pasteBox.style.textAlign = "center";
  pasteBox.style.minHeight = "150px";
  pasteBox.style.display = "flex";
  pasteBox.style.alignItems = "center";
  pasteBox.style.justifyContent = "center";
  pasteBox.style.marginBottom = "16px";
  pasteBox.style.cursor = "pointer";
  pasteBox.style.backgroundColor = "#1b006358";
  pasteBox.style.color = "#666";
  hslFieldset.appendChild(pasteBox);

  // Apply button
  const applyHslBtn = document.createElement("button");
  applyHslBtn.id = "apply-hsl-btn";
  applyHslBtn.textContent = "Apply Filter";
  applyHslBtn.style.display = "none";
  applyHslBtn.style.backgroundColor = "#00895a";
  applyHslBtn.style.color = "white";
  applyHslBtn.style.margin = "0 auto";
  hslFieldset.appendChild(applyHslBtn);

  // Background removal checkbox
  const bgRemovalLabel = document.createElement("label");
  bgRemovalLabel.style.display = "none";
  bgRemovalLabel.style.alignItems = "center";
  bgRemovalLabel.style.justifyContent = "center";
  bgRemovalLabel.style.gap = "8px";
  bgRemovalLabel.style.cursor = "pointer";
  bgRemovalLabel.style.margin = "8px auto";
  bgRemovalLabel.style.width = "fit-content";

  const bgRemovalCheckbox = document.createElement("input");
  bgRemovalCheckbox.id = "remove-bg-checkbox";
  bgRemovalCheckbox.type = "checkbox";
  bgRemovalCheckbox.checked = false;
  bgRemovalLabel.appendChild(bgRemovalCheckbox);

  const bgRemovalText = document.createElement("span");
  bgRemovalText.textContent = "Remove background";
  bgRemovalLabel.appendChild(bgRemovalText);

  hslFieldset.appendChild(bgRemovalLabel);

  // HSL result area
  const hslResultArea = document.createElement("div");
  hslResultArea.id = "hsl-result-area";
  hslSection.appendChild(hslResultArea);

  // ============================================
  // HSL IMAGE FILTER EVENT LISTENERS
  // ============================================

  let currentImageFile = null;
  let sourcePreviewUrl = null; // URL for the input image preview
  let resultPreviewUrl = null; // URL for the filtered result image

  const handleFileSelection = (file) => {
    if (sourcePreviewUrl) revokeBlobUrl(sourcePreviewUrl);
    
    currentImageFile = file;
    applyHslBtn.style.display = "block";
    bgRemovalLabel.style.display = "flex";
    
    // Clear previous result
    hslResultArea.innerHTML = "";
    if (resultPreviewUrl) {
      revokeBlobUrl(resultPreviewUrl);
      resultPreviewUrl = null;
    }

    // Show preview in paste box
    pasteBox.innerHTML = "";
    const previewImg = document.createElement("img");
    sourcePreviewUrl = URL.createObjectURL(file);
    previewImg.src = sourcePreviewUrl;
    previewImg.style.maxWidth = "100%";
    previewImg.style.maxHeight = "300px";
    previewImg.style.display = "block";
    pasteBox.appendChild(previewImg);
  };

  // Handle click to paste from clipboard
  pasteBox.addEventListener("click", async () => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        const imageType = item.types.find((type) => type.startsWith("image/"));
        if (imageType) {
          const blob = await item.getType(imageType);
          handleFileSelection(blob);
          return;
        }
      }
      alert("No image found in clipboard.");
    } catch (err) {
      alert("Failed to read clipboard. Please allow permissions or use Ctrl+V.");
    }
  });

  // Handle pasting images from clipboard
  hslSection.addEventListener("paste", (e) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        const imageFile = items[i].getAsFile();
        if (imageFile) {
          handleFileSelection(imageFile);
          e.preventDefault(); // Prevent default paste behavior (e.g., pasting text)
          return; // Process only the first image found
        }
      }
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

    // Revoke the current preview URL if it exists, as it's about to be replaced by the filtered image
    if (resultPreviewUrl) {
      revokeBlobUrl(resultPreviewUrl);
      resultPreviewUrl = null; // Reset it
    }
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
        removeBg,
      );

      hslResultArea.innerHTML = "";

      // Create image preview
      const previewImg = document.createElement("img");
      resultPreviewUrl = getBlobUrl(filteredBlob); // Store the URL for the filtered image
      previewImg.src = resultPreviewUrl;
      previewImg.className = "hsl-preview-image";
      // previewImg.style.maxWidth = "500px";
      previewImg.style.marginTop = "16px";
      hslResultArea.appendChild(previewImg);

      // Create download button
      const copyBtn = document.createElement("button");
      copyBtn.textContent = "Copy Image";
      copyBtn.className = "hsl-copy-btn"; // Changed class name for clarity
      copyBtn.style.display = "block";
      copyBtn.style.margin = "16px auto";
      copyBtn.onclick = async () => {
        // Made async for clipboard API
        try {
          // Check if the Clipboard API is available and permission is granted
          if (navigator.clipboard && navigator.clipboard.write) {
            await navigator.clipboard.write([
              new ClipboardItem({
                [filteredBlob.type]: filteredBlob,
              }),
            ]);
            copyBtn.textContent = "Copied!";
            setTimeout(() => (copyBtn.textContent = "Copy Image"), 2000);
          } else {
            alert(
              "Your browser does not support copying images to clipboard directly.",
            );
          }
        } catch (err) {
          console.error("Failed to copy image: ", err);
          alert(`Failed to copy image: ${err.message}`);
        }
      };
      hslResultArea.appendChild(copyBtn); // Appended the new copy button
    } catch (err) {
      console.error(err);
      hslResultArea.innerText = `Error applying filter: ${err.message}`;
    } finally {
      applyHslBtn.disabled = false;
    }
  });

  return hslSection; // Return the created section
}
