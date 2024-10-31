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

    #slot: HTMLSlotElement;

    constructor()
    {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot!.innerHTML = `<slot></slot>`;
        this.shadowRoot!.adoptedStyleSheets.push(COMPONENT_STYLESHEET);
        
        this.#slot = this.shadowRoot!.querySelector(`slot`) as HTMLSlotElement;
        this.#slot.addEventListener('slotchange', (event) =>
        {

            const children = this.#slot.assignedElements();
            this.querySelector(`[${this.activeAttributeName}][${this.timestampAttributeName}]`)?.removeAttribute(this.activeAttributeName);
            let lastChild: Element|null = null;
            for(let i = 0; i < children.length; i++)
            {
                if((children[i] as HTMLElement).getAttribute(this.entryAttributeName) == null)
                { continue; }
                
                lastChild = children[i];

                if(children[i].hasAttribute(this.timestampAttributeName))
                { continue; }
                
                // if any entries have been reversed, remove them before
                // adding a new entry
                const toReverse = [...this.querySelectorAll('[data-reversed]')];
                for(let i = 0; i < toReverse.length; i++)
                {
                    toReverse[i].remove();
                }

                children[i].setAttribute(this.timestampAttributeName, Date.now().toString());
                this.updateOrder();

                this.dispatchEvent(new CustomEvent('add', { detail: { target: children[i] }}));
            }
            if(this.querySelector(`[${this.activeAttributeName}]`) == null && lastChild != null && lastChild.getAttribute(this.reversedAttributeName) == null)
            {
                lastChild.toggleAttribute(this.activeAttributeName, true);
            }
        });

        
        this.addEventListener('click', (event: Event) => 
        {
            const target = (event.target as HTMLElement).closest(`[${this.entryAttributeName}]`) as HTMLElement;
            if(target == null) { return; }
            this.activateEntry(target);
        })
    }

    updateOrder(children?: HTMLElement[])
    {
        children = children ?? this.#slot.assignedElements() as HTMLElement[];
        if(this.hasAttribute('reverse'))
        {
            for(let i = 0; i < children.length; i++)
            {
                const order = (this.children.length - i);
                children[i].tabIndex = order;
                children[i].style.order = order.toString();
            }
        }
        else
        {
            for(let i = 0; i < children.length; i++)
            {
                children[i].removeAttribute('tabindex');
                children[i].style.removeProperty('order');
            }
        }
    }

    /**
     * Activate the previous entry, if it exists.
     * @returns `void`
     */
    back()
    {
        const children = [...this.children] as HTMLElement[];
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
        const children = [...this.children] as HTMLElement[];
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
            this.dispatchEvent(new CustomEvent('refresh', { detail: { target } }));
            return;
        }
        const activationProperties = await this.#activateEntry(target);
        this.dispatchEvent(new CustomEvent('activate', { detail: activationProperties }));
    }
    async #activateEntry(target: HTMLElement)
    {
        const children = [...this.children] as HTMLElement[];
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
        const children = [...this.children] as HTMLElement[];
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
            const preceedingItem = this.querySelector(`[data-entry]:has(+ [data-timestamp="${target.dataset.timestamp}"])`) as HTMLElement;
            if(preceedingItem != null)
            {
                preceedingItem.toggleAttribute(this.activeAttributeName, true);
            }
            this.dispatchEvent(new CustomEvent('reverse', { detail: { target, previousActiveEntry, toReverse, toActivate, targetIndex: targetIndex, previousActiveEntryIndex } }));
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

        const preceedingItem = this.querySelector(`[data-entry]:has(+ [data-timestamp="${target.dataset.timestamp}"])`) as HTMLElement;
        if(preceedingItem != null)
        {
            preceedingItem.toggleAttribute(this.activeAttributeName, true);
        }

        target.removeAttribute(this.activeAttributeName);

        this.dispatchEvent(new CustomEvent('reverse', { detail: activationProperties }));
    }

    static observedAttributes = [ /* 'placeholder',*/ 'reverse' ];
    attributeChangedCallback(attributeName: string, _oldValue: string, newValue: string) 
    {
        // if(attributeName == "placeholder")
        // {
        //     this.shadowRoot!.querySelector('.placeholder')?.setAttribute('data-value', newValue);      
        // }
        // else 
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