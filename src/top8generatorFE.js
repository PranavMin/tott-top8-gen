import "./index.css";
import { cleanName } from "./util.js";
import { getTop8, getEventStats} from "./api.js";
import { generateGraphic } from "./generategraphic.js";
import { createHslFilterSection } from "./imagefilterFE.js";

const STARTGG_URL = "";
const SHOW_TEST_BUTTON = false;

const MELEE_CHARACTERS = [
  "Fox",
  "Falco",
  "Marth",
  "Sheik",
  "Peach",
  "Jigglypuff",
  "Captain Falcon",
  "Donkey Kong",
  "Ice Climbers",
  "Luigi",
  "Yoshi",
  "Mario",
  "Samus",
  "Ganondorf",
  "Young Link",
  "Link",
  "Bowser",
  "Pikachu",
  "Roy",
  "Mr. Game & Watch",
  "Ness",
  "Mewtwo",
  "Pichu",
  "Dr. Mario",
  "Kirby",
  "Zelda",
];

// Custom font for graphic generation
// We want to ensure Roboto Slab is loaded before graphic generation
const ROBOTO_SLAB_FONT_FAMILY = "'Roboto Slab'";
const fontLoadPromise = document.fonts.load(`44px ${ROBOTO_SLAB_FONT_FAMILY}`);

// FIELDSET
const fetTop8Fieldset = document.createElement("fieldset");
fetTop8Fieldset.role = "group";
fetTop8Fieldset.id = "top8-fieldset";
fetTop8Fieldset.className = "top8-fieldset";
document.body.appendChild(fetTop8Fieldset);

// INPUT - Start GG event URL
const startggInput = document.createElement("input");
startggInput.id = "startgg-input";
startggInput.placeholder =
  "Paste start.gg event URL or tournament/.../event/...";
startggInput.value = STARTGG_URL; // prefill with example
fetTop8Fieldset.appendChild(startggInput);

// BUTTON - Fetch Top 8
const fetchTop8Btn = document.createElement("button");
fetchTop8Btn.id = "fetch-top8-btn";
fetchTop8Btn.textContent = "Fetch";
fetTop8Fieldset.appendChild(fetchTop8Btn);

// WARN / STATUS AREA and RESULTS CONTAINER
const container = document.createElement("div");
container.id = "top8-container";
document.body.appendChild(container);

// BUTTON - Generate Graphic
const generateGraphicBtn = document.createElement("button");
generateGraphicBtn.id = "generate-graphic-btn";
generateGraphicBtn.textContent = "Generate Graphic";
generateGraphicBtn.style.display = "none"; // hidden until successful fetch/render
document.body.appendChild(generateGraphicBtn);

// area where generated canvas / download link will be placed
const top8GraphicArea = document.createElement("div");
top8GraphicArea.id = "graphic-area";
// center canvas and buttons inside this area
document.body.appendChild(top8GraphicArea);

// Append the HSL filter section after the main graphic generator elements
// center canvas and buttons inside this area
document.body.appendChild(top8GraphicArea);


// add a test button to generate graphic from dummy data
if (SHOW_TEST_BUTTON) {
  const testBtn = document.createElement("button");
  testBtn.id = "test-graphic-btn";
  testBtn.textContent = "Test Graphic (Dummy Data)";
  document.body.appendChild(testBtn);

  // wire up the test button to use dummy data for quick testing
  testBtn.addEventListener("click", async () => {
    const dummy = [
      { place: "1", name: "Lucky", character: "Fox", icon: null },
      { place: "2", name: "Mango", character: "Falco", icon: null },
      { place: "3", name: "Mew2King", character: "Marth", icon: null },
      { place: "4", name: "PPMD", character: "Sheik", icon: null },
      { place: "5", name: "Armada", character: "Peach", icon: null },
      { place: "6", name: "Hbox", character: "Jigglypuff", icon: null },
      { place: "7", name: "Wizzrobe", character: "Captain Falcon", icon: null },
      { place: "8", name: "Axe", character: "Pikachu", icon: null },
    ];

    await handleGraphicGeneration(dummy);
  });
}

