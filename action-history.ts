import { default as style } from './action-history.css?raw';
import { HistoryEntryType } from './history-entry-type.enum';

export { HistoryEntryType };
export type EntryActivationProperties = 
{
    target: HTMLElement,
    previousActiveEntry?: HTMLElement,
    toReverse: HTMLElement[]
    toActivate: HTMLElement[],
    targetIndex: number,
    previousActiveEntryIndex: number
};

export const ATTRIBUTENAME_REVERSED = 'data-reversed';
export const ATTRIBUTENAME_ACTIVE = 'data-active';
export const ATTRIBUTENAME_ENTRY = 'data-entry';
export const ATTRIBUTENAME_TIMESTAMP = 'data-timestamp';

const COMPONENT_STYLESHEET = new CSSStyleSheet();
COMPONENT_STYLESHEET.replaceSync(style);

const COMPONENT_TAG_NAME = 'action-history';
export class ActionHistoryElement extends HTMLElement
{
    onBack: (target: HTMLElement, previous: HTMLElement|undefined, toReverse: HTMLElement[], targetIndex: number, previousActiveEntryIndex: number) => Promise<void>
    = async (target: HTMLElement, previous: HTMLElement|undefined, toReverse: HTMLElement[], targetIndex: number, previousActiveEntryIndex: number) => { };
    onForward: (target: HTMLElement, previous: HTMLElement|undefined, toActivate: HTMLElement[], targetIndex: number, previousActiveEntryIndex: number) => Promise<void>
    = async (target: HTMLElement, previous: HTMLElement|undefined, toActivate: HTMLElement[], targetIndex: number, previousActiveEntryIndex: number) => { };

    get entryAttributeName()
    {
        return this.getAttribute('entry-attribute') ?? ATTRIBUTENAME_ENTRY;
    }
    get activeAttributeName()
    {
        return this.getAttribute('active-attribute') ?? ATTRIBUTENAME_ACTIVE;
    }
    get reversedAttributeName()
    {
        return this.getAttribute('reversed-attribute') ?? ATTRIBUTENAME_REVERSED;
    }
    get timestampAttributeName()
    {
        return this.getAttribute('timestamp-attribute') ?? ATTRIBUTENAME_TIMESTAMP;
    }

    #slot!: HTMLSlotElement;
    #boundSlotChange: (_event: Event) => void;

    constructor()
    {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot!.innerHTML = `<slot></slot>`;
        this.shadowRoot!.adoptedStyleSheets.push(COMPONENT_STYLESHEET);

        this.#boundSlotChange = ((_event: Event) =>
        {
            const children = this.#slot.assignedElements();
            if(children.length == 1 && children[0] instanceof HTMLSlotElement)
            {
                let descendantSlot = children[0];
                let descendantSlotChildren = descendantSlot.assignedElements()
                while(descendantSlot instanceof HTMLSlotElement && descendantSlotChildren[0] instanceof HTMLSlotElement)
                {
                    descendantSlot = descendantSlotChildren[0];
                    if(descendantSlot instanceof HTMLSlotElement)
                    {
                        descendantSlotChildren = descendantSlot.assignedElements();
                    }
                }
                this.#registerSlot(descendantSlot);
                return;
            }
            this.#updateEntries(children);
        }).bind(this);
        
