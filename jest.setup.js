import {TextEncoder, TextDecoder} from 'util';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock chrome APIs
global.chrome = {
	runtime: {
		sendMessage: () => {
		},
		getURL: (path) => `chrome-extension://test-extension/${path}`,
		getManifest: () => ({version: '0.0.0'}),
	},
};

// Mock browser APIs (Firefox)
global.browser = {
	runtime: {
		sendMessage: () => {
		},
		getURL: (path) => `moz-extension://test-extension/${path}`,
		getManifest: () => ({version: '0.0.0'}),
	},
	storage: {
		sync: {
			get: async () => ({}),
			set: async () => {
			},
		},
	},
};