import { WQInputBinding } from "../input/inputBinding";
import { WQCore, fallbackReqAnimShim } from "./core";
import { CanvasObjects } from "../graphics/canvas";
import { WQRenderer } from "../graphics/renderer";
import { WQHttpClient } from "../net/httpClient";
import { WQSimpleGame } from "./simpleGame";
import { EventHooks } from "../defs";
import { WQConfig } from "../config";

/** ------------------------------------------------------------------------ **/
/* * Copyright 2017 MDC
/* * All rights reserved. 
/* *
/* * This file is part of the WebQuail project.
/* *
/** ------------------------------------------------------------------------ **/

class CanvasConfigObj {
    public readonly layers = CanvasObjects;
    public readonly DEFAULT_CLEAR_COLOR: string = 'rgb(0, 0, 0)'
};

/** ------------------------------------------------------------------------ **/
/* * Driver module file
/* *
/* * This module is responsible for game setup, loop timing, and settings creation, 
/* * before launching the application. 
/* * 
/* * Provides a easy mean for a standalone module to hook into the the main rendering and logic loop.
/* *  
/** ------------------------------------------------------------------------ **/

export class WQDriver {

    private ticks: number = 0;
    private partialTicks: number = 0;
    private lastLoopTime: number = 0;
    private accumulatedTime: number = 0;
    private updateFrameTime: number = 0;
    private currentLoopTime: number = 0;

    private deltaTimedLoop: boolean = false;

    private canvasConfigObj = new CanvasConfigObj;
    private inputBinding: WQInputBinding = new WQInputBinding;

    private httpClient: WQHttpClient;

    private bgRenderer: WQRenderer;
    private olRenderer: WQRenderer;
    private gmRenderer: WQRenderer;

    constructor(core: WQCore) {
        if (!core) { WQCore.logger.printDetailedFatal("CWQ_Driver", "Cannot create driver -> core is undefed!"); }
    }

    private mainTick(elapsed: number): void { };
    private partialTick(elapsed: number): void { };
    private render(interp: number): void { };

    private hookGameInstance(gameInstance: WQSimpleGame) {
        this.mainTick = gameInstance.tick.bind(gameInstance);
        this.partialTick = gameInstance.partial.bind(gameInstance);
    };

    private hookQuailDriver(gameInstance: WQSimpleGame) {
        gameInstance.init(this);
    };

    private doCreateInputBinding() {
        this.inputBinding = new WQInputBinding();
        if (typeof this.quailCore === 'undefined') {
            WQCore.logger.printDetailed("CWQ_Driver", "Core failed to initialize correctly.");
            return this.inputBinding;
        }

        this.inputBinding.doRegister(this.quailCore);
        this.quailCore.inputBinding = this.inputBinding;
    };

    private doCreateHttpClient() {
        if (typeof this.quailCore === 'undefined') {
            WQCore.logger.printDetailed("CWQ_Driver", "Core failed to initialize correctly.");
            return this.httpClient;
        }

        this.httpClient = new WQHttpClient();
        this.httpClient.init(this.quailCore);
        this.quailCore.httpClient = this.httpClient;
    };

    private doMainLoop() {
        this.currentLoopTime = this.quailCore.rawMilliseconds;
        if (this.lastLoopTime <= 0) { this.lastLoopTime = this.currentLoopTime; }

        const config = this.quailCore.config;
        const timestep = config.tick_timestep;

        var frameTime = (this.currentLoopTime - this.lastLoopTime);
        this.lastLoopTime = this.currentLoopTime;
        this.accumulatedTime += frameTime;

        const slowFactor = 2;
        while (this.accumulatedTime >= timestep) {
            this.accumulatedTime -= timestep;
            this.mainTick(timestep);

            if (++this.ticks > 60 + 25) {
                /*TODO this many updats are bad.. panic and reset game state */
            }

            if (this.ticks % slowFactor == 0) { // TODO: This should be time insensitive updates, do it like this for now ...
                this.partialTick(timestep * slowFactor);
                this.inputBinding.pollInputState();
                ++this.partialTicks;
            }
        }

        var interpolationDelta = this.accumulatedTime / timestep;
        this.render(interpolationDelta);
        this.requestAnimationFrame(timestep);

        if (config.display_framerate_logging) {
            this.updateFrames(this.currentLoopTime, frameTime, config.display_frametime_logging);
        }
    };

