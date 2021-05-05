import { StrDefault, EventHooks, CloneArr } from "../defs";
import { WQInputBinding } from "../input/inputBinding";
import { WQConfig, DefaultConfig } from "../config";
import { WQHttpClient } from "../net/httpClient";
import { CanvasObjects } from "../graphics/canvas";

/** ------------------------------------------------------------------------ **/
/* * Copyright 2017 MDC
/* * All rights reserved. 
/* *
/* * This file is part of the WebQuail project.
/* *
/** ------------------------------------------------------------------------ **/

export interface Logger {
    printDetailedFatal: (from: string, message: string, ...obs: Array<any>) => void,
    printDetailed: (from: string, message: string, ...obs: Array<any>) => void,

    printFatal: (message: string | Object, ...obs: Array<any>) => void,

    print: (message: string | Object, ...obs: Array<any>) => void,
    error: (message: string | Object, ...obs: Array<any>) => void;
    warn: (message: string | Object, ...obs: Array<any>) => void,
    info: (message: string | Object, ...obs: Array<any>) => void,
    debug: (message: string | Object, ...obs: Array<any>) => void,

    doLogOutput: () => void
}

class DisplayData {
    canvasElm: HTMLCanvasElement;
    canvasCtx: CanvasRenderingContext2D;
    created: boolean;
}

// Custom event polyfill for IE
if (typeof window.CustomEvent !== 'function') {
    function CustomEvent(event: any, params: any) {
        params = params || { bubbles: false, cancelable: false, detail: undefined };
        var evt = document.createEvent('CustomEvent');
        evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
        return evt;
    };

    CustomEvent.prototype = (<any>window).Event.prototype;
    window.CustomEvent = CustomEvent;
}

// Request animation frame shim adapted from www.paulirish.com
export var fallbackReqAnimShim: any = ((callback: () => void, step?: number, context?: any) => {
    return window.requestAnimationFrame(callback) ||
        window.webkitRequestAnimationFrame(callback) ||
        function (callback: () => void, step?: number, context?: any) {
            context.onTimeout(callback, step);
        }(callback, step, context);
});

class BrowserCapabilities {
    public UAString: string = StrDefault;

    isMobile() { return this.getScreenSize().width <= 760; } // Not sure when to consider a screen a mobile unit. Keep it at 760 for now.
    isExplorer() { return navigator.platform.indexOf('MSIE') > -1 || this.getUAString().indexOf('MSIE') > 0; }
    isChrome() { return navigator.platform.indexOf('Chrome') > -1 || this.getUAString().indexOf('Chrome') > 0; }
    isWindows() { return navigator.platform.indexOf('Win') > -1 || this.getUAString().indexOf('Windows') > 0; }
    isMac() { return navigator.platform.indexOf('Mac') > -1 || this.getUAString().indexOf('Mac') > 0; }

    hasHighResolutionTime() { return performance !== undefined && performance.now(); };

    getUAString() {
        this.UAString = navigator.userAgent;
        return this.UAString;
    }

    getScreenSize() {
        return {
            width: window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth,
            height: window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight
        }
    }
}

/** ------------------------------------------------------------------------ **/
//
// WQ_Core module file
//
// This module is responsible for providing abstractions around internal core-functions of the framework.
// Canvas creation/manipulation, event handling and time management etc.
//
/** ------------------------------------------------------------------------ **/

export class WQCore {

    protected static implGlobals: any = {
        WQLoggerImpl: {
            LOGGER_KEY: Symbol.for("app.bkmg.singleton.wqlogger"),
            doBufferLog: true,
            logIndice: 0,
            buffer: [],

            info: (message: string | Object, ...obs: Array<any>) => {
                console.info(message, ...obs);
            },

            warn: (message: string | Object, ...obs: Array<any>) => {
                console.warn(message, ...obs);
            },

            error: (message: string | Object, ...obs: Array<any>) => {
                console.error(message, ...obs);
            },

            debug: (message: string | Object, ...obs: Array<any>) => {
                if (WQCore.core.config.debug_log) {
                    WQCore.implGlobals.WQLoggerImpl.info(message, ...obs);
                }
            },

            print: (message: string | Object, ...obs: Array<any>) => {
                console.log(message, ...obs);
            },

            printFatal: (from: string, message: string | Object) => {
                WQCore.implGlobals.WQLoggerImpl.print(message);
                throw message;
            },

            printDetailed: (from: string, message: string, ...obs: Array<any>) => {
                let composedMsg = `[${Date.now()}] -> [${from}] ${message}`;
                if (WQCore.implGlobals.WQLoggerImpl.doBufferLog) {
                    WQCore.implGlobals.WQLoggerImpl.buffer[WQCore.implGlobals.WQLoggerImpl.logIndice++] = composedMsg;
                }
                WQCore.implGlobals.WQLoggerImpl.print(composedMsg, ...obs);
            },

            printDetailedFatal: (from: string, message: string) => {
                WQCore.implGlobals.WQLoggerImpl.printDetailed(from, message);
                throw message;
            },

            doLogOutput: () => {
                var indice = WQCore.implGlobals.WQLoggerImpl.buffer.length;
                for (; indice > 0; --indice) {
                    if (typeof WQCore.implGlobals.WQLoggerImpl.buffer[indice] !== 'undefined') {
                        WQCore.implGlobals.WQLoggerImpl.print(WQCore.implGlobals.WQLoggerImpl.buffer[indice]);
                    }
                }
            }
        }
    };

