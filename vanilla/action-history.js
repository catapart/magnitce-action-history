// action-history.css?raw
var action_history_default = ":host\r\n{\r\n    display: flex; /* needed for reverse ordering */\r\n    flex-direction: column;\r\n    overflow: auto;\r\n}\r\n:host([empty])::before\r\n{\r\n    content: attr(placeholder);\r\n    color: graytext;\r\n    font-style: italic;\r\n    width: 100%;\r\n    height: 100%;\r\n    display: flex;\r\n    align-items: center;\r\n    justify-content: center;\r\n}\r\n\r\n::slotted([data-entry])\r\n{\r\n    cursor: pointer;\r\n    flex-shrink: 0; /* prevents squishing due to the flex display */\r\n}\r\n\r\n::slotted([data-active][data-entry])\r\n{\r\n    text-decoration: underline;\r\n}\r\n\r\n::slotted([data-entry][data-reversed])\r\n{\r\n    scale: .98;\r\n    opacity: .5;\r\n}";

// history-entry-type.enum.ts
var HistoryEntryType = /* @__PURE__ */ ((HistoryEntryType2) => {
  HistoryEntryType2["Create"] = "create";
  HistoryEntryType2["Read"] = "read";
  HistoryEntryType2["Update"] = "update";
  HistoryEntryType2["Delete"] = "delete";
  HistoryEntryType2["Custom"] = "custom";
  return HistoryEntryType2;
})(HistoryEntryType || {});

