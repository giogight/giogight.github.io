# Workspace integration

Embed `workspace/index.html` in a same-origin iframe occupying the outer shell's main content region. On desktop the existing isolated `WebContentsView` is positioned over the local browser-host region using the iframe's top-level offset. Web source selection keeps the workspace visible and does not navigate or open a platform. The explicit adjacent-window action requests a popup aligned to the right preview with `noopener,noreferrer`; browser policies may instead open a tab or block popups. The preview explains that limitation and links to the desktop app for in-window browsing. Third-party websites are not framed, so their frame restrictions remain respected.

The module chooses `window.parent.guanchao` or `window.guanchao` when available. Its desktop actions retain the original `init/page/open/resume/open-link/source-home/back/forward/reload/external/bookmark/remove/rename/clear-history/theme/mute/research-save/research-shuffle/research-undo` contract. It adds `research-add {source}` returning `{ok,state,createdId}`. History and bookmarks are identified by stable IDs; no credentials or arbitrary local file paths are exposed.

The native `browser-pause` action only snapshots and pauses the owned browser view, without changing application routing. Parent shell routing remains authoritative.

Send same-origin parent messages:

- `{type:'guanchao:pause'}`: save current edit, hide browser view and pause native media. The iframe replies `{type:'guanchao:workspace-paused',saved:true|false}` so the parent can wait before closing.
- `{type:'guanchao:resume',theme:'day'|'night'}`: resume the current desktop browse view and position it in the current iframe region.
- `{type:'guanchao:theme',theme:'day'|'night'}`: save the current edit and apply the shared theme. `dark` is accepted as a night alias.

On initialization the iframe emits `{type:'guanchao:workspace-ready',native:true|false}`. Parent native events with `page:'browse'` refer to this module's platform-and-notes view; keep the outer shell in its workspace route. `page:'home'` refers to the workspace's platform overview, rather than the outer photography page.

Web and mobile fallback saves `gc-web-workspace-v1` in the current origin's localStorage. It includes topic notes, explicitly opened link records and user-created bookmarks, without reading third-party history or sessions. Each direction allows up to 100 notes. Initial notes are local writing prompts; shuffling templates preserves all edited notes. Export produces Markdown for the selected research direction.
