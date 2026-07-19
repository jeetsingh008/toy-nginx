function matchLocation(locations, requestPath) {
  const matches = locations.filter((loc) => requestPath.startsWith(loc.path));
  matches.sort((a, b) => b.path.length - a.path.length);
  return matches[0] || null;
}

module.exports = { matchLocation };