        this.#registerSlot(this.shadowRoot!.querySelector(`slot`) as HTMLSlotElement);

        
        this.addEventListener('click', (event: Event) => 
        {
            const target = (event.target as HTMLElement).closest(`[${this.entryAttributeName}]`) as HTMLElement;
            if(target == null) { return; }
            this.activateEntry(target);
        })
    }
    #registerSlot(slot: HTMLSlotElement)
    {
        if(this.#slot != null)
        {
            this.#slot.removeEventListener('slotchange', this.#boundSlotChange);
        }
        this.#slot = slot;
        this.#slot.addEventListener('slotchange', this.#boundSlotChange);
        const children = this.#slot.assignedElements();
        this.toggleAttribute('empty', children.length == 0);
        this.#updateEntries(children);
    }
    #updateEntries(children: Element[])
    {
        // clear selected
        let activeEntry = children.find(item => item.getAttribute(this.activeAttributeName) != null);
        if(activeEntry != null && activeEntry.getAttribute(this.timestampAttributeName) != null)
        {
            activeEntry.removeAttribute(this.activeAttributeName);
            activeEntry = undefined;
        }

        // to initialize a list with reversed entries, the prevent-removal
        // attribute can be used to stop the component from removing
        // reversed entries. This is useful for injecting stored reversed
        // entries without the component assuming that the insertion is a
        // new entry and trying to clear out the reversed actions.
        const canRemoveReversedEntries = this.getAttribute('prevent-removal') == undefined;

        let lastChild: Element|null = null;
        for(let i = 0; i < children.length; i++)
        {
            if((children[i] as HTMLElement).getAttribute(this.entryAttributeName) == null)
            { continue; }
            
            lastChild = children[i];

            if(children[i].hasAttribute(this.timestampAttributeName))
            { continue; }
            
            if(canRemoveReversedEntries == true)
            {
                // if any entries have been reversed, remove them before
                // adding a new entry
                const toReverse = children.filter(item => item.getAttribute(this.reversedAttributeName) != null);
                for(let i = 0; i < toReverse.length; i++)
                {
                    toReverse[i].remove();
                }
            }

            children[i].setAttribute(this.timestampAttributeName, Date.now().toString());
            this.updateOrder(children);

            this.dispatchEvent(new CustomEvent('add', { detail: { target: children[i] }, bubbles: true, composed: true }));
        }
        if(activeEntry == null && lastChild != null && lastChild.getAttribute(this.reversedAttributeName) == null)
        {
            lastChild.toggleAttribute(this.activeAttributeName, true);
        }

        this.toggleAttribute('empty', children.length == 0);
    }

    updateOrder(children?: Element[])
    {
        children = children ?? this.#slot.assignedElements() as HTMLElement[];
        if(this.hasAttribute('reverse'))
        {
            for(let i = 0; i < children.length; i++)
            {
                const order = (children.length - i);
                const element = children[i] as HTMLElement;
                element.tabIndex = order;
                element.style.order = order.toString();
            }
        }
        else
        {
            for(let i = 0; i < children.length; i++)
            {
                const element = children[i] as HTMLElement;
                element.removeAttribute('tabindex');
                element.style.removeProperty('order');
            }
        }
    }

    /**
     * Activate the previous entry, if it exists.
     * @returns `void`
     */
    back()
    {
        const children = this.#slot.assignedElements() as HTMLElement[];
        const activeEntry = children.find(item => item.getAttribute(this.activeAttributeName) != null);
        if(activeEntry == null) { return; }
        const activeIndex = children.indexOf(activeEntry);
        const backIndex = activeIndex - 1;
        if(backIndex == -1)
        {
            // no entry; re-create conditions of entry click;
            new Promise<void>(async (resolve) =>
            {
                await this.onBack(activeEntry, activeEntry, [activeEntry], backIndex, activeIndex);
                activeEntry.toggleAttribute(this.reversedAttributeName, true);
                activeEntry.removeAttribute(this.activeAttributeName);
                resolve();
            });
            return;
        }
        if(backIndex >= 0 && backIndex < children.length)
        {
            const entry = children[backIndex];
            entry.click();
        }
    }
    /**
     * Activate the next entry, if it exists.
     * @returns `void`
     */
    forward()
    {
        const children = this.#slot.assignedElements() as HTMLElement[];
        let activeEntry = children.find(item => item.getAttribute(this.activeAttributeName) != null);
        const forwardIndex = (activeEntry == null) 
        ? (children.length > 0) ? 0 : -1 // use first entry's index  
        : children.indexOf(activeEntry) + 1; // use active entry's index
        if(forwardIndex == -1) { return; }
        if(forwardIndex < children.length)
        {
            const entry = children[forwardIndex];
            entry.click();
        }
    }

    /**
     * 
     * @returns `void`
     */
    async activateEntry(target: HTMLElement)
    {
        if(target.hasAttribute(this.activeAttributeName))
        {
            this.dispatchEvent(new CustomEvent('refresh', { detail: { target }, bubbles: true, composed: true  }));
            return;
        }
        const activationProperties = await this.#activateEntry(target);
        this.dispatchEvent(new CustomEvent('activate', { detail: activationProperties, bubbles: true, composed: true  }));
    }
    async #activateEntry(target: HTMLElement)
    {
        const children = this.#slot.assignedElements() as HTMLElement[];
        const previousActiveEntry = children.find(item => item.getAttribute(this.activeAttributeName) != null);

        if(previousActiveEntry != null) { previousActiveEntry.removeAttribute(this.activeAttributeName); }

        const targetIndex = children.indexOf(target);
        const previousActiveEntryIndex = (previousActiveEntry == null) ? -1 : children.indexOf(previousActiveEntry);

        const toReverse: HTMLElement[] = [];
        const toActivate: HTMLElement[] = [];

        if(previousActiveEntryIndex > targetIndex) // previous 5, current 2: reversal
        {
            for(let i = previousActiveEntryIndex; i > targetIndex; i--)
            {
                toReverse.push(children[i]);
            }
        }
        else if(previousActiveEntryIndex < targetIndex) // previous 2, current 5: activation
        {
            for(let i = previousActiveEntryIndex + 1; i <= targetIndex; i++)
            {
                toActivate.push(children[i]);
            }
        }
        else
        {
            throw new Error('Unable to determine action');
        }


        const activationProperties: EntryActivationProperties = { target, previousActiveEntry, toReverse, toActivate, targetIndex, previousActiveEntryIndex };
        if(toReverse.length > 0)
        {
            for(let i = 0; i < toReverse.length; i++)
            {
                toReverse[i].toggleAttribute(this.reversedAttributeName, true);
            }
            const reverseTarget = toReverse[toReverse.length - 1];            ;
            await this.onBack(reverseTarget, previousActiveEntry, toReverse, children.indexOf(reverseTarget), previousActiveEntryIndex);
        }
        else if(toActivate.length > 0)
        {
            for(let i = 0; i < toActivate.length; i++)
            {
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
    async reverseEntry(target: HTMLElement)
    {
        if(target.hasAttribute(this.reversedAttributeName))
        {
            return;
        }
        const children = this.#slot.assignedElements() as HTMLElement[];
        const previousActiveEntry = children.find(item => item.getAttribute(this.activeAttributeName) != null);

        if(previousActiveEntry != null) { previousActiveEntry.removeAttribute(this.activeAttributeName); }

        const targetIndex = children.indexOf(target);
        const previousActiveEntryIndex = (previousActiveEntry == null) ? -1 : children.indexOf(previousActiveEntry);

        const toReverse: HTMLElement[] = [target];
        const toActivate: HTMLElement[] = [];

        if(targetIndex == previousActiveEntryIndex)
        {
            await this.onBack(target, target, [target], targetIndex, previousActiveEntryIndex);
            target.toggleAttribute(this.reversedAttributeName, true);
            target.removeAttribute(this.activeAttributeName);
            
            const itemIndex = children.findIndex(item => item.dataset.timestamp == target.dataset.timestamp);
            const preceedingItemIndex = itemIndex - 1;
            const preceedingItem = (preceedingItemIndex < 0 || preceedingItemIndex > children.length-1) ? undefined : children[preceedingItemIndex];
            if(preceedingItem != null)
            {
                preceedingItem.toggleAttribute(this.activeAttributeName, true);
            }

            this.dispatchEvent(new CustomEvent('reverse', { detail: { target, previousActiveEntry, toReverse, toActivate, targetIndex: targetIndex, previousActiveEntryIndex }, bubbles: true, composed: true  }));
            return;
        }

        if(previousActiveEntryIndex > targetIndex) // previous 5, current 2: reversal
        {
            for(let i = previousActiveEntryIndex; i > targetIndex; i--)
            {
                toReverse.push(children[i]);
            }
        }
        else if(previousActiveEntryIndex < targetIndex) // previous 2, current 5: activation
        {
            for(let i = previousActiveEntryIndex + 1; i <= targetIndex; i++)
            {
                toActivate.push(children[i]);
            }
        }
        else
        {
            throw new Error('Unable to determine action');
        }

        const activationProperties: EntryActivationProperties = { target, previousActiveEntry, toReverse, toActivate, targetIndex, previousActiveEntryIndex };
        if(toReverse.length > 0)
        {
            for(let i = 0; i < toReverse.length; i++)
            {
                toReverse[i].toggleAttribute(this.reversedAttributeName, true);
            }
            const reverseTarget = toReverse[toReverse.length - 1];
            await this.onBack(reverseTarget, previousActiveEntry, toReverse, children.indexOf(reverseTarget), previousActiveEntryIndex);
        }
        else if(toActivate.length > 0)
        {
            for(let i = 0; i < toActivate.length; i++)
            {
                toActivate[i].removeAttribute(this.reversedAttributeName);
            }
            const activateTarget = toActivate[toActivate.length - 1];
            await this.onForward(activateTarget, previousActiveEntry, toActivate, children.indexOf(activateTarget), previousActiveEntryIndex);
        }

        const itemIndex = children.findIndex(item => item.dataset.timestamp == target.dataset.timestamp);
        const preceedingItemIndex = itemIndex - 1;
        const preceedingItem = (preceedingItemIndex < 0 || preceedingItemIndex > children.length-1) ? undefined : children[preceedingItemIndex];
        if(preceedingItem != null)
        {
            preceedingItem.toggleAttribute(this.activeAttributeName, true);
        }

        target.removeAttribute(this.activeAttributeName);

        this.dispatchEvent(new CustomEvent('reverse', { detail: activationProperties, bubbles: true, composed: true  }));
    }

    static observedAttributes = [ 'reverse' ];
    attributeChangedCallback(attributeName: string, _oldValue: string, newValue: string) 
    {
        if(attributeName == 'reverse')
        {
            this.updateOrder();
        }
    }
}

if(customElements.get(COMPONENT_TAG_NAME) == null)
{
    customElements.define(COMPONENT_TAG_NAME, ActionHistoryElement);
}