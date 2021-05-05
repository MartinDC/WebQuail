import { WQCore } from "../core/core";
import { WQInputDefs } from "./inputDefs";
import { CanvasObjects } from "../graphics/canvas";

/** ------------------------------------------------------------------------ **/
/* * Copyright 2017 MDC
/* * All rights reserved. 
/* *
/* * This file is part of the WebQuail project.
/* *
/** ------------------------------------------------------------------------ **/

class HistoryBuffer {
    inputHistory: Array<number> = new Array<number>();

    keyCounter: number = 0;
    mouseCounter: number = 0;

    constructor() {

    }
};

export class BindingDescriptor {
    keyCode: number = -1;
    keyIsDown: boolean = false;
    keyWasDown: boolean = false;

    bindingType: string = "N/A";
    bindingName: string = "N/A";

    constructor() {

    }
}

/** ------------------------------------------------------------------------ **/
/* *
/* * Handle mouse and keyboard bindings. Polling for real-time state. 
/* *
/** ------------------------------------------------------------------------ **/

export class WQInputBinding {

    isKeyPressed: boolean = false;
    useClientSpace: boolean = true;
    allowFunctionKeys: boolean = true;
    preventOverWrite: boolean = false;
    shouldPreventBubbling: boolean = false;

    mouseX: number = 0;
    mouseY: number = 0;

    clientSpaceElement: HTMLElement | Window;

    mouseState: Array<boolean> = new Array<boolean>();
    keyboardState: Array<boolean> = new Array<boolean>();
    bindings: Array<BindingDescriptor> = new Array<BindingDescriptor>();
    historyBuffer: HistoryBuffer = new HistoryBuffer();
    inputDefs: WQInputDefs = new WQInputDefs;

    doRegister(quailCore: WQCore) {
        let topLevelDisplayObj = quailCore.displayData[CanvasObjects.GAME_CANVAS];
        this.clientSpaceElement = (this.useClientSpace && topLevelDisplayObj) ? topLevelDisplayObj.canvasElm : window;

        if (typeof this.clientSpaceElement !== 'undefined') {
            quailCore.onEvent(this, 'keyup', this.onKeyUp, window);
            quailCore.onEvent(this, 'keydown', this.onKeyDown, window);

            quailCore.onEvent(this, 'mouseup', this.onMouseUp, this.clientSpaceElement);
            quailCore.onEvent(this, 'mousedown', this.onMouseDown, this.clientSpaceElement);
            quailCore.onEvent(this, 'mousemove', this.onMouseMove, this.clientSpaceElement);
        }
    };

    addBinding(bindingName: string, keyInfo: BindingDescriptor) {
        if (typeof this.bindings !== 'undefined') {
            let sameBinding = (element: any, index: number, array: Array<any>) => {
                return (element.bindingName === bindingName);
            };

            var bindingIndex = this.bindings.findIndex(sameBinding);
            if (bindingIndex !== -1 && this.preventOverWrite) {
                return WQCore.logger.printDetailed("WQ_InputBinding", "Binding of " + bindingName + "is already set! ");
            }

            var bDescriptor = BindingDescriptor.constructor();
            bDescriptor.keyCode = keyInfo.keyCode;
            bDescriptor.keyIsDown = keyInfo.keyIsDown;
            bDescriptor.keyWasDown = keyInfo.keyWasDown;
            bDescriptor.bindingType = keyInfo.bindingType;
            bDescriptor.bindingName = bindingName;
            this.bindings.push(bDescriptor);
        }
    };

    getBindingLength() {
        return this.bindings.length;
    };

    getRawKeyboardState() {
        return this.keyboardState;
    };

    getRawMouseState() {
        return this.mouseState;
    };

    getHistoryBuffer() {
        return this.historyBuffer;
    };

    clearHistoryBuffer() {
        this.historyBuffer.inputHistory = new Array<number>();
    };

    isAnyKeyPressed() {
        return this.isKeyPressed;
    };

    releaseBindings() {
        this.bindings = [];
    };

    releaseInputState() {
        this.isKeyPressed = false;

        this.keyboardState = new Array<boolean>();
        this.mouseState = new Array<boolean>();
    };

