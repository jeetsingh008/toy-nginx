function createLoadBalancer(upstreams) {
  const indexByGroup = {};

  function pickUpstream(groupName) {
    const servers = upstreams[groupName];
    if (!servers || servers.length === 0) return null;

    const index = indexByGroup[groupName] || 0;
    indexByGroup[groupName] = (index + 1) % servers.length;
    return servers[index];
  }

  return { pickUpstream };
}

module.exports = { createLoadBalancer };