    public displayData: Array<DisplayData> = new Array<DisplayData>();
    public static logger: Logger = WQCore.implGlobals.WQLoggerImpl;

    private static core: WQCore;
    
    private readonly ERROR_NOT_SUPPORTED: string = "Canvas is not supported by your browser. Please try a different modern browser";

    private eventHooks: Map<string, (event: any) => void> = new Map<string, (event: any) => void>();

    private browserCapabilities: BrowserCapabilities = new BrowserCapabilities();

    private baseHTTPClient: WQHttpClient;
    private inputState: WQInputBinding;

    private ConfigObj: WQConfig = DefaultConfig;
    private windowLostFocus: boolean = false;
    private startClock: number = Date.now();

    private shouldReorderCanvasDrawing: boolean = true;

    private debounceDefaultTime = (1000 / 60) * 2; // Debounce time in ms
    private throttleDefaultTime = (1000 / 60) * 2; // Throttle time in ms

    constructor() {
        if (this.browserCapabilities && this.browserCapabilities.hasHighResolutionTime()) {
            this.startClock = this.rawMilliseconds;
        }
    };

    handleSystemEvents() {
        let availableHooks = new EventHooks();
        let rHook = this.eventHooks.get(availableHooks.RESIZE_HOOK);
        let bHook = this.eventHooks.get(availableHooks.BLUR_HOOK);
        let fHook = this.eventHooks.get(availableHooks.FOCUS_HOOK);

        this.onDebounceEvent(availableHooks.RESIZE_HOOK, (evt: any) => {
            this.resizeCanvas.call(this);
            this.resizeGameview.call(this);
            if (rHook) { rHook({ event: evt }); }
        }, window);

        this.onDebounceEvent(availableHooks.FOCUS_HOOK, (evt: any) => {
            this.OnReceiveFocus.call(this);
            if (fHook) { fHook({ event: evt }); }
        }, window);

        this.onDebounceEvent(availableHooks.BLUR_HOOK, (evt: any) => {
            this.onLostFocus.call(this);
            if (bHook) { bHook({ event: evt }); }
        }, window);
    };

    debounce(fn: (evt: any) => any, delay?: number) {
        let inDebounce: any = undefined;

        return (evt: any) => {
            const fnArgs: any = evt;
            const context = this

            clearTimeout(inDebounce);
            inDebounce = setTimeout(() => {
                inDebounce = null;
                fn.call(context, fnArgs)
            }, delay);
        };
    }

    throttle(fn: (evt: any) => void, self: any, delay?: number) {
        let context: any = self ? self : this;
        let performedfn: boolean = false;
        const fnArgs: any = arguments;

        let performEvent = (evt: any) => {
            fn.apply(context, fnArgs);
            performedfn = false;
        };

        let magicUndefinedTimerId = -999;
        let lastTimerId: number = magicUndefinedTimerId;

        return (evt: any) => {
            if (!performedfn) {
                if (lastTimerId != magicUndefinedTimerId) { clearTimeout(lastTimerId); }
                return (lastTimerId = window.setTimeout(performEvent, delay ? delay : this.ConfigObj.tick_timestep));
            }
            fn.call(context, evt)
            performedfn = true;
        };
    }

    onEvent(from: any, targetID: string, callee: any, listener: HTMLElement | Window | any = window) {
        listener.addEventListener(targetID,
            (callEvent: any) => {
                callee.call(from, callEvent);
            }, false);
    };

    // TODO: We must be able to pass event-data to the callbacks. This does not currently work.
    onThrottleEvent(targetID: string, callee: any, listener: HTMLElement | Window | any = window) {
        listener.addEventListener(targetID, this.throttle(callee, this, this.throttleDefaultTime), false);
    };

    onDebounceEvent(targetID: string, callee: any, listener: HTMLElement | Window | any = window) {
        listener.addEventListener(targetID, this.debounce(callee, this.debounceDefaultTime), false);
    };

