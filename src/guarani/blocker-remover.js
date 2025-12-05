// Remove blocker script that tries to detect the extension
(function removeBlockerScript() {
	const removeScripts = () => {
		const scripts = document.querySelectorAll('script');
		scripts.forEach(script => {
			const content = script.textContent || script.innerText;
			if (content && 
				content.includes('chrome-extension://jdgdheoeghamkhfppapjchbojhehimpe/guarani/foreground.js')) {
				console.log('UTN.BA Helper: Blocker script removed');
				script.remove();
			}
		});
	};

	// Run immediately
	removeScripts();
	
	// Monitor for dynamically added scripts
	const observer = new MutationObserver(() => removeScripts());
	if (document.documentElement) {
		observer.observe(document.documentElement, {
			childList: true,
			subtree: true
		});
	}
})();
