// helper to extract slug from full URL
export function extractSlug(input) {
  // If they paste the whole URL, strip the domain
  if (input.includes("start.gg/")) {
    const match = input.match(/tournament\/[^/]+\/event\/[^/]+/);
    if (match) return match[0];
    return input.split("start.gg/")[1].split("/overview")[0].split("/brackets")[0];
  }
  // If they just typed 'tournament/name/event/game', return as is
  return input;
}

// helper to strip everything before and including the pipe
export function cleanName(name) {
  if (!name) return "Unknown";
  const parts = name.split("|");
  return parts[parts.length - 1].trim();
}