    triggerEvent(from: any, targetID: string, listener: any = window) {
        try {
            let event: any = new window.CustomEvent(targetID, {
                detail: {
                    quailDispatched: true
                }
            });

            // And special case for IE11...
            let nocustomevt = this.browserCapabilities.isExplorer();
            if (nocustomevt) { event = new Event(targetID); }
            listener.dispatchEvent(event);
        } catch (e) {
            WQCore.logger.print(`triggerEvent - failed to dispatch event (Unkown targetID - ${targetID})`);
        }
    };

    addEventHook(key: string, action: (evt: any) => void) {
        if (this.eventHooks && this.eventHooks.has(key)) {
            return WQCore.implGlobals.WQLoggerImpl.print("addEventHook - hook does already exist, overwriting is not allowed.");
        }

        if (this.eventHooks) {
            this.eventHooks.set(key, action);
            this.handleSystemEvents();
        }
    }

    createCanvasElement(id: number) {
        this.displayData[id] = new DisplayData();
        var container = this.getElement('game-view');
        var wndWidth = this.ConfigObj.display_default_width;
        var wndHeight = this.ConfigObj.display_default_height;

        var canvasElm = this.createElement('canvas') as HTMLCanvasElement;
        if (typeof canvasElm.getContext === 'undefined') {
            canvasElm.innerHTML = this.ERROR_NOT_SUPPORTED;
            this.displayData[id].created = false;
            return;
        }

        canvasElm.id = `${id}`;
        if (this.shouldReorderCanvasDrawing) {
            let zIndexFunc: (id: number) => string = (id: number): string => {
                return (Object.keys(CanvasObjects).length / 2 - id).toFixed();
            }

            switch (id) {
                case CanvasObjects.GAME_CANVAS: canvasElm.style.zIndex = zIndexFunc(CanvasObjects.GAME_CANVAS); break;
                case CanvasObjects.OVERLAY_CANVAS: canvasElm.style.zIndex = zIndexFunc(CanvasObjects.OVERLAY_CANVAS); break;
                case CanvasObjects.BACKGROUND_CANVAS: canvasElm.style.zIndex = zIndexFunc(CanvasObjects.BACKGROUND_CANVAS); break;
            }
        }

        var canvasCtx = canvasElm.getContext('2d') as CanvasRenderingContext2D;
        this.setElementDims(container, wndWidth, wndHeight, "px");
        canvasElm.height = wndHeight;
        canvasElm.width = wndWidth;

        if (this.ConfigObj.display_clear_color && canvasElm.id == `${CanvasObjects.BACKGROUND_CANVAS}`) {
            canvasElm.style.backgroundColor = this.ConfigObj.display_clear_color;
        }

        container.appendChild(canvasElm);
        this.displayData[id].canvasElm = canvasElm;
        this.displayData[id].canvasCtx = canvasCtx;
        this.displayData[id].created = true;
        return this.displayData[id];
    };

    resizeCanvas() {
        if (!this.config.display_generate_canvas_ui) {
            return WQCore.implGlobals.WQLoggerImpl.printDetailed('WebQuail_Core', 'display_generate_canvas_ui false - No Canvas element is allowed');
        }

        if (typeof this.displayData === 'undefined' || !this.displayData || !this.displayData[0] || !this.displayData[0].created) {
            WQCore.implGlobals.WQLoggerImpl.printDetailed('WebQuail_Core', 'Failed to resize - No Canvas element created');
            return false;
        }

        let c = this.ConfigObj;
        let wWidth = c.display_default_width;
        let wHeight = c.display_default_height;
        let container = this.getElement('game-view');
        var footer = this.getElement('footer-info-text', { id: false });

        if (c.display_fullscreen) {
            wWidth = window.innerWidth;
            wHeight = window.innerHeight;

            if (!c.display_allow_shrink) {
                if (wWidth < c.display_default_width) {
                    wWidth = c.display_default_width;
                }
                if (wHeight < c.display_default_height) {
                    wHeight = c.display_default_height;
                }
            }
        }

        wHeight = wHeight - footer.clientHeight;
        this.resizeDisplayData(wWidth, wHeight);
        this.setElementDims(container, wWidth, wHeight, 'px');
    };

    resizeGameview() {
        let undefed = this.getElement('webquail-container', { id: false });
        if (typeof undefed === 'undefined' || !undefed) {
            WQCore.implGlobals.WQLoggerImpl.printDetailed('WebQuail_Core', 'Failed to resize game view - No webquail-container created');
            return false;
        }

        let wq_footer = this.getElement('footer-info-text', { id: false });
        let wq_container = this.getElement('webquail-container', { id: false });
        let wq_footer_size = wq_footer.clientHeight;

        this.setElementPosition(wq_container, 0, wq_footer_size);
    };

