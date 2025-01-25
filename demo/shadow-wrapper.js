import '../vanilla/action-history.js';
const COMPONENT_TAG_NAME = 'shadow-wrapper';
export class ShadowWrapperElement extends HTMLElement
{
    constructor()
    {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = `<action-history part="action-history" placeholder="History is empty" reverse>
                            <slot></slot>
                        </action-history>`;
    }
}

if(customElements.get(COMPONENT_TAG_NAME) == null)
{
    customElements.define(COMPONENT_TAG_NAME, ShadowWrapperElement);
}