async function handleGraphicGeneration(entries) {
  await fontLoadPromise; // Ensure the custom font is loaded before generating the graphic
  top8GraphicArea.innerHTML = "Generating...";

  try {
    const canvas = await generateGraphic(entries); // No need to pass customFontFamily anymore
    top8GraphicArea.innerHTML = "";
    top8GraphicArea.appendChild(canvas);

    // copy to clipboard button
    const copyBtn = document.createElement("button");
    copyBtn.textContent = "Copy to Clipboard";
    copyBtn.className = "copy-btn";
    copyBtn.onclick = () => {
      canvas.toBlob((blob) => {
        navigator.clipboard
          .write([new ClipboardItem({ "image/png": blob })])
          .then(() => {
            copyBtn.textContent = "Copied!";
            setTimeout(() => (copyBtn.textContent = "Copy to Clipboard"), 2000);
          });
      });
    };
    top8GraphicArea.appendChild(copyBtn);

    // persist mapping of cleaned player name -> character for future autocomplete
    let map = {};
    try {
      map = JSON.parse(localStorage.getItem("character-cache") || "{}");
    } catch (e) {
      console.warn("Could not read existing cache, starting fresh.", e);
    }

    entries.forEach((e) => {
      if (e.name && e.character) {
        map[cleanName(e.name)] = e.character;
      }
    });
    localStorage.setItem("character-cache", JSON.stringify(map));
  } catch (err) {
    console.error(err);
    top8GraphicArea.innerText = "Error generating graphic: " + err.message;
  }
}

fetchTop8Btn.addEventListener("click", async () => {
  fetchTop8Btn.disabled = true;

  fetchTop8Btn.ariaBusy = "true";
  fetchTop8Btn.textContent = "Fetching...";
  generateGraphicBtn.style.display = "none";
  top8GraphicArea.innerHTML = "";

  // validate input contains "event"
  const raw = (startggInput.value || "").trim();
  const url = raw || STARTGG_URL;
  if (
    !url.toLowerCase().includes("event") ||
    !url.toLowerCase().includes("tournament")
  ) {
    container.innerText =
      'Invalid link: please provide a start.gg URL or slug that contains "tournament/.../event/".';
    fetchTop8Btn.disabled = false;
    startggInput.ariaInvalid = "true"; // Indicate invalid input
    fetchTop8Btn.ariaBusy = "false";
    fetchTop8Btn.textContent = "Fetch";
    return;
  }

  startggInput.ariaInvalid = "false"; // Reset to valid if validation passes

  try {
    const nodes = await getTop8(url); // This fetches the top 8 players
    const stats = await getEventStats(url); // This fetches the attendee count

    if (nodes && nodes.length) {
      // render editable inputs + character dropdown for each player
      fetchTop8Btn.textContent = "Fetched!";
      container.innerHTML = "";

      // Display event stats if available
      // Assuming stats is now an object like { nonDQAttendees: 100, nonDQSets: 500 }
      if (stats && (stats.nonDQAttendees !== null || stats.nonDQSets !== null)) {
        const statsDiv = document.createElement("div");
        statsDiv.className = "event-stats"; // Add a class for potential styling
        statsDiv.textContent = `Attendees: ${stats.nonDQAttendees ?? 'N/A'}, Sets: ${stats.nonDQSets ?? 'N/A'}`;
        container.appendChild(statsDiv);
      }
      // load persisted cache (player name -> character)
      let cache = {};
      try {
        cache = JSON.parse(localStorage.getItem("character-cache") || "{}");
      } catch (e) {
        console.warn("Invalid character cache, ignoring.", e);
      }

      const sorted = nodes
        .slice()
        .sort((a, b) => (a.placement ?? 0) - (b.placement ?? 0))
        .slice(0, 8);

      sorted.forEach((n) => {
        const placement = n.placement ?? "";
        const rawName = n.entrant?.name ?? "Unknown";

        const row = document.createElement("div");
        row.className = "top8-row";

        const placelabel = document.createElement("div");
        placelabel.textContent = `${placement}.`;

        const nameInput = document.createElement("input");
        nameInput.type = "text";
        nameInput.value = cleanName(rawName);

        const charSelect = document.createElement("select");
        const defaultOption = document.createElement("option");
        defaultOption.value = "";
        defaultOption.textContent = "Select character";
        charSelect.appendChild(defaultOption);

        MELEE_CHARACTERS.forEach((c) => {
          const opt = document.createElement("option");
          opt.value = c;
          opt.textContent = c;
          charSelect.appendChild(opt);
        });

        // if we have a cached character for this player, set it as the default
        try {
          const key = cleanName(rawName);
          if (cache && cache[key]) {
            charSelect.value = cache[key];
          }
        } catch (e) {
          // ignore cache lookup errors
        }

        row.appendChild(placelabel);
        row.appendChild(nameInput);
        row.appendChild(charSelect);

        container.appendChild(row);
      });
      // enable generate button when rows are present
      generateGraphicBtn.style.display = "block";
    } else {
      container.innerText = "No standings returned.";
      fetchTop8Btn.ariaBusy = "false";
      startggInput.ariaInvalid = "true";
      fetchTop8Btn.textContent = "Fetch";
    }
  } catch (err) {
    console.error(err);
    container.innerText = "Error fetching top 8.";
    fetchTop8Btn.ariaBusy = "false";
    fetchTop8Btn.textContent = "Fetch";
  } finally {
    fetchTop8Btn.disabled = false;
    fetchTop8Btn.ariaBusy = "false";
  }
});