    resizeDisplayData(wWidth: number, wHeight: number) {
        this.displayData.forEach((displayObj, index, array) => {
            var canvasCtx = displayObj.canvasCtx;
            var canvas = displayObj.canvasElm;

            canvas.width = wWidth;
            canvas.height = wHeight;

            if (this.ConfigObj.display_smoothing_disabled) {
                (canvas.style as any).imageRendering = "pixelated";
                this.disableImageSmoothing(canvasCtx);
            }
        }, this);
    };

    useDefaultMouseCursor() {
        var hideCursorYesNo = this.ConfigObj.display_hide_cursor;
        this.displayData.forEach((displayObj, index, array) => {
            var element = displayObj.canvasElm;
            this.setElementMousePointer(element, !hideCursorYesNo ? false : true, 'pointer');
        }, this);
    };

    // Do not perform any pixel interpolation. Bad for pixel art. 
    disableImageSmoothing = function (canvasCtx: CanvasRenderingContext2D) {
        (<any>canvasCtx).mozImageSmoothingEnabled = false;
        (<any>canvasCtx).oImageSmoothingEnabled = false;
        canvasCtx.imageSmoothingEnabled = false;
    };

    setElementDims = function (element: HTMLElement, elmWidth: number, elmHeight: number, unit?: string) {
        unit = (typeof unit === 'string') ? unit : 'px';
        element.style.width = elmWidth + unit;
        element.style.height = elmHeight + unit;
    };

    setElementMargin = function (element: HTMLElement, elmMarginTop: number, elmMarginBottom: number, unit?: string) {
        unit = (typeof unit === 'string') ? unit : 'px';
        element.style.marginTop = elmMarginTop + unit;
        element.style.marginBottom = elmMarginBottom + unit;
    };

    setElementPosition = function (element: HTMLElement, elmTop: number, elmBottom: number, unit?: string) {
        unit = (typeof unit === 'string') ? unit : 'px';
        element.style.top = elmTop + unit;
        element.style.bottom = elmBottom + unit;
    };

    setElementMousePointer(element: HTMLElement, pointerYesNo: boolean, pointerKind: string) {
        if (typeof element != 'undefined') {
            var hasKind = (typeof pointerKind != 'undefined');
            element.style.cursor = (hasKind && pointerYesNo) ? 'none' : pointerKind;
        }
    };

    getElement = function (name: string, selector?: any): HTMLElement {
        if (typeof selector === 'undefined') {
            selector = {};
            selector.id = true;
        }

        var getObj = ((selector.id) ? document.getElementById(name)
            : document.querySelector(selector.id ? `#${name}` : `.${name}`));

        return getObj as HTMLElement;
    };

    getAllElements = function (name: string, selector?: any): NodeListOf<Element> {
        if (typeof selector === 'undefined') {
            selector = '.';
        }

        return document.querySelectorAll(`${selector}${name}`);
    };

    createElement(name: string): any {
        return document.createElement(name);
    };

    onLostFocus() {
        if (!this.ConfigObj.display_always_focus) { this.windowLostFocus = true; }
    };

    OnReceiveFocus() { 
        this.windowLostFocus = false; 
    };

    onTimeout(delay: number, callback: any) { return window.setTimeout(callback, delay); };
    onInterval(delay: number, callback: any) { return window.setInterval(callback, delay); };

    set config(config: WQConfig) { this.ConfigObj = config; };
    get config(): WQConfig { return this.ConfigObj; }

    set httpClient(httpClient: WQHttpClient) { this.baseHTTPClient = httpClient; };
    get httpClient(): WQHttpClient { return this.baseHTTPClient; };

    set inputBinding(inputState: WQInputBinding) { this.inputState = inputState; };
    get inputBinding(): WQInputBinding { return this.inputState; };

    get rawDisplayData() { return this.displayData; }
    get cloneDisplayData() { return CloneArr(this.displayData); }

    get isExplorer() { return this.browserCapabilities.isExplorer(); }
    get isWindows() { return this.browserCapabilities.isWindows(); }
    get isMobile() { return this.browserCapabilities.isMobile(); }
    get isChrome() { return this.browserCapabilities.isChrome(); }
    get isSafari() { return this.browserCapabilities.isMac(); }

    get fullscreen() { return this.ConfigObj.display_fullscreen; };
    get pixelMultiplier() { return this.ConfigObj.display_pixel_multiplier; };
    get capabilities(): BrowserCapabilities { return this.browserCapabilities; }

    static get instance(): WQCore { return this.core || (this.core = new this()); }

    get elapsedMilliseconds() {
        if (this.browserCapabilities.hasHighResolutionTime()) {
            return (performance.now() - this.startClock);
        }
        return (Date.now() - this.startClock);
    };

    get rawMilliseconds() {
        if (this.browserCapabilities.hasHighResolutionTime()) {
            return performance.now();
        }
        return Date.now();
    };
};