/**
 * This file will automatically be loaded by vite and run in the "renderer" context.
 * To learn more about the differences between the "main" and the "renderer" context in
 * Electron, visit:
 *
 * https://electronjs.org/docs/tutorial/process-model
 *
 * By default, Node.js integration in this file is disabled. When enabling Node.js integration
 * in a renderer process, please be aware of potential security implications. You can read
 * more about security risks here:
 *
 * https://electronjs.org/docs/tutorial/security
 *
 * To enable Node.js integration in this file, open up `main.js` and enable the `nodeIntegration`
 * flag:
 *
 * ```
 *  // Create the browser window.
 *  mainWindow = new BrowserWindow({
 *    width: 800,
 *    height: 600,
 *    webPreferences: {
 *      nodeIntegration: true
 *    }
 *  });
 * ```
 */

import './index.css';



function extractSlug(input) {
    // If they paste the whole URL, strip the domain
    if (input.includes('start.gg/')) {
        return input.split('start.gg/')[1].split('/overview')[0]; 
    }
    // If they just typed 'tournament/name/event/game', return as is
    return input;
}

async function getTop8(eventUrl) {
    const apiKey = import.meta.env.VITE_STARTGG_KEY;

    if (!apiKey) {
        console.error("API Key missing! Check your .env file.");
        return;
    }

    const eventSlug = extractSlug(eventUrl);
    const query = `query EventStandings($slug: String) {
        event(slug: $slug) {
            standings(query: { perPage: 8, page: 1 }) {
                nodes {
                    placement
                    entrant { name }
                }
            }
        }
    }`;

    const response = await fetch('https://api.start.gg/gql/alpha', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            query,
            variables: { slug: eventSlug }
        })
    });
    const data = await response.json();
    return data.data.event.standings.nodes;
}

// removed automatic fetch-on-load and add UI to fetch/render on button click
const STARTGG_URL = '';

// input for user to paste start.gg link
const input = document.createElement('input');
input.id = 'startgg-input';
input.placeholder = 'Paste start.gg event URL or tournament/.../event/...';
input.style.width = '100%';
input.style.maxWidth = '1008px'; // 40% larger than previous 720px
input.style.marginBottom = '8px';
input.value = STARTGG_URL; // prefill with example
document.body.appendChild(input);

// fetch button (placed directly under input, above player list)
const btn = document.createElement('button');
btn.id = 'fetch-top8-btn';
btn.textContent = 'Fetch Top 8';
btn.style.display = 'block';
btn.style.marginTop = '8px';
btn.style.width = '100%';
btn.style.maxWidth = '1008px'; // match input width (40% larger)
document.body.appendChild(btn);

// warning / status area (reused for results)
const container = document.createElement('div');
container.id = 'top8-container';
container.style.whiteSpace = 'pre-wrap'; // keep newlines
container.style.marginTop = '8px';
document.body.appendChild(container);

// new button to generate graphic from the editable form
const genBtn = document.createElement('button');
genBtn.id = 'generate-graphic-btn';
genBtn.textContent = 'Generate Graphic';
genBtn.style.display = 'block';
genBtn.style.marginTop = '8px';
genBtn.style.width = '100%';
genBtn.style.maxWidth = '1008px';
genBtn.disabled = true; // enabled after successful fetch/render
document.body.appendChild(genBtn);

// area where generated canvas / download link will be placed
const graphicArea = document.createElement('div');
graphicArea.id = 'graphic-area';
graphicArea.style.marginTop = '12px';
document.body.appendChild(graphicArea);