    private updateFrames(elapsed: number, frame: number, displayFrameTime: boolean) { //TODO exponential moving average
        var frameDisplayDelay = 1000;
        if (elapsed > this.updateFrameTime) {
            let framemsg = `[TIME] [ ${frame} ]`
            this.updateFrameTime = elapsed + frameDisplayDelay;
            WQCore.logger.print(`[UPS - Full] [ ${this.ticks} ] ${displayFrameTime ? framemsg : ''}`);
            WQCore.logger.print(`[UPS - Partial] [ ${this.partialTicks} ] ${displayFrameTime ? framemsg : ''}`);
            this.partialTicks = 0;
            this.ticks = 0;
        }
    };

    private requestAnimationFrame(dt: number) {
        var t = () => { this.doMainLoop(); };
        fallbackReqAnimShim(t, dt, window);
    };

    setConfig(configObj: WQConfig) {
        if (configObj !== undefined && configObj) {
            WQCore.instance.config = configObj;
        }

        let prntcfg = JSON.parse(JSON.stringify(WQCore.instance.config));
        WQCore.logger.printDetailed(this.constructor.name, 'Launched with config %O', prntcfg);
    };

    createNew(gameInstance: WQSimpleGame) {
        this.hookGameInstance(gameInstance);
        if (this.quailCore.config.display_generate_canvas_ui) {
            var bg = this.quailCore.createCanvasElement(this.canvasConfigObj.layers.BACKGROUND_CANVAS);
            var ol = this.quailCore.createCanvasElement(this.canvasConfigObj.layers.OVERLAY_CANVAS);
            var gm = this.quailCore.createCanvasElement(this.canvasConfigObj.layers.GAME_CANVAS);

            var logFn = function (val: string) {
                WQCore.logger.printDetailed('CWQ_Driver', `Failed to create ${val} canvas context! Canvas might be unsupported by browser.`);
            };

            if (!bg || !bg.created) { logFn('bg'); }
            if (!ol || !ol.created) { logFn('ol'); }
            if (!gm || !gm.created) { logFn('gm'); }

            this.bgRenderer = new WQRenderer(this.quailCore, bg.canvasElm, bg.canvasCtx, undefined, true);
            this.olRenderer = new WQRenderer(this.quailCore, ol.canvasElm, ol.canvasCtx, undefined, true);
            this.gmRenderer = new WQRenderer(this.quailCore, gm.canvasElm, gm.canvasCtx, undefined, true);
        }

        if (this.bgRenderer && this.olRenderer && this.gmRenderer) {
            this.quailCore.resizeCanvas();
            this.quailCore.addEventHook(new EventHooks().RESIZE_HOOK, (evt: any) => {
                this.gmRenderer.setBoundsFromCanvas(this.gmRenderer.canvasElement);
                this.bgRenderer.setBoundsFromCanvas(this.bgRenderer.canvasElement);
                this.olRenderer.setBoundsFromCanvas(this.olRenderer.canvasElement);
            });
        }

        this.doCreateHttpClient();
        this.doCreateInputBinding();
        this.quailCore.resizeGameview();
        this.quailCore.useDefaultMouseCursor();
        this.quailCore.handleSystemEvents();
        this.hookQuailDriver(gameInstance);
        this.doMainLoop();
    };

    renderer(id: CanvasObjects): WQRenderer {
        if (!this.quailCore.config.display_generate_canvas_ui) {
            throw WQCore.logger.error('No canvas data created! Cannot fetch renderer...');;
        }

        switch (id) {
            case CanvasObjects.BACKGROUND_CANVAS: return this.bgRenderer;
            case CanvasObjects.OVERLAY_CANVAS: return this.olRenderer;
            case CanvasObjects.GAME_CANVAS: return this.gmRenderer;
        }
    }

    useDeltaTimedLoop(yesno: boolean) {
        this.deltaTimedLoop = yesno;
    };

    get backgroundRenderer() { return this.renderer(CanvasObjects.BACKGROUND_CANVAS); }
    get overlayRenderer() { return this.renderer(CanvasObjects.OVERLAY_CANVAS); }
    get gameRenderer() { return this.renderer(CanvasObjects.GAME_CANVAS); }
    get quailCore(): WQCore { return WQCore.instance; };
}