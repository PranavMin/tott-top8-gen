import { extractSlug } from "./util.js";

export async function getTop8(eventUrl) {
  const eventSlug = extractSlug(eventUrl);

  const apiKey = import.meta.env.VITE_STARTGG_KEY;
  if (!apiKey) throw new Error("API key not set (VITE_STARTGG_KEY)");

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

  const res = await fetch("https://api.start.gg/gql/alpha", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ query, variables: { slug: eventSlug } }),
  });

  const json = await res.json();
  return json.data?.event?.standings?.nodes ?? [];
}

export async function getEventStats(eventUrl) {
  const eventSlug = extractSlug(eventUrl);

  const apiKey = import.meta.env.VITE_STARTGG_KEY;
  if (!apiKey) throw new Error("API key not set (VITE_STARTGG_KEY)");
  
  // New query to fetch tournament sets data with pagination
  const query = `query TournamentSetsData($slug: String, $page: Int) {
    tournament(slug: $slug) {
      id
      name
      events {
        id
        name
        sets(page: $page, perPage: 50) { # Fetch 50 sets per page
          pageInfo {
            total
            totalPages
          }
          nodes {
            id
            fullRoundText
            displayScore
            winnerId
            state
            # Slots contain the entrants/players in the set
            slots {
              id
              entrant {
                id
                name
              }
            }
          }
        }
      }
    }
  }`;

  // The eventUrl is in the format "tournament/TOURNAMENT_SLUG/event/EVENT_SLUG"
  // We need to extract the tournament slug and the event slug part for matching.
  const fullEventSlug = eventUrl;
  const tournamentSlugMatch = fullEventSlug.match(/tournament\/([^\/]+)/);
  const tournamentSlug = tournamentSlugMatch ? tournamentSlugMatch[1] : null;
  const eventSlugPart = fullEventSlug.split('/event/')[1]; // e.g., "melee-singles"

  if (!tournamentSlug || !eventSlugPart) {
    throw new Error("Invalid event URL format. Could not extract tournament or event slug from: " + fullEventSlug);
  }

  let allSets = [];
  let currentPage = 1;
  let totalPages = 1; // Initialize to 1 to ensure at least one request
  const maxPagesToFetch = 10; // Limit to prevent excessive API calls for very large events (500 sets total)

  do {
    const res = await fetch("https://api.start.gg/gql/alpha", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ query, variables: { slug: tournamentSlug, page: currentPage } }),
    });

    const json = await res.json();
    if (json.errors) {
      console.error("GraphQL Errors:", json.errors);
      throw new Error(json.errors.map((e) => e.message).join(", "));
    }
    
    const tournamentData = json.data?.tournament;
    if (!tournamentData || !tournamentData.events) {
      break; // No tournament or events found
    }

    // Find the specific event within the tournament's events array
    const targetEvent = tournamentData.events.find(e => {
      // Normalize event name to compare with the slug part from the input URL
      const normalizedEventName = e.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      return normalizedEventName === eventSlugPart;
    });

    if (!targetEvent || !targetEvent.sets) {
      console.warn(`Event with slug part '${eventSlugPart}' or its sets not found within tournament '${tournamentSlug}'.`);
      break;
    }

    allSets = allSets.concat(targetEvent.sets.nodes || []);
    totalPages = targetEvent.sets.pageInfo?.totalPages || 1;
    currentPage++;

    if (currentPage > maxPagesToFetch && currentPage <= totalPages) {
      console.warn(`Reached maximum pages (${maxPagesToFetch}) for sets. Not all sets may be fetched.`);
      break;
    }

  } while (currentPage <= totalPages);

  // Calculate unique number of players that didn't DQ out (from non-DQ sets)
  const nonDQEntrantIds = new Set();
  let nonDQSetsCount = 0;

  for (const set of allSets) {
    // A set is considered non-DQ if its displayScore does not contain "DQ"
    if (set.displayScore && !set.displayScore.toLowerCase().includes("dq")) {
      nonDQSetsCount++;
      // Add all entrants from this non-DQ set to our unique list
      if (set.slots) {
        for (const slot of set.slots) {
          if (slot.entrant?.id) {
            nonDQEntrantIds.add(slot.entrant.id);
          }
        }
      }
    }
  }

  const nonDQAttendees = nonDQEntrantIds.size;
  
  return { nonDQAttendees, nonDQSets: nonDQSetsCount };
}
       