btn.addEventListener('click', async () => {
    btn.disabled = true;
    container.textContent = 'Loading...';
    genBtn.disabled = true;
    graphicArea.innerHTML = '';

    // validate input contains "event"
    const raw = (input.value || '').trim();
    const url = raw || STARTGG_URL;
    if (!url.toLowerCase().includes('event')) {
        container.innerText = 'Invalid link: please provide a start.gg URL or slug that contains "event".';
        btn.disabled = false;
        return;
    }

    // helper to strip everything before and including the pipe
    function cleanName(name) {
        if (!name) return 'Unknown';
        const parts = name.split('|');
        return parts[parts.length - 1].trim();
    }

    try {
        const nodes = await getTop8(url);

        if (nodes && nodes.length) {
            // render editable inputs + character dropdown for each player
            const MELEE_CHARACTERS = [
                "Fox","Falco","Marth","Sheik","Peach","Jigglypuff","Captain Falcon",
                "Ice Climbers","Samus","Ganondorf","Young Link","Link","Luigi",
                "Mario","Bowser","Yoshi","Pikachu","Roy","Mr. Game & Watch",
                "Ness","Mewtwo","Pichu","Dr. Mario","Donkey Kong","Kirby","Zelda"
            ];

            container.innerHTML = '';

            const sorted = nodes
                .slice()
                .sort((a, b) => (a.placement ?? 0) - (b.placement ?? 0))
                .slice(0, 8);

            sorted.forEach((n) => {
                const placement = n.placement ?? '';
                const rawName = n.entrant?.name ?? 'Unknown';

                const row = document.createElement('div');
                row.className = 'top8-row';
                row.style.display = 'flex';
                row.style.alignItems = 'center';
                row.style.gap = '8px';
                row.style.marginBottom = '6px';

                const placelabel = document.createElement('div');
                placelabel.textContent = `${placement}.`;
                placelabel.style.width = '20px';
                placelabel.style.flex = '0 0 auto';

                const nameInput = document.createElement('input');
                nameInput.type = 'text';
                nameInput.value = (function cleanName(name) {
                    if (!name) return 'Unknown';
                    const parts = name.split('|');
                    return parts[parts.length - 1].trim();
                })(rawName);
                nameInput.style.flex = '1';
                nameInput.style.minWidth = '10px';

                const charSelect = document.createElement('select');
                const defaultOption = document.createElement('option');
                defaultOption.value = '';
                defaultOption.textContent = 'Select character';
                charSelect.appendChild(defaultOption);

                MELEE_CHARACTERS.forEach(c => {
                    const opt = document.createElement('option');
                    opt.value = c;
                    opt.textContent = c;
                    charSelect.appendChild(opt);
                });

                charSelect.style.flex = '0 0 300px';

                row.appendChild(placelabel);
                row.appendChild(nameInput);
                row.appendChild(charSelect);

                container.appendChild(row);
            });
            // enable generate button when rows are present
            genBtn.disabled = false;
         } else {
             container.innerText = 'No standings returned.';
         }
     } catch (err) {
         console.error(err);
         container.innerText = 'Error fetching top 8.';
     } finally {
         btn.disabled = false;
     }
});
 
// helper: create a simple initials badge for a character name
function charInitials(name) {
    if (!name) return '?';
    const parts = name.replace(/&/g, ' ').split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
}

// Generate graphic from the editable rows
genBtn.addEventListener('click', () => {
    graphicArea.innerHTML = '';
    const rows = Array.from(container.querySelectorAll('.top8-row'));
    if (!rows.length) {
        graphicArea.innerText = 'No rows to generate from.';
        return;
    }

    const entries = rows.map(r => {
        const place = r.children[0]?.textContent?.replace('.', '')?.trim() || '';
        const name = (r.querySelector('input')?.value || '').trim() || 'Unknown';
        const character = (r.querySelector('select')?.value || '').trim();
        return { place, name, character };
    });

    // canvas sizing
    const width = 1000;
    const rowH = 80;
    const height = entries.length * rowH;
    const dpr = window.devicePixelRatio || 1;
    const canvas = document.createElement('canvas');
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    // background
    ctx.fillStyle = '#0f172a'; // dark bg
    ctx.fillRect(0, 0, width, height);

    // draw rows
    entries.forEach((e, i) => {
        const y = i * rowH;
        // stripe
        ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)';
        ctx.fillRect(0, y, width, rowH);

        // placement
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 36px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(e.place, 20, y + rowH / 2 + 12);

        // name
        ctx.fillStyle = '#e6eef8';
        ctx.font = '700 28px system-ui, sans-serif';
        ctx.fillText(e.name, 80, y + rowH / 2 + 10);

        // character badge (circle with initials)
        const badgeX = width - 80;
        const badgeY = y + rowH / 2;
        const radius = 30;
        // pick color from character name hash
        const hash = (e.character || e.name).split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
        const hue = hash % 360;
        ctx.fillStyle = `hsl(${hue} 70% 45%)`;
        ctx.beginPath();
        ctx.arc(badgeX, badgeY, radius, 0, Math.PI * 2);
        ctx.fill();

        // initials
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(charInitials(e.character || e.name), badgeX, badgeY + 7);

        // character name small text underneath initials if present
        if (e.character) {
            ctx.fillStyle = '#cbd5e1';
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(e.character, width - 140, y + rowH / 2 + 28);
        }
    });

    graphicArea.appendChild(canvas);

    // download button
    const dl = document.createElement('a');
    dl.textContent = 'Download PNG';
    dl.style.display = 'inline-block';
    dl.style.marginTop = '8px';
    dl.style.padding = '8px 12px';
    dl.style.background = '#2563eb';
    dl.style.color = '#fff';
    dl.style.borderRadius = '4px';
    dl.style.textDecoration = 'none';
    dl.href = canvas.toDataURL('image/png');
    dl.download = 'top8.png';
    graphicArea.appendChild(dl);
});