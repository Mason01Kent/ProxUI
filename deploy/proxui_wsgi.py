"""Initialize the configured cluster before serving one Gunicorn worker.

ProxUI keeps connection and WebSocket state in process memory, so the deployment
must use a single threaded worker. A failed initial connection exits to allow the
container restart policy to retry after Proxmox becomes available.
"""

import app as proxui

proxui.init_all_clusters()
if not proxui.init_proxmox_connections() or not proxui.proxmox_nodes:
    raise RuntimeError("Unable to initialize the configured Proxmox connection")

app = proxui.app
