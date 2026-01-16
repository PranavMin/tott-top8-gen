import "./index.css";
import { extractSlug, cleanName } from "./util.js";
import { getTop8 } from "./api.js";
import { loadCharacterIcon } from "./icon.js";
import { generateGraphic } from "./generategraphic.js";

// removed automatic fetch-on-load and add UI to fetch/render on button click
const STARTGG_URL = "";
const SHOW_TEST_BUTTON = true;

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

// INPUT - Start GG event URL
const input = document.createElement("input");
input.id = "startgg-input";
input.placeholder = "Paste start.gg event URL or tournament/.../event/...";
input.value = STARTGG_URL; // prefill with example
document.body.appendChild(input);

// BUTTON - Fetch Top 8
const btn = document.createElement("button");
btn.id = "fetch-top8-btn";
btn.textContent = "Fetch Top 8";
document.body.appendChild(btn);

// WARN / STATUS AREA and RESULTS CONTAINER
const container = document.createElement("div");
container.id = "top8-container";
document.body.appendChild(container);

// BUTTON - Generate Graphic
const genBtn = document.createElement("button");
genBtn.id = "generate-graphic-btn";
genBtn.textContent = "Generate Graphic";
genBtn.disabled = true; // enabled after successful fetch/render
document.body.appendChild(genBtn);

// area where generated canvas / download link will be placed
const graphicArea = document.createElement("div");
graphicArea.id = "graphic-area";
// center canvas and buttons inside this area
document.body.appendChild(graphicArea);

// add a checkbox to toggle a border around the generated image
const borderLabel = document.createElement("label");
borderLabel.className = "border-label";

const borderChk = document.createElement("input");
borderChk.type = "checkbox";
borderChk.id = "add-border-chk";

borderLabel.appendChild(borderChk);
borderLabel.appendChild(document.createTextNode("Add border"));

// place the checkbox underneath the generate button but above the canvas
// insert before the graphic area so it shows above whatever canvas will be appended there
document.body.insertBefore(borderLabel, graphicArea);

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
  const addBorder = !!document.getElementById("add-border-chk")?.checked;
  graphicArea.innerHTML = "Generating...";

  try {
    const canvas = await generateGraphic(entries, { addBorder });
    graphicArea.innerHTML = "";
    graphicArea.appendChild(canvas);

    // download button
    const dl = document.createElement("a");
    dl.textContent = "Download PNG";
    dl.className = "download-btn";
    dl.href = canvas.toDataURL("image/png");
    dl.download = "top8.png";
    graphicArea.appendChild(dl);

    // persist mapping of cleaned player name -> character for future autocomplete
    const map = {};
    entries.forEach((e) => {
      if (e.name && e.character) {
        map[cleanName(e.name)] = e.character;
      }
    });
    localStorage.setItem("character-cache", JSON.stringify(map));
  } catch (err) {
    console.error(err);
    graphicArea.innerText = "Error generating graphic: " + err.message;
  }
}

btn.addEventListener("click", async () => {
  btn.disabled = true;
  container.textContent = "Loading...";
  genBtn.disabled = true;
  graphicArea.innerHTML = "";

  // validate input contains "event"
  const raw = (input.value || "").trim();
  const url = raw || STARTGG_URL;
  if (!url.toLowerCase().includes("event")) {
    container.innerText =
      'Invalid link: please provide a start.gg URL or slug that contains "event".';
    btn.disabled = false;
    return;
  }

  try {
    const nodes = await getTop8(url);

    if (nodes && nodes.length) {
      // render editable inputs + character dropdown for each player

      container.innerHTML = "";

      // load persisted cache (player name -> character)
      const cache = JSON.parse(localStorage.getItem("character-cache") || "{}");

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
      genBtn.disabled = false;
    } else {
      container.innerText = "No standings returned.";
    }
  } catch (err) {
    console.error(err);
    container.innerText = "Error fetching top 8.";
  } finally {
    btn.disabled = false;
  }
});

// update existing generate button to use the refactored function
genBtn.addEventListener("click", async () => {
  const rows = Array.from(container.querySelectorAll(".top8-row"));
  if (!rows.length) {
    graphicArea.innerText = "No rows to generate from.";
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
