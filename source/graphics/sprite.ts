import { CanvasImageSource } from "./canvas";
import { WQShape } from "../math/shape";
import { WQCore } from "../core/core";

/** ------------------------------------------------------------------------ **/
/* * Copyright 2017 MDC
/* * All rights reserved. 
/* *
/* * This file is part of the WebQuail project.
/* *
/** ------------------------------------------------------------------------ **/

class Offsets {
    public xOffset: number;
    public yOffset: number;
    public wOffset: number;
    public hOffset: number;
}

/** ------------------------------------------------------------------------ **/
/* 																			 **/
/* Container for a simple sprite, holds positions and a texture 			 **/
/* 																			 **/
/** ------------------------------------------------------------------------ **/

export class WQTextureSprite {
    public id: string;

    public rawPixelData: ImageData;
    public textureOffsets: Offsets;
    public texture: CanvasImageSource;

    public isLoaded: boolean;
    public forceOverwrite: boolean;
    public useIndividualScale: boolean;
    public scale: number;
    public bounds: any;


    constructor() {
        this.id = 'unknown_sprite';

        this.textureOffsets = { // Offsets in sprite texture for this sprite
            xOffset: 0,
            yOffset: 0,
            wOffset: 0,
            hOffset: 0
        };

        this.isLoaded = false;
        this.forceOverwrite = true;
        this.useIndividualScale = false;
        this.bounds = WQShape.createNewAABBRectangle();
        this.scale = 1; // Individual scale of this sprite
    }

    load(core: WQCore, path: string, onLoadCallback: Function) {
        if (this.protectOverwrite()) {
            let makeTexture = () => {
                this.texture = this.texture;
                if (!this.texture || this.forceOverwrite) {
                    this.texture = new CanvasImageSource()
                    this.texture.data = new Image();
                }
                return this.texture;
            }
            this.texture = makeTexture();
            core.onEvent(this, "load", this.performLoad, this.texture);
            core.onEvent(this, "loadend", onLoadCallback, this.texture);
            this.texture.data.src = path;
        }
    };

    loadBitmaped(core: WQCore, path: string, onLoadCallback: Function) {
        if (this.protectOverwrite()) {
            var selfContext = this;

            if (window && window.createImageBitmap) {
                var canvas = document.createElement('canvas');
                var context = canvas.getContext('2d');
                if (context) {
                    let makeTexture = () => {
                        this.texture = this.texture;
                        if (!this.texture || this.forceOverwrite) {
                            this.texture = new CanvasImageSource()
                            this.texture.data = new Image();
                        }
                        return this.texture;
                    }

                    this.texture = makeTexture();
                    core.onEvent(this, "loadend", onLoadCallback, selfContext.texture.data);
                    core.onEvent(this, "load", function () {
                        var o = selfContext.textureOffsets;
                        if (context) {
                            context.drawImage(selfContext.texture.data, 0, 0, o.wOffset, o.hOffset, o.xOffset, o.yOffset, o.wOffset, o.hOffset);
                            selfContext.rawPixelData = context.getImageData(0, 0, o.wOffset, o.hOffset);
                            window.createImageBitmap(canvas, 0, 0, o.wOffset, o.hOffset).then(function (bitmap) {
                                selfContext.texture.data = bitmap;
                                selfContext.performLoad();
                                onLoadCallback();
                            });
                        }
                    }, this.texture.data);

                    this.texture.data.src = path;
                }
            }
        }
    };

    performLoad() {
        this.isLoaded = true;
    };

    setBounds(x: number, y: number, w: number, h: number) {
        this.bounds.setPosition(x, y, w, h);
    };

    setOffsets(x: number, y: number, w: number, h: number) {
        this.textureOffsets.xOffset = x;
        this.textureOffsets.yOffset = y;
        this.textureOffsets.wOffset = w;
        this.textureOffsets.hOffset = h;
    };

    move(x: number, y: number) {
        this.bounds.setPosition(x, y);
    };

    grow(delta: number) {
        this.bounds.growSize(delta);
    };

    protectOverwrite() {
        if (this.texture && !this.forceOverwrite) {
            WQCore.logger.printDetailed("QWQ_2DRenderer", "Overwriting texture from file: " + this.texture.data.src);
        }
        return true;
    };

    getRawPixelData(): ImageData {
        if (!this.rawPixelData || this.rawPixelData.data.length === 0) {
            throw 'You can only retrieve raw pixel data if this sprite texture was created by a call to loadBitmaped';
        }
        return this.rawPixelData;
    }
}