// update existing generate button to use the refactored function
generateGraphicBtn.addEventListener("click", async () => {
  const rows = Array.from(container.querySelectorAll(".top8-row"));
  if (!rows.length) {
    top8GraphicArea.innerText = "No rows to generate from.";
    return;
  }

  // ensure there's a persistent error element (inserted above the container)
  let errorDiv = document.getElementById("top8-error");
  if (!errorDiv) {
    errorDiv = document.createElement("div");
    errorDiv.id = "top8-error";
    // insert above the container so we don't remove the rows when showing messages
    container.parentNode.insertBefore(errorDiv, container);
  }
  // clear previous error text
  errorDiv.textContent = "";

  // clear previous visual warnings on selects/inputs
  rows.forEach((r) => {
    const sel = r.querySelector("select");
    const inp = r.querySelector("input");
    if (sel) {
      sel.classList.remove("input-error");
    }
    if (inp) {
      inp.classList.remove("input-error-subtle");
    }
    r.classList.remove("missing-character");
  });

  // find first row with missing character selection
  const missingIndex = rows.findIndex((r) => {
    return !(r.querySelector("select")?.value || "").trim();
  });

  if (missingIndex !== -1) {
    const missingRow = rows[missingIndex];
    const sel = missingRow.querySelector("select");
    const inp = missingRow.querySelector("input");
    if (sel) {
      // visually indicate the missing selection and focus it
      sel.classList.add("input-error");
      sel.focus();
    }
    if (inp) {
      // also subtly highlight the name input so the whole row is obvious
      inp.classList.add("input-error-subtle");
    }

    missingRow.classList.add("missing-character");

    errorDiv.textContent =
      "Please select a character for every player before generating the graphic.";
    // bring the missing row into view
    missingRow.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  const entries = rows.map((r) => {
    const place = r.children[0]?.textContent?.replace(".", "")?.trim() || "";
    const name = (r.querySelector("input")?.value || "").trim() || "Unknown";
    const character = (r.querySelector("select")?.value || "").trim();
    return { place, name, character, icon: null };
  });

  // clear any previous status message (errorDiv used instead of replacing container)
  errorDiv.textContent = "";

  await handleGraphicGeneration(entries);
});

const hslFilterSection = createHslFilterSection();
document.body.appendChild(hslFilterSection);
