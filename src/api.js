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
  const fullEventSlug = eventSlug;
  const tournamentSlugMatch = fullEventSlug.match(/tournament\/([^\/]+)/);
  const tournamentSlug = tournamentSlugMatch ? tournamentSlugMatch[1] : null;
  const eventSlugPart = fullEventSlug.split('/event/')[1]?.split('/')[0]; // e.g., "melee-singles"

  if (!tournamentSlug || !eventSlugPart) {
    throw new Error("Invalid event URL format. Could not extract tournament or event slug from: " + fullEventSlug);
  }

  const maxPagesToFetch = 10;

  const fetchPage = async (page) => {
    const res = await fetch("https://api.start.gg/gql/alpha", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ query, variables: { slug: tournamentSlug, page } }),
    });
    const json = await res.json();
    if (json.errors) {
      console.error(`GraphQL Errors on page ${page}:`, json.errors);
      return null;
    }
    return json;
  };

  const processResponse = (json) => {
    const tournamentData = json?.data?.tournament;
    if (!tournamentData?.events) return null;

    const targetEvent = tournamentData.events.find((e) => {
      const normalizedEventName = e.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      return normalizedEventName === eventSlugPart;
    });

    return targetEvent;
  };

  // Fetch page 1
  let allSets = [];
  const page1Json = await fetchPage(1);
  const page1Event = processResponse(page1Json);

  if (page1Event?.sets) {
    allSets = allSets.concat(page1Event.sets.nodes || []);
    const totalPages = page1Event.sets.pageInfo?.totalPages || 1;

    // Fetch remaining pages in parallel
    const promises = [];
    for (let p = 2; p <= Math.min(totalPages, maxPagesToFetch); p++) {
      promises.push(fetchPage(p));
    }

    const results = await Promise.all(promises);
    results.forEach((json) => {
      const event = processResponse(json);
      if (event?.sets?.nodes) {
        allSets = allSets.concat(event.sets.nodes);
      }
    });
  } else {
    console.warn(
      `Event with slug part '${eventSlugPart}' or its sets not found within tournament '${tournamentSlug}'.`
    );
  }

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
