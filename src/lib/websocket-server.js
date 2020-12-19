import parse from '@polka/url';
import ws from 'ws';

import { moduleGraph } from '../wmr-middleware.js';

/**
 * A WebSocket server that can be mounted at a path.
 * It also exposes a broadcast() method to message all clients.
 */
export default class WebSocketServer extends ws.Server {
	constructor(server, mountPath) {
		super({ noServer: true });
		this.mountPath = mountPath;
		server.on('upgrade', this._handleUpgrade.bind(this));

		server.on('connection', function (client) {
			// TODO: this never gets called
			client.on('message', function (data) {
				const message = JSON.parse(data.toString());
				if (message.type === 'hotAccepted') {
					if (!moduleGraph.has(message.id))
						moduleGraph.set(message.id, { dependencies: new Set(), dependents: new Set(), acceptingUpdates: false });
					const entry = moduleGraph.get(message.id);
					entry.acceptingUpdates = true;
				}
			});
		});
	}

	broadcast(data) {
		this.clients.forEach(client => {
			if (client.readyState !== ws.OPEN) return;
			client.send(JSON.stringify(data));
		});
	}

	_handleUpgrade(req, socket, head) {
		const pathname = parse(req).pathname;
		if (pathname == this.mountPath) {
			this.handleUpgrade(req, socket, head, client => {
				client.emit('connection', client, req);
			});
		} else {
			socket.destroy();
		}
	}
}
