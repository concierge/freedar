const reddit = require('concierge/reddit');

class FreedarModule {
	notify(title, url) {
		const apis = this.platform.getIntegrationApis();
		for (let int in this.config.listeners) {
			const api = apis[int];
			for (let thread of this.config.listeners[int]) {
				LOG.debug(`Notifying "${int}:${thread}" about a free game.`);
				api.sendMessage(title, thread);
				api.sendUrl(url, thread);
			}
		}
	}

	async checkForGames() {
		LOG.debug('Checking for free games.');
		const results = await reddit('gamedeals', 200);
		const searchTerms = [/[^0-9]100%/i, /free($|[^a-z])/i];
		const ignoreTerms = [/\[PSN\]/i, /XBOX/i, /playstation/i, /free (weekend|play|shipping)/i, /[a-z](-)?free/i, /rent/i];
		for (let result of results) {
			LOG.silly(`Checking title "${result.data.title}".`);
			const includeCheck = searchTerms.some(s => s.test(result.data.title));
			const excludeCheck = ignoreTerms.some(s => s.test(result.data.title));
			if (includeCheck && !excludeCheck) {
				if (this.config.notified[result.data.id]) {
					LOG.silly('Title already matched.');
				}
				else {
					LOG.silly('Title was a match!');
					this.notify(result.data.title, result.data.url);
					this.config.notified[result.data.id] = true;
				}
			}
		}
		this.timer = setTimeout(this.checkForGames.bind(this), this.config.checkFrequency);
	}

	load() {
		const defaultConfig = {
			notified: {},
			listeners: {},
			checkFrequency: 3600000
		};
		for (let key in defaultConfig) {
			if (!this.config[key]) {
				this.config[key] = defaultConfig[key];
			}
		}
		this.checkForGames();
	}

	unload() {
		clearTimeout(this.timer);
	}

	run(api, event) {
		ensure(this.config.listeners, event.event_source, []);
		if (!this.config.listeners[event.event_source].includes(event.thread_id)) {
			this.config.listeners[event.event_source].push(event.thread_id);
			api.sendMessage('Listening for free games.', event.thread_id);
		}
		else {
			this.config.listeners[event.event_source].splice(this.config.listeners[event.event_source].indexOf(event.thread_id), 1);
			api.sendMessage('No longer listening for free games.', event.thread_id);
		}
	}
}

module.exports = new FreedarModule();
