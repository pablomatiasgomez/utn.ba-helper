import $ from 'jquery';
import {TextEncoder, TextDecoder} from 'util';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock chrome APIs
global.chrome = {
	runtime: {
		sendMessage: () => {
		},
		getURL: (path) => `chrome-extension://test-extension/${path}`,
	},
};
