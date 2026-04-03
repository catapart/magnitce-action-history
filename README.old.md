# `<action-history>` Element
A custom `HTMLElement` that documents user actions in the DOM and provides functionality for navigating the history of those actions.

Package size: ~6kb minified, ~12kb verbose.

## Quick Reference
```html
<action-history reverse>
    <button type="button" data-entry>Entry 1</button>
    <button type="button" data-entry>Entry 2</button>
    <button type="button" data-entry>Entry 3</button>
</action-history>
<script type="module" src="/path/to/action-history[.min].js"></script>
```

## Demos
https://catapart.github.io/magnitce-action-history/demo/

## Support
- Firefox
- Chrome
- Edge
- <s>Safari</s> (Has not been tested; should be supported, based on custom element support)

## Getting Started
 1. [Install/Reference the library](#referenceinstall)

### Reference/Install
#### HTML Import (not required for vanilla js/ts; alternative to import statement)
```html
<script type="module" src="/path/to/action-history[.min].js"></script>
```
#### npm
```cmd
npm install @magnit-ce/action-history
```

### Import
#### Vanilla js/ts
```js
import "/path/to/action-history[.min].js"; // if you didn't reference from a <script>, reference with an import like this

import { ActionHistoryElement } from "/path/to/action-history[.min].js";
```
#### npm
```js
import "@magnit-ce/action-history"; // if you didn't reference from a <script>, reference with an import like this

import { ActionHistoryElement } from "@magnit-ce/action-history";
```

---
---
---

## Overview
The `<action-history>` element is intended to add a simple interface and management controls for a "History" system.

History systems are a generalized name for functionality that provides features like "Undo" and "Redo" found in many common applications. The `<action-history>` element implements such a system, while accounting for edge cases and design patterns that are only expected for history systems.

### Entry Order
Entries in the `<action-history>` element are ordered by when they occurred chronologically, which is maintained by adding a [timestamp](#entry-attributes) to each entry as it is entered. It can be expected that looping through the `<action-history>` element's `children` property (filtered for entries, if you've provided any non-entry children), will result in a chronological list of entries.

### Active Entry
A history system crudely models a timeline where some entries happened in the past, and some entries may have happened later that "now". To define that point of "now" on the timeline, that entry is defined as the "active" entry.

Entries may be activated in many ways, but the first way they will be activated it by being added to the `<action-history>` element. Whenever a new entry is added, that entry is understood to be the latest thing that has happened in this "timeline" and so that entry is made to be "active".

Only one element can be the "active" entry at any given time. To indicate this, the entry that is active is given an ["active" attribute](#entry-attributes). All activation and deactivation is handled by the `<action-history>` element whenever navigation occurs.

### Reversed Entries
In order to indicate that an entry's actions should be undone, the `<action-history>` element provides the ability to "reverse" an entry. When an entry is reversed, you can think of that entry as having occurred in an alternate future. The history is still tracking it, but the [active](#active-entry) entry will always be prior to the earliest reversed entry, if any prior entry exists.

When an entry has been reversed, it is understood by the `<action-history>` element as unrepresentative of the current state of its parent project. As such, it is de-emphasized, visually, and can be [overwritten](#overwriting-entries).

Selecting a reversed entry will "restore" that entry by activating it, and removing the reversed status from any preceeding entries.

## Functions
The `<action-history>` element can be navigated by using its functions, and dispatches events when navigation occurs. Navigation is distinct from "Activation" or "Reversal" in that it describes an event of the history system, rather than a state change for an entry. Entries are "Active" or "Reversed"; the history moves "back" or "forward".

### `back()` and `forward()` functions
To facilitate navigation, the `<action-history>` element has `back()` and `forward()` functions. These work similarly to browser "back" and "forward" navigation and activate or reverse entries when called. The entries that will be affected are based on the current [active](#active-entry) entry. `back()` moves to the preceeding entry, if it exists, and `forward()` moves to the next entry, if it exists.

### `activateEntry()` and `reverseEntry()` functions
These functions provide two more methods of navigation that allow for multiple entries to be either activated or reversed in a single function. Whereas `back()` and `forward` navigate from the currently active entry, `activateEntry()` and `reverseEntry()` each take a reference to an entry and then directly activate that entry, or reverse that entry.

In maintaining the history, each function will collect all entries between the previously active entry and the target entry, and reverse or activate them before providing all affected entries in the [`activate` or `reverse` events](#events).

Each function takes in a `target` entry as its parameter. In the `activateEntry()` function, the target will be activated and all earlier reversed entries will be activate as well. In the `reverseEntry()` function, the target will be reversed and all later entries that have not been reversed will be reversed, as well. Also, if there is a preceeding entry to the `target` entry, that preceeding entry will be activated.

For reference, the `back()` and `forward()` functions each call the `activateEntry()` function, while the `reverseEntry()` function is not invoked by the `<action-history>` element. The `reverseEntry()` function is provided as a way to navigate the history when you only have a reference to the entry you want to reverse, rather than having a referece to the entry you want to activate.

### `onBack()` and `onForward()` functions
These functions are not the same as the `back()` and `forward()` functions. Those functions cause the `<action-history>` element to perform a navigation. The `onBack()` and `onForward()` functions, on the other hand, are dummy functions that can be overridden to inject functionality during the navigation events.

More simply, the `back()` function calls and awaits the `onBack()` function before it marks an entry as 'reversed'. Similarly, the `forward()` function calls and awaits the `onForward()` function before removing an entry's 'reversed' status.

The intention of these functions is to allow the implementing developer to perform their data persistence functionality (like saving the state of any records affected by the "undo" or "redo" functionality) at the point of the entry's state change. As such, these functions are not only called during the `back()` and `forward()` functions, but any time an entry's state is changed.

These are functions, rather than events, so that they can be awaited before the entry is marked as reversed or activated. This design is a convenience for asynchronous functionality which is common when working with data stores.

Each of the functions provides the following parameters:
|Parameter|Type|Description|
|-|-|-|
|`target`|`HTMLElement`|In the `onBack()` function, the earliest entry that is reversed in the `toReverse` array. In the `onForward()` function, the latest entry to activate, in the `toActivate` array.|
|`previous`|`HTMLElement` or `undefined`|The previous entry that was active, if any.|
|`toActivate`/`toReverse`|`HTMLElement[]`|All elements that were reversed/activated during this navigation event. Relevant when navigating to an entry more than one index away from the currently active entry.|
|`targetIndex`|`number`|The index of the entry element in the `<action-history>` element's children.|
|`previousActiveEntryIndex`|`number`|The index of the previous element in the `<action-history>` element's children, if the previous element is not `undefined`.|

## Events
The `<action-history>` element dispatches events when navigation occurs and when an entry is added. The following table lists each event, along with a description and the properties that are available on it's `event.detail` property.
|Event Name|Description|`detail` Properties|
|-|-|-|
|`add`|Dispatched when an entry has been added to the `<action-history>` element.|`{ target: [HTMLElement] }`|
|`activate`|Dispatched when the `activateEntry()` function is called (not, necessarily, when an entry has become [activated](#active-entry); this function still notifies when a lone entry has been reversed, even though there is no newly activated entry. Those edge cases are part of the reason for this custom element).|[see table](#activate-and-reverse-event-properties)|
|`refresh`|Dispatched when an entry that is already active is selected again.|`{ target: [HTMLElement] }`|
|`reverse`|Dispatched when an entries have been [reversed](#reversed-entries) using the `reverseEntry()` function.|[see table](#activate-and-reverse-event-properties)|

#### `activate` and `reverse` Event Properties
|Property|Type|Description|
|-|-|-|
|`target`|`HTMLElement`|The entry that was passed in as the parameter. The "active" entry, in an `activate` event, and the earliest reversed entry in the `reverse` event.|
|`previousActiveEntry`|`HTMLElement` or `undefined`|The previous entry that was active, if any.|
|`toReverse`|`HTMLElement[]`|All elements that were reversed during this navigation event.|
|`toActivate`|`HTMLElement[]`|All elements that were activated during this navigation event.|
|`targetIndex`|`number`|The index of the entry element in the `<action-history>` element's children.|
|`previousActiveEntryIndex`|`number`|The index of the previous element in the `<action-history>` element's children, if the previous element is not `undefined`.|

## Removing Entries
Removing entries from the `<action-history>` element is a destructive action. As the `<action-history>` element acts as the history record, itself, entries being removed from it literally removes the entry from the history system.

The `<action-history>` element never adds elements to itself and only removes elements in the case where history entries are [overwritten](#overwriting-entries). It is expected that the implementer will manage adding and removing entries. The exception for overwritten items is due to the nature of overwriting in that it does actually alter the entries. To reflect that, the entries are removed so that the DOM still accurately represents the current history.

In all other cases, it is expected that the implementer remove entries as part of their implementation's history entry features. Most commonly, this is done to observe a maximum limit of history entries, or when a user explicitly invokes a removal.

## Overwriting Entries
When a new entry is added, while there are entries in the `<action-history>` element that have been [reversed](#reversed-entries), each of the reversed entries will be "overwritten". This means that they will be removed from the `<action-history>` element and, in effect, removed from the history system that it represents. Those actions will not be able to be recovered and the history system will act as though they never occurred.

This type of functionality mimics most common history systems. It is analogous to typing, then using "undo", and then typing something else. The first thing you typed cannot be restored now that you have typed a new thing. But you can still undo the new thing that was typed.  
In the same way, the `<action-history>` element clears out the reversed entires whenever a new entry is addded.

## Parallel History
In some cases, it may make sense to allow a user action to be "undone", while not forcing the entire history to rewind to that point. As an example, a writing app that has settings could allow those settings changes to be undo-able, without having those actions be undone by rewinding changes in the open document.

In these cases, it is expected that mutltiple `<action-history>` elements are used, as there are two completely separate histories being recorded. By the same reasoning, the `<action-history>` element does not implement any method for reversing a single history item without navigating the history to that point.

## Attributes
The `<action-history>` element uses attribute queries to manage its entries. Each of the entry elements will have multiple attributes toggled on, to determine their state, in addition to the attribute that will be used to define a child element as an entry.

### Entry Attributes
Child elements of the `<action-history>` element will be treated as history entries so long as they have the "entry attribute". The "entry attribute" is named `data-entry` by default, using the `data-` prefix so that it is a valid attribute on any element type.

In addition to the entry attribute, there are "active", "reversed", and "timestamp" attributes that each entry will have toggled, depending on their state. Each of these attributes, along with a description and their default attribute names are listed here:
|Attribute Type|Default Attribute Name|Description|
|-|-|-|
|Entry|`data-entry`|Add this to a child element of `<action-history>` element to define that child as an entry.|
|Active|`data-active`|This attribute is added to the active entry's element.|
|Reversed|`data-reversed`|This attribute is added to each reversed history entry.|
|Timestamp|`data-timestamp`|This attribute stores a timestamp for sorting the entries, and is used in determing whether or not an entry is being actively managed by the `<action-history>` element.|

### `<action-history>` Attributes
Each of the `<action-history>` element's [entry attributes](#entry-attributes) are able to be customized by using the attributes of the `<action-history>` element, itself.

Setting these attributes on the `<action-history>` element will override the attribute name used when managing the history entries:
|Attribute Name|Description|Default|
|-|-|-|
|`entry-attribute`|The name of the attribute that will be used to find child elements that are intended to be history entries.|`data-entry`|
|`active-attribute`|The name of the attribute that will be added to the active history entry.|`data-active`|
|`reversed-attribute`|The name of the attribute that will be added to each reversed history entry.|`data-reversed`|
|`timestamp-attribute`|The name of the attribute that will store a timestamp for sorting the entries.|`data-timestamp`|

In addition to these "entry attribute overrides", the `<action-history>` element also accepts a `reverse` attribute, which will reverse the display - but *NOT*  the element order - of each entry so that they can be listed in reverse-chronological order (while still maintaining correct tabbing order, for keyboard navigation).

## Slots
The `<action-history>` element uses a single slot as a way to monitor child element addition and removal.
|Slot Name|Description|Default
|-|-|-|
|*[Default]*|Slot that holds all children of the element. (*note: this slot has no name; all children of the `<action-history>` element will be placed in this default slot.*)|*[empty]*|

## Styling
The `<action-history>` element can be styled with CSS, normally. It does not make use of the shadowDOM and contains no internal layout elements or parts.

## License
This library is in the public domain. You do not need permission, nor do you need to provide attribution, in order to use, modify, reproduce, publish, or sell it or any works using it or derived from it.