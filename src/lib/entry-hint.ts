/** localStorage hint, value "app": lets the <head> script pick the surface before paint. */
export const ENTRY_HINT_KEY = "tsundoku-entry";

/** Dependency-free on purpose: layout.tsx inlines this, so it must not pull Dexie in. */
export const ENTRY_HINT_SCRIPT = `try{if(localStorage.getItem("${ENTRY_HINT_KEY}")==="app")document.documentElement.dataset.entry="app"}catch(e){}`;
