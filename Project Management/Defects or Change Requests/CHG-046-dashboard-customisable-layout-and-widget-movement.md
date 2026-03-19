# CHG-046: Dashboard customisable layout and widget movement

## Summary

Build out the Dashboard page so it keeps the same characteristic feel and visual language as the current UI while allowing users to move, arrange, and personalise dashboard widgets.

## Background

The dashboard requirements above introduce multiple cards, charts, alerts, and summary panels. The page should remain visually consistent with the current application rather than introducing a disconnected admin-style layout.

## Desired behaviour

1. The dashboard uses the same design language as the current UI, including spacing, typography, card treatment, icon style, and interaction patterns.
2. Dashboard widgets can be moved or rearranged by the user.
3. Users can choose which widgets are visible in their personal dashboard view.
4. The selected layout and visibility preferences persist between sessions.
5. The page remains usable across desktop and mobile breakpoints.

## Acceptance criteria

1. The dashboard page visually aligns with the current application look and feel.
2. Users can reorder widgets through a clear interaction such as drag-and-drop or move controls.
3. Users can show or hide supported widgets to customise their view.
4. User-specific widget order and visibility preferences are persisted and restored.
5. The layout handles varying numbers of widgets without overlap, clipping, or broken responsiveness.
6. Customisation controls are discoverable but do not overwhelm the default view.

## Severity / priority

**High**

## Related

- Dashboard page
- All dashboard CHG items from CHG-004 to CHG-045

