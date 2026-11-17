# Table

Read when configuring row selection, header hover, keyboard highlights, layout snaps, or mirrored fills.

Register `TableBlock` with a required field Binding and provide `table.layer`. The Layer owns the body and header Hover/Highlight children and the SelectionBackgrounds timeline. Existing views still need only `animateHighlight` and `content`; Table supplies its selection Motion scope internally. `animateSelection` optionally replaces that presentation. The standard `hoverHighlightAnimation` helper preserves Table frame observations and prepaint snaps through existing five-argument forwarding wrappers. Custom renderers that return plain Html or rebuild the target are explicit presentation overrides; they own the resulting geometry and timing.

Initialize `selectedIndices`, `heldHeadIndex`, `hideHeadHighlight`, and `snapKey` in Table's config. Send later snapshots through the Binding's `requestConfigure`. Selection indices are normalized. `heldHeadIndex: null` releases the header. A changed `snapKey`, including a change to or from absence, measures and snaps accepted fills before the first painted frame. Old completion generations cannot clear newer snaps.

Pass the content callback's Table context to `TableHeader`, `TableHead`, and `TableRow`. A header cell opts in with `hoverIndex`; the header remains a semantic `thead` and shares the body's outer measurement coordinates. Body rows opt in with `index`. Pass `table.size` or `table.presentation` to cells to inherit the Table's size. Header `keepRule` retains the divider when row zero is selected.

`hoverMarker(index)` renders inside the moving body fill. `onHighlightFrame(box)` observes the actual painted fill (`y`, `height`, and `opacity`), which also controls divider coverage. A bubbling `fluid-table-highlight` event from an indexed row claims keyboard ownership; pointer motion at unchanged coordinates cannot reclaim it. Repeated arrows snap the fill; keyup, blur, and unmount release repeat state.

`selectionMirrorIds` names empty HTML hosts in matching coordinate systems. Table owns inert, ID-free presentation copies in those hosts; hosts must not render competing children. Mirrors copy the primary committed styles and share its single selection timeline. Removing a host or unmounting the child releases its copies.

`TableEmpty` reserves three rows by default. Its height uses the Table's line height, vertical padding, and one divider pixel per row. Set `--table-view-w` on the scroll viewport to keep empty content within its visible width; it falls back to 100% and remains sticky at the left edge.