// action-history.ts
var ATTRIBUTENAME_REVERSED = "data-reversed";
var ATTRIBUTENAME_ACTIVE = "data-active";
var ATTRIBUTENAME_ENTRY = "data-entry";
var ATTRIBUTENAME_TIMESTAMP = "data-timestamp";
var COMPONENT_STYLESHEET = new CSSStyleSheet();
COMPONENT_STYLESHEET.replaceSync(action_history_default);
var COMPONENT_TAG_NAME = "action-history";
var ActionHistoryElement = class extends HTMLElement {
  onBack = async (target, previous, toReverse, targetIndex, previousActiveEntryIndex) => {
  };
  onForward = async (target, previous, toActivate, targetIndex, previousActiveEntryIndex) => {
  };
  get entryAttributeName() {
    return this.getAttribute("entry-attribute") ?? ATTRIBUTENAME_ENTRY;
  }
  get activeAttributeName() {
    return this.getAttribute("active-attribute") ?? ATTRIBUTENAME_ACTIVE;
  }
  get reversedAttributeName() {
    return this.getAttribute("reversed-attribute") ?? ATTRIBUTENAME_REVERSED;
  }
  get timestampAttributeName() {
    return this.getAttribute("timestamp-attribute") ?? ATTRIBUTENAME_TIMESTAMP;
  }
  #slot;
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `<slot></slot>`;
    this.shadowRoot.adoptedStyleSheets.push(COMPONENT_STYLESHEET);
    this.#boundSlotChange = ((_event) => {
      const children = this.#slot.assignedElements();
      if (children.length == 1 && children[0] instanceof HTMLSlotElement) {
        console.log("subslot");
        this.#registerSlot(children[0]);
        return;
      }
      this.#updateEntries(children);
    }).bind(this);
    this.#registerSlot(this.shadowRoot.querySelector(`slot`));
    this.addEventListener("click", (event) => {
      const target = event.target.closest(`[${this.entryAttributeName}]`);
      if (target == null) {
        return;
      }
      this.activateEntry(target);
    });
  }
  #boundSlotChange;
  #registerSlot(slot) {
    if (this.#slot != null) {
      this.#slot.removeEventListener("slotchange", this.#boundSlotChange);
    }
    this.#slot = slot;
    this.#slot.addEventListener("slotchange", this.#boundSlotChange);
    this.toggleAttribute("empty", this.#slot.assignedElements().length == 0);
  }
  #updateEntries(children) {
    let activeEntry = children.find((item) => item.getAttribute(this.activeAttributeName) != null);
    if (activeEntry != null && activeEntry.getAttribute(this.timestampAttributeName) != null) {
      activeEntry.removeAttribute(this.activeAttributeName);
      activeEntry = void 0;
    }
    let lastChild = null;
    for (let i = 0; i < children.length; i++) {
      if (children[i].getAttribute(this.entryAttributeName) == null) {
        continue;
      }
      lastChild = children[i];
      if (children[i].hasAttribute(this.timestampAttributeName)) {
        continue;
      }
      const toReverse = children.filter((item) => item.getAttribute("data-reversed") != null);
      for (let i2 = 0; i2 < toReverse.length; i2++) {
        toReverse[i2].remove();
      }
      children[i].setAttribute(this.timestampAttributeName, Date.now().toString());
      this.updateOrder(children);
      this.dispatchEvent(new CustomEvent("add", { detail: { target: children[i] }, bubbles: true, composed: true }));
    }
    if (activeEntry == null && lastChild != null && lastChild.getAttribute(this.reversedAttributeName) == null) {
      lastChild.toggleAttribute(this.activeAttributeName, true);
    }
    this.toggleAttribute("empty", children.length == 0);
  }
  updateOrder(children) {
    children = children ?? this.#slot.assignedElements();
    if (this.hasAttribute("reverse")) {
      for (let i = 0; i < children.length; i++) {
        const order = children.length - i;
        const element = children[i];
        element.tabIndex = order;
        element.style.order = order.toString();
      }
    } else {
      for (let i = 0; i < children.length; i++) {
        const element = children[i];
        element.removeAttribute("tabindex");
        element.style.removeProperty("order");
      }
    }
  }
  /**
   * Activate the previous entry, if it exists.
   * @returns `void`
   */
  back() {
    const children = this.#slot.assignedElements();
    const activeEntry = children.find((item) => item.getAttribute(this.activeAttributeName) != null);
    if (activeEntry == null) {
      return;
    }
    const activeIndex = children.indexOf(activeEntry);
    const backIndex = activeIndex - 1;
    if (backIndex == -1) {
      new Promise(async (resolve) => {
        await this.onBack(activeEntry, activeEntry, [activeEntry], backIndex, activeIndex);
        activeEntry.toggleAttribute(this.reversedAttributeName, true);
        activeEntry.removeAttribute(this.activeAttributeName);
        resolve();
      });
      return;
    }
    if (backIndex >= 0 && backIndex < children.length) {
      const entry = children[backIndex];
      entry.click();
    }
  }
  /**
   * Activate the next entry, if it exists.
   * @returns `void`
   */
  forward() {
    const children = this.#slot.assignedElements();
    let activeEntry = children.find((item) => item.getAttribute(this.activeAttributeName) != null);
    const forwardIndex = activeEntry == null ? children.length > 0 ? 0 : -1 : children.indexOf(activeEntry) + 1;
    if (forwardIndex == -1) {
      return;
    }
    if (forwardIndex < children.length) {
      const entry = children[forwardIndex];
      entry.click();
    }
  }
  /**
   * 
   * @returns `void`
   */
  async activateEntry(target) {
    if (target.hasAttribute(this.activeAttributeName)) {
      this.dispatchEvent(new CustomEvent("refresh", { detail: { target }, bubbles: true, composed: true }));
      return;
    }
    const activationProperties = await this.#activateEntry(target);
    this.dispatchEvent(new CustomEvent("activate", { detail: activationProperties, bubbles: true, composed: true }));
  }
  async #activateEntry(target) {
    const children = this.#slot.assignedElements();
    const previousActiveEntry = children.find((item) => item.getAttribute(this.activeAttributeName) != null);
    if (previousActiveEntry != null) {
      previousActiveEntry.removeAttribute(this.activeAttributeName);
    }
    const targetIndex = children.indexOf(target);
    const previousActiveEntryIndex = previousActiveEntry == null ? -1 : children.indexOf(previousActiveEntry);
    const toReverse = [];
    const toActivate = [];
    if (previousActiveEntryIndex > targetIndex) {
      for (let i = previousActiveEntryIndex; i > targetIndex; i--) {
        toReverse.push(children[i]);
      }
    } else if (previousActiveEntryIndex < targetIndex) {
      for (let i = previousActiveEntryIndex + 1; i <= targetIndex; i++) {
        toActivate.push(children[i]);
      }
    } else {
      throw new Error("Unable to determine action");
    }
    const activationProperties = { target, previousActiveEntry, toReverse, toActivate, targetIndex, previousActiveEntryIndex };
    if (toReverse.length > 0) {
      for (let i = 0; i < toReverse.length; i++) {
        toReverse[i].toggleAttribute(this.reversedAttributeName, true);
      }
      const reverseTarget = toReverse[toReverse.length - 1];
      ;
      await this.onBack(reverseTarget, previousActiveEntry, toReverse, children.indexOf(reverseTarget), previousActiveEntryIndex);
    } else if (toActivate.length > 0) {
      for (let i = 0; i < toActivate.length; i++) {
        toActivate[i].removeAttribute(this.reversedAttributeName);
      }
      const activateTarget = toActivate[toActivate.length - 1];
      await this.onForward(activateTarget, previousActiveEntry, toActivate, children.indexOf(activateTarget), previousActiveEntryIndex);
    }
    target.toggleAttribute(this.activeAttributeName, true);
    return activationProperties;
  }
  /**
   * Using the target for reference, sets the active entry as the 
   * entry directly preceeding the target entry. Calls `onBack`
   * handlers, in order, for every entry that is active, and later 
   * than the activated entry (including the target entry), or 
   * `onForward` handlers, in order, for  every entry that is inactive
   *  and earlier than the activated entry.
   * @returns `void`
   * @description Useful for "Undo" functionality where the action to
   * reverse is well-known, but finding the action to activate might
   * require a lookup/query.
   */
  async reverseEntry(target) {
    if (target.hasAttribute(this.reversedAttributeName)) {
      return;
    }
    const children = this.#slot.assignedElements();
    const previousActiveEntry = children.find((item) => item.getAttribute(this.activeAttributeName) != null);
    if (previousActiveEntry != null) {
      previousActiveEntry.removeAttribute(this.activeAttributeName);
    }
    const targetIndex = children.indexOf(target);
    const previousActiveEntryIndex = previousActiveEntry == null ? -1 : children.indexOf(previousActiveEntry);
    const toReverse = [target];
    const toActivate = [];
    if (targetIndex == previousActiveEntryIndex) {
      await this.onBack(target, target, [target], targetIndex, previousActiveEntryIndex);
      target.toggleAttribute(this.reversedAttributeName, true);
      target.removeAttribute(this.activeAttributeName);
      const itemIndex2 = children.findIndex((item) => item.dataset.timestamp == target.dataset.timestamp);
      const preceedingItemIndex2 = itemIndex2 - 1;
      const preceedingItem2 = preceedingItemIndex2 < 0 || preceedingItemIndex2 > children.length - 1 ? void 0 : children[preceedingItemIndex2];
      if (preceedingItem2 != null) {
        preceedingItem2.toggleAttribute(this.activeAttributeName, true);
      }
      this.dispatchEvent(new CustomEvent("reverse", { detail: { target, previousActiveEntry, toReverse, toActivate, targetIndex, previousActiveEntryIndex }, bubbles: true, composed: true }));
      return;
    }
    if (previousActiveEntryIndex > targetIndex) {
      for (let i = previousActiveEntryIndex; i > targetIndex; i--) {
        toReverse.push(children[i]);
      }
    } else if (previousActiveEntryIndex < targetIndex) {
      for (let i = previousActiveEntryIndex + 1; i <= targetIndex; i++) {
        toActivate.push(children[i]);
      }
    } else {
      throw new Error("Unable to determine action");
    }
    const activationProperties = { target, previousActiveEntry, toReverse, toActivate, targetIndex, previousActiveEntryIndex };
    if (toReverse.length > 0) {
      for (let i = 0; i < toReverse.length; i++) {
        toReverse[i].toggleAttribute(this.reversedAttributeName, true);
      }
      const reverseTarget = toReverse[toReverse.length - 1];
      await this.onBack(reverseTarget, previousActiveEntry, toReverse, children.indexOf(reverseTarget), previousActiveEntryIndex);
    } else if (toActivate.length > 0) {
      for (let i = 0; i < toActivate.length; i++) {
        toActivate[i].removeAttribute(this.reversedAttributeName);
      }
      const activateTarget = toActivate[toActivate.length - 1];
      await this.onForward(activateTarget, previousActiveEntry, toActivate, children.indexOf(activateTarget), previousActiveEntryIndex);
    }
    const itemIndex = children.findIndex((item) => item.dataset.timestamp == target.dataset.timestamp);
    const preceedingItemIndex = itemIndex - 1;
    const preceedingItem = preceedingItemIndex < 0 || preceedingItemIndex > children.length - 1 ? void 0 : children[preceedingItemIndex];
    if (preceedingItem != null) {
      preceedingItem.toggleAttribute(this.activeAttributeName, true);
    }
    target.removeAttribute(this.activeAttributeName);
    this.dispatchEvent(new CustomEvent("reverse", { detail: activationProperties, bubbles: true, composed: true }));
  }
  static observedAttributes = ["reverse"];
  attributeChangedCallback(attributeName, _oldValue, newValue) {
    if (attributeName == "reverse") {
      this.updateOrder();
    }
  }
};
if (customElements.get(COMPONENT_TAG_NAME) == null) {
  customElements.define(COMPONENT_TAG_NAME, ActionHistoryElement);
}
export {
  ATTRIBUTENAME_ACTIVE,
  ATTRIBUTENAME_ENTRY,
  ATTRIBUTENAME_REVERSED,
  ATTRIBUTENAME_TIMESTAMP,
  ActionHistoryElement,
  HistoryEntryType
};
