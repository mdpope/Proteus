# Tab navigation model review — October 14, 2026

The expected behavior is that a document opened by a workspace chat appears beside that chat in
the workspace navigation. Opening it must not duplicate the chat in main navigation. 0.2.18
corrects this document-routing defect; it does not remove standalone chat subtabs.

The recommended future model is one navigation container per workspace, with chats, browsers,
terminals and viewers as peer tabs. Main navigation houses workspace containers and unhoused tabs.
Resource association remains independent of placement: a document can remember its originating
chat, a browser retains its explicit agent grants, and a terminal keeps its original host/session.
Moving a tab changes display placement; Move chat also changes organizational membership while
retaining captured run options and permissions. Closing a chat view must not implicitly close
neighboring resources or cancel its conversation.

| Concern | What must survive a future simplification |
| --- | --- |
| Saved layout | IDs, order, hidden/persisted flags, dates, current selections and deliberate closes |
| Duplicate chat views | One canonical conversation; deliberate aliases handled explicitly |
| Browser navigation | Full Back/Forward stack, profiles, grants, pending operations and retry receipts |
| Terminals/viewers | Live PTYs/tmux, source host and document authorization independent of display parent |
| Agent opens | One placement resolver for every entry point; reuse the existing container and resource |
| Background activity | Clear rules for showing a new tab, selecting it and avoiding focus theft |
| Unhoused chats | Defined main-nav placement without recreating implicit chat subtab groups |
| Other clients | Desktop, website and native navigation migration with actual workflow acceptance |

Retiring standalone chat containers reduces inconsistent routing, nested menus and ambiguous moves.
The main cost is migration and permission/lifecycle separation, rather than drawing the tab bar.
First centralize routing and preserve current behavior, then review the flat model and migration
fixtures before implementing it. No bulk layout conversion or automatic resource closure is authorized
by this review. SQLite workspace/chat metadata migration remains independently shelved.
