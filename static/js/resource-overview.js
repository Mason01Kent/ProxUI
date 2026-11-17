// Read-only, per-node host capacity. Guest allocations include stopped guests.
(() => {
  const overview = document.getElementById('resource-overview');
  const refresh = document.getElementById('resource-overview-refresh');
  if (!overview || !refresh) return;

  const gib = bytes => `${(bytes / 1024 ** 3).toFixed(1)} GiB`;
  const number = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;
  const line = (parent, label, value) => {
    const row = document.createElement('div');
    const name = document.createElement('span');
    const detail = document.createElement('strong');
    name.className = 'text-muted-2';
    name.textContent = `${label}: `;
    detail.textContent = value;
    row.append(name, detail);
    parent.appendChild(row);
  };
  async function getJson(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Unavailable');
    return response.json();
  }
  async function render() {
    refresh.disabled = true;
    overview.textContent = 'Loading server capacity…';
    try {
      const [nodes, inventories] = await Promise.all([getJson('/api/nodes'), getJson('/api/resources/by-node')]);
      if (!Array.isArray(nodes) || !Array.isArray(inventories)) throw new Error('Invalid response');
      if (!nodes.length) { overview.textContent = 'No server capacity is available.'; return; }
      const statuses = await Promise.all(nodes.map(async node => {
        try { return await getJson(`/api/node/${encodeURIComponent(node.name)}/status`); }
        catch { return null; }
      }));
      const grid = document.createElement('div');
      grid.className = 'row row-cols-1 row-cols-lg-2 g-3';
      nodes.forEach((node, index) => {
        const column = document.createElement('div');
        column.className = 'col';
        const title = document.createElement('strong');
        title.textContent = node.name;
        column.appendChild(title);
        const status = statuses[index];
        if (!status || status.error) {
          line(column, 'Status', 'Capacity unavailable');
          grid.appendChild(column);
          return;
        }
        const memory = status.memory || {};
        const cpuCount = status.cpuinfo?.cpus;
        const inventory = inventories.find(item => item.node === node.name);
        const complete = inventory?.complete === true && Array.isArray(inventory.resources);
        const members = complete ? inventory.resources.filter(g => ['qemu', 'lxc'].includes(g.type) && !g.template) : [];
        const memKnown = members.every(g => number(g.maxmem) && g.maxmem > 0);
        const cpuKnown = members.every(g => number(g.maxcpu) && g.maxcpu > 0);
        const allocatedMem = members.reduce((sum, g) => sum + (number(g.maxmem) ? g.maxmem : 0), 0);
        const allocatedCpu = members.reduce((sum, g) => sum + (number(g.maxcpu) ? g.maxcpu : 0), 0);
        line(column, 'Host RAM', number(memory.total) && memory.total > 0 ? gib(memory.total) : 'Unknown');
        line(column, 'RAM available now', number(memory.available) ? gib(memory.available) : 'Unknown');
        line(column, 'RAM assigned to known guests', !complete ? 'Unknown; inventory incomplete' : !members.length ? 'None visible' : memKnown ? gib(allocatedMem) : 'Some allocations unavailable');
        line(column, 'Host logical CPUs', number(cpuCount) && cpuCount > 0 ? String(cpuCount) : 'Unknown');
        line(column, 'Known guest virtual CPUs', !complete ? 'Unknown; inventory incomplete' : !members.length ? 'None visible' : cpuKnown ? String(allocatedCpu) : 'Some allocations unavailable');
        grid.appendChild(column);
      });
      const updated = document.createElement('div');
      updated.className = 'text-faint mt-2';
      updated.style.fontSize = '12px';
      updated.textContent = `Updated ${new Date().toLocaleTimeString()}`;
      overview.replaceChildren(grid, updated);
    } catch {
      overview.textContent = 'Server capacity could not be loaded. Refresh to try again.';
    } finally {
      refresh.disabled = false;
    }
  }
  refresh.addEventListener('click', render);
  render();
})();
