declare enum HistoryEntryType {
    Create = "create",
    Read = "read",
    Update = "update",
    Delete = "delete",
    Custom = "custom"
}

type EntryActivationProperties = {
    target: HTMLElement;
    previousActiveEntry?: HTMLElement;
    toReverse: HTMLElement[];
    toActivate: HTMLElement[];
    targetIndex: number;
    previousActiveEntryIndex: number;
};
declare const ATTRIBUTENAME_REVERSED = "data-reversed";
declare const ATTRIBUTENAME_ACTIVE = "data-active";
declare const ATTRIBUTENAME_ENTRY = "data-entry";
declare const ATTRIBUTENAME_TIMESTAMP = "data-timestamp";
declare class ActionHistoryElement extends HTMLElement {
    #private;
    onBack: (target: HTMLElement, previous: HTMLElement | undefined, toReverse: HTMLElement[], targetIndex: number, previousActiveEntryIndex: number) => Promise<void>;
    onForward: (target: HTMLElement, previous: HTMLElement | undefined, toActivate: HTMLElement[], targetIndex: number, previousActiveEntryIndex: number) => Promise<void>;
    get entryAttributeName(): string;
    get activeAttributeName(): string;
    get reversedAttributeName(): string;
    get timestampAttributeName(): string;
    constructor();
    updateOrder(children?: HTMLElement[]): void;
    /**
     * Activate the previous entry, if it exists.
     * @returns `void`
     */
    back(): void;
    /**
     * Activate the next entry, if it exists.
     * @returns `void`
     */
    forward(): void;
    /**
     *
     * @returns `void`
     */
    activateEntry(target: HTMLElement): Promise<void>;
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
    reverseEntry(target: HTMLElement): Promise<void>;
    static observedAttributes: string[];
    attributeChangedCallback(attributeName: string, _oldValue: string, newValue: string): void;
}

export { ATTRIBUTENAME_ACTIVE, ATTRIBUTENAME_ENTRY, ATTRIBUTENAME_REVERSED, ATTRIBUTENAME_TIMESTAMP, ActionHistoryElement, type EntryActivationProperties, HistoryEntryType };
