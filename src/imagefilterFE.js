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

// Image input
const imageInput = document.createElement("input");
imageInput.id = "hsl-image-input";
imageInput.type = "file";
imageInput.accept = "image/*";
hslFieldset.appendChild(imageInput);

// Background removal checkbox
const bgRemovalLabel = document.createElement("label");
bgRemovalLabel.style.display = "flex";
bgRemovalLabel.style.alignItems = "center";
bgRemovalLabel.style.gap = "8px";
bgRemovalLabel.style.cursor = "pointer";

const bgRemovalCheckbox = document.createElement("input");
bgRemovalCheckbox.id = "remove-bg-checkbox";
bgRemovalCheckbox.type = "checkbox";
bgRemovalCheckbox.checked = false;
bgRemovalLabel.appendChild(bgRemovalCheckbox);

const bgRemovalText = document.createElement("span");
bgRemovalText.textContent = "Remove background";
bgRemovalLabel.appendChild(bgRemovalText);

hslFieldset.appendChild(bgRemovalLabel);

// Apply button
const applyHslBtn = document.createElement("button");
applyHslBtn.id = "apply-hsl-btn";
applyHslBtn.textContent = "Apply Filter";
applyHslBtn.style.display = "none";
hslFieldset.appendChild(applyHslBtn);

// HSL result area
const hslResultArea = document.createElement("div");
hslResultArea.id = "hsl-result-area";
hslSection.appendChild(hslResultArea);

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
    const copyBtn = document.createElement("button");
    copyBtn.textContent = "Copy Image";
    copyBtn.className = "hsl-copy-btn"; // Changed class name for clarity
    copyBtn.style.display = "block";
    copyBtn.style.margin = "16px auto";
    copyBtn.onclick = async () => { // Made async for clipboard API
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
          alert("Your browser does not support copying images to clipboard directly.");
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
