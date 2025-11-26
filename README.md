# userscript-linksmanager
A userscript to collect certain links on the webpage and display information about them from an API

---

Please create a complete userscript that gathers data for each of the links on the webpage from an API server.

The links are normalized by their href, and only links that match a certain domain or certain path are collected. While this is being done in the background, a loading/spinner will be displayed beside the link. Note that there might be links with duplicated hrefs on a page, we match by their normalized href to avoid sending duplicated requests, also the returned results from the backend will be used for all links with the same normalized href. The server only collects the domain name and path, other parts of the link (e.g. hash) are ignored.

The initial submitting of the links to the backend can be done in batches (e.g. 10 links at a time).

Once details have been fetched about the link, it can be bound to that link. A badge/chip with dropdown capability will be displayed next to the link (instead of the loading spinner) that contains the state of the link (e.g. new, processed, bad/good, etc). The user can click to interact with a cool drop down menu that contains many features to manage this link on the backend.

The server collects new links and store them in a database, if a link is missing, it is created; otherwise it is an existing link. Additionally, the color and style of the link changes depending on its state on the backend. for example, a green check icon can be included which means the link was successfully added to the database. The badge can have other colors indicating other states as well.

The features contain ability to mark the link as proccessed, setting the priority for the link, making the link as deleted (which makes the style of the link itself red and ~strikethrough~ as the link is blacklisted), adding/editing a description for the link. Other features include displaying the status of the link, date added/edited, count of other links on the same domain, etc.

The dropmenu has CTA buttons, e.g. to Process link, an icon for delete/blacklist, edit, etc. The user can change the link's priority, it will be updated in the backend as well as other places.

When the user interacts with the dropdown, the changes will be automatically sent to the backend to be applied/saved, as well as sending an event to other tabs so the links in other tabs will also get updated.

Optional feature: The userscript can declare link_ids to subscribe for change events using socket.io/websockets to the backend, in an event the details of the link is changed in the database, new information will be received instantly.

There are clear files (CSS, JS, etc) with clear sections so the developer can customize the behavior of the userscript, customize the style for each state, customize actions and what these do. Handle errors correctly, be atomic with updates (e.g. the user needs to be shown correct states for loading, submitting, errors, etc)

This is a monorepo, so please create a simple backend as well to handle the userscript. The design of UI elements will be nice and elegant. This is a modern, beautiful, SPA-like HTML5 with amazing light/dark styles that are professionally designed. Be DRY, comperhensive, extensible, customizable. Use good UI/UX tools and utilities, such as icons and such.

You can write in SCSS and use a JS transpiler in your build system if needed. The design will be beautiful.

Create a demo directory that has loaded the userscript with some links in it to test various cases. The userscript and the webpage must not break or mess each other's styling, while in the same time delivering the capabilities of the userscript smoothly.