    /* Consider element placement offsets if capturing mouse event on client rectangle only */
    getOffsetBounds(): { elementOffsetX: number, elementOffsetY: number } {
        var offsetBounds = { elementOffsetX: 0, elementOffsetY: 0 };
        if (typeof this.clientSpaceElement !== 'undefined' && this.clientSpaceElement instanceof HTMLElement) {
            offsetBounds.elementOffsetX = this.clientSpaceElement.offsetLeft;
            offsetBounds.elementOffsetY = this.clientSpaceElement.offsetTop;

            // Consider scrolling of the page
            offsetBounds.elementOffsetX += this.clientSpaceElement.scrollLeft;
            offsetBounds.elementOffsetY += this.clientSpaceElement.scrollTop;
        }

        //TODO: ClientSpaceElement can be of type Window

        return offsetBounds;
    };

    pollInputState() {
        var bindingLength = this.bindings.length;
        var mouseStateLength = this.mouseState.length;
        var keyboardStateLength = this.keyboardState.length;

        if (typeof this.bindings != 'undefined' && bindingLength > 0) {
            for (var b_iter = bindingLength - 1; b_iter >= 0; --b_iter) {
                var bindingType = this.bindings[b_iter].bindingType;
                var bindingCode = this.bindings[b_iter].keyCode;
                var bindingPtr = this.bindings[b_iter];

                bindingPtr.keyWasDown = bindingPtr.keyIsDown;

                if (bindingType === "KB") {
                    bindingPtr.keyIsDown = false;
                    if (this.keyboardState[bindingCode]) {
                        bindingPtr.keyIsDown = this.keyboardState[bindingCode];
                    }
                } else if (bindingType === "MB") {
                    bindingPtr.keyIsDown = false;
                    if (this.mouseState[bindingCode]) {
                        bindingPtr.keyIsDown = this.mouseState[bindingCode];
                    }
                }
            }
        }
    };

    getLetterKeyCode(charLetter: string): any {
        return this.inputDefs.Letter[charLetter];
    };

    getDigitKeyCode(charDigit: string): any {
        return this.inputDefs.Digit[charDigit];
    };

    getModifierKeyCode(charModifier: string): any {
        return this.inputDefs.Modifier[charModifier];
    };

    bindingDown(binding: string) {
        var b = this.findBindingName(binding);
        return (b.keyIsDown);
    };

    bindingClick(binding: string) {
        var b = this.findBindingName(binding);
        return (b.keyWasDown && !b.keyIsDown);
    };

    onKeyUp(eventData: KeyboardEvent) {
        ++this.getHistoryBuffer().keyCounter;
        this.isKeyPressed = !this.isKeyPressed;

        var keyCode = eventData.keyCode;
        if (keyCode != 122 && keyCode != 116 || !this.allowFunctionKeys) {
            this.preventEventBubbling(eventData, false);
        }

        this.getHistoryBuffer().inputHistory.push(eventData.keyCode);
        this.keyboardState[keyCode] = false;
    };

    onKeyDown(eventData: KeyboardEvent) {
        this.isKeyPressed = true;

        var keyCode = eventData.keyCode;
        if (keyCode != 122 && keyCode != 116 || !this.allowFunctionKeys) {
            this.preventEventBubbling(eventData, false);
        }

        this.keyboardState[keyCode] = true;
    };

    onMouseUp(eventData: MouseEvent) {
        var mouseButton = eventData.button;
        ++this.getHistoryBuffer().mouseCounter;
        this.mouseState[mouseButton] = false;

        this.preventEventBubbling(eventData);
    };

    onMouseDown(eventData: MouseEvent) {
        var mouseButton = eventData.button;
        this.mouseState[mouseButton] = true;

        this.preventEventBubbling(eventData);
    };

    onMouseMove(eventData: MouseEvent) {
        var clientRectOffset = this.getOffsetBounds();
        var offsetX = clientRectOffset.elementOffsetX + eventData.clientX;
        var offsetY = clientRectOffset.elementOffsetY + eventData.clientY;

        this.mouseX = offsetX;
        this.mouseY = offsetY;
    };

    findBindingName(binding: string) {
        let b = BindingDescriptor.constructor();
        for (var i = this.bindings.length - 1; i >= 0; --i) {
            var tmp = this.bindings[i];
            if (tmp.bindingName === binding) {
                b = tmp;
            }
        }
        return b;
    };

    private preventEventBubbling(eventData: Event, force: boolean = false) {
        if(this.shouldPreventBubbling || force) {
            eventData.preventDefault();
            eventData.stopPropagation();
        }
    }
};