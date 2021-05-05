import { NotEmpty, GetRadFromDegrees, Defed } from "../defs";
import { Viewport, AlignOption } from "./graphics";
import { WQTextureSprite } from "./sprite";
import { CanvasColor, CanvasImageSource } from "./canvas";
import { WQCore } from "../core/core";
import { WQBresenham } from "../math/bresenham";

/** ------------------------------------------------------------------------ **/
/* * Copyright 2017 MDC
/* * All rights reserved. 
/* *
/* * This file is part of the WebQuail project.
/* *
/** ------------------------------------------------------------------------ **/

export enum RendererShapeType {
	STROKE = 1,
	FILL = 2
}

/** ------------------------------------------------------------------------ **/
/* *
/* * Wrapper around a html5 canvas. Does not support any WebGL operations.
/* *
/** ------------------------------------------------------------------------ **/

// TODO 
// Rendering functions should use a general func. ex "stroke(shapetype.rect)" in the specialised funcs.

export class WQRenderer {

	public readonly quailCore: WQCore;
	public readonly canvasElement: HTMLCanvasElement;
	public readonly canvasContext: CanvasRenderingContext2D;
	public viewport: Viewport = new Viewport();

	public imageLayer: boolean;

	public boundsX: number;
	public boundsY: number;

	constructor(core: WQCore, elem: HTMLCanvasElement, ctx: CanvasRenderingContext2D, bounds?: any, imageLayer?: boolean) {
		if (!core) { WQCore.logger.printDetailedFatal("CWQ_2DRenderer", "Failed to instantiate QuailCore!"); }

		this.quailCore = core;
		this.canvasContext = ctx;
		this.canvasElement = elem;
		if (Defed(bounds)) {
			this.boundsX = bounds.width;
			this.boundsY = bounds.height;
		} else {
			if (Defed(elem)) {
				this.setBoundsFromCanvas(elem);
			}
		}

		this.updateInternalImageData();
		this.imageLayer = imageLayer ? imageLayer : false;
		if (this.quailCore.config.display_pixel_multiplier) {
			this.viewport.scale = this.quailCore.config.display_pixel_multiplier;
			this.setCanvasScaleFromVP();
		}
	};

	public loadedTextures: number = 0; // Total loaded textures
	public spritesCreated: number = 0; // Total sprites created
	public rawImageData: ImageData;

	onTextureCreated() { this.loadedTextures++; };
	onTextureDestroyed() { this.loadedTextures--; };

	onSpriteCreated() { this.spritesCreated++; };
	onSpriteDestroyed() { this.spritesCreated--; };

	setColor(r: number, g: number, b: number, a: number = 255) {
		if (a > 255) { a = 255; }
		return `rgba(${r}, ${g}, ${b}, ${a > 0 ? a / 255 : 0})`;
	};

	setCanvasScaleFromVP() { this.scaleCanvas(this.viewport.scale, this.viewport.scale); }
	getScreenScale(): number { return this.viewport.scale; }
	setScreenScale(s: number) { this.viewport.scale = s; }

	getBounds() { return { width: this.boundsX, height: this.boundsY }; };
	setBoundsFromCanvas(canvasElm: HTMLCanvasElement) {
		if (typeof canvasElm == 'undefined' || !canvasElm) {
			console.log(`${this.constructor.name} - Falied to set bounds from element ${canvasElm}`);
		}

		this.boundsX = canvasElm.clientWidth;
		this.boundsY = canvasElm.clientHeight;

		this.updateInternalImageData();
		let isStyleProbableMismatch = `${canvasElm.width}` !== canvasElm.style.width;
		canvasElm.style.width = isStyleProbableMismatch ? `${canvasElm.width}` : canvasElm.style.width;
		canvasElm.style.height = isStyleProbableMismatch ? `${canvasElm.height}` : canvasElm.style.height;

		this.offsetCanvas( // Is this the optimal way to do pixel perfect drawing??
			this.imageLayer ? 0.5 : 0, this.imageLayer ? 0.5 : 0, 1
		);
	};

	centerOrigin(scale: number) {
		this.viewport.scale = scale;
		this.viewport.cameraX = this.boundsX / (2 * this.viewport.scale);
		this.viewport.cameraY = this.boundsY / (2 * this.viewport.scale);
		this.lookAt(this.viewport);
	}

	lookAt(view: Viewport) { this.lookAtCoords(view.cameraX, view.cameraY, view.scale); }
	lookAtCoords(x: number, y: number, s: number) {
		let vp = { cameraX: x * s, cameraY: y * s, scale: s } as Viewport;
		this.offsetCanvas(vp.cameraX, vp.cameraY, vp.scale);
	}

	textMetrics(message: string) {
		return this.canvasContext.measureText(message);
	}

	clearRectangle(x: number, y: number, w: number, h: number) {
		this.canvasContext.clearRect(x, y, w, h);
	};

	offsetCanvas(offx: number, offy: number, s: number = 1) {
		this.canvasContext.translate(offx * s, offy * s);
	};

	scaleCanvas(xscl: number, yscl: number) {
		this.canvasContext.scale(xscl, yscl);
	};

	rotateCanvas(deg: number) {
		this.canvasContext.rotate(GetRadFromDegrees(deg));
	}

	rotateImageCanvas(deg: number, x: number, y: number, wo: number, ho: number) {
		this.offsetCanvas(x + (wo / 2), y + (ho / 2), 1);
		this.canvasContext.rotate(GetRadFromDegrees(deg));
	}

	resetCanvasTransform() {
		this.canvasContext.setTransform(1, 0, 0, 1, 0, 0);
	}

	clearCanvas(width?: number, height?: number) {
		var bound = {
			width: this.boundsX,
			height: this.boundsY
		};

		this.canvasContext.save();
		this.canvasContext.setTransform(1, 0, 0, 1, 0, 0);
		if (typeof width != 'undefined') { bound.width = width; }
		if (typeof height != 'undefined') { bound.height = height; }
		this.clearRectangle(0, 0, bound.width, bound.height);
		this.canvasContext.restore();
	};

	updateInternalImageData() {
		this.rawImageData = this.rawImageDataObj(0, 0, this.boundsX, this.boundsY);
	}

	rawImageDataObj(sw: number, sh: number, w: number, h: number): ImageData {
		return this.canvasContext.getImageData(sw, sh, w, h);
	}

	rawImageData8(): Uint8ClampedArray {
		return new Uint8ClampedArray(this.canvasContext.getImageData(0, 0, this.boundsX, this.boundsY).data);
	}

	rawImageData32(): Uint32Array {
		let rawPixeldata = this.rawImageData8();
		let pixelDataSize8 = rawPixeldata.byteLength;
		let buffer32_ptr = new Uint32Array();

		let iter = 4;
		for (let idx = 0; idx < pixelDataSize8; ++idx) { // Easier to work with RGBA32, pack some bytes
			buffer32_ptr[idx] = 0;
			buffer32_ptr[idx] |= ((rawPixeldata[iter - 4]) << 0) & 0x000000ff; // r
			buffer32_ptr[idx] |= ((rawPixeldata[iter - 3]) << 8) & 0x0000ff00; // g
			buffer32_ptr[idx] |= ((rawPixeldata[iter - 2]) << 16) & 0x00ff0000; // b
			buffer32_ptr[idx] |= ((rawPixeldata[iter - 1]) << 24) & 0xff000000; // a
			iter += 4;
		}
		return buffer32_ptr;
	}

	strokeRect(x: number, y: number, w: number, h: number) { return this.canvasContext.strokeRect(x, y, w, h); }
	fillRect(x: number, y: number, w: number, h: number) { return this.canvasContext.fillRect(x, y, w, h); }
	rect(x: number, y: number, w: number, h: number) { return this.canvasContext.rect(x, y, w, h); }
	stroke(x: number, y: number, w: number, h: number) { return this.canvasContext.stroke(); }
	fill(x: number, y: number, w: number, h: number) { return this.canvasContext.fill(); }

	drawStringColor(message: string, x: number, y: number, s: number, color: CanvasColor) { return this.drawString(message, x, y, s, false, undefined, color); }
	drawString(message: string, x: number, y: number, s: number, outline: boolean = false, align?: AlignOption, color?: CanvasColor): void {
		let dalign: AlignOption = { start: true, center: false, end: false, left: false, right: false };
		let dc = { r: 0xff, g: 0xff, b: 0xff, a: 255 } as CanvasColor;
		let sc = color;

		if (!s) {
			s = 1;
		}


		align = align || dalign;
		if (NotEmpty(message) && align) {
			this.canvasContext.save();
			if (align) {
				if (align.center) { this.canvasContext.textAlign = 'center'; }
				else if (align.right) { this.canvasContext.textAlign = 'right'; }
				else if (align.left) { this.canvasContext.textAlign = 'left'; }
				else if (align.start) { this.canvasContext.textAlign = 'start'; }
				else if (align.end) { this.canvasContext.textAlign = 'end'; }
			}

			let strSc = sc ? this.setColor(sc.r, sc.g, sc.b, sc.a) : null;
			let strDc = this.setColor(dc.r, dc.g, dc.b, dc.a);
			this.canvasContext.font = '48px EnterCommand';
			this.canvasContext.textBaseline = 'middle';

			if (outline) {
				this.canvasContext.lineWidth = s;
				this.canvasContext.strokeStyle = strSc || strDc;
				this.canvasContext.strokeText(message, x, y);
			} else {
				this.canvasContext.fillStyle = strSc || strDc;
				this.canvasContext.fillText(message, x, y);
			}
			this.canvasContext.restore();
		}
	};

	drawLine(sxPos: number, syPos: number, xPos: number, yPos: number, s?: number, col?: CanvasColor, deg?: number) { this.drawLineShapeType(2, [sxPos, xPos], [syPos, yPos], RendererShapeType.STROKE, s, col, deg); }
	drawLineShapeType(shapeLength: number, xPos: Array<number>, yPos: Array<number>, shapeType: RendererShapeType, s?: number, col?: CanvasColor, deg?: number) {
		if (xPos.length != shapeLength && yPos.length != shapeLength) {
			return;
		}

		if (!s) { s = 1; }
		let originX = xPos[0];
		let originY = yPos[0];

		this.canvasContext.save();
		this.canvasContext.beginPath();
		this.canvasContext.moveTo(originX, originY);
		for (let i = 0 + 1; i < shapeLength; i++) {
			this.canvasContext.lineTo(xPos[i], yPos[i]);
		}

		this.canvasContext.lineTo(originX, originY);
		this.canvasContext.lineWidth = s;

		switch (shapeType) {
			case RendererShapeType.FILL:
				if (col && col !== null) {
					this.canvasContext.fillStyle = this.setColor(col.r, col.g, col.b, col.a);
				}
				this.canvasContext.fill();
				break;
			case RendererShapeType.STROKE:
				if (col && col !== null) {
					this.canvasContext.strokeStyle = this.setColor(col.r, col.g, col.b, col.a);
				}
				this.canvasContext.stroke();
				break;
		}
		this.canvasContext.restore();
	}

	drawRectangleShape(x: number, y: number, w: number, h: number, lw: number, shapeType: RendererShapeType, col?: CanvasColor) {
		if (col && col !== null && shapeType === RendererShapeType.FILL) {
			this.canvasContext.fillStyle = this.setColor(col.r, col.g, col.b, col.a);
		}

		if (!lw || lw === null) { lw = 1; }
		this.canvasContext.lineWidth = lw;

		let sw = (lw * w);
		let sh = (lw * h);

		switch (shapeType) {
			case RendererShapeType.FILL:
				return this.canvasContext.fillRect(x, y, w, h);
			case RendererShapeType.STROKE:
				if (col && col !== null) {
					this.canvasContext.strokeStyle = this.setColor(col.r, col.g, col.b, col.a);
				}
				return this.canvasContext.strokeRect(x, y, w, h);
			default:
				return this.canvasContext.fillRect(x, y, w, h);
		}
	}

	drawColorOutlineRectangle(x: number, y: number, w: number, h: number, s: number, col: CanvasColor, deg?: number) {
		this.canvasContext.save();

		if (deg && deg != null && deg > 0) {
			this.rotateImageCanvas(deg, x, y, w, h);
			const ox = -(w / 2);
			const oy = -(h / 2);

			x = ox;
			y = oy;
		}

		this.drawRectangleShape(x, y, w, h, s, RendererShapeType.STROKE, col)
		this.canvasContext.restore();
	};

	drawOutlineRectangle(x: number, y: number, w: number, h: number, s: number, deg?: number) {
		this.canvasContext.save();

		if (deg && deg > 0) {
			this.rotateImageCanvas(deg, x, y, w, h);
			const ox = -(w / 2);
			const oy = -(h / 2);

			x = ox;
			y = oy;
		}

		this.drawRectangleShape(x, y, w, h, s, RendererShapeType.STROKE)
		this.canvasContext.restore();
	};

	drawColorRectangle(x: number, y: number, w: number, h: number, s: number, col: CanvasColor, deg?: number) {
		this.canvasContext.save();

		if (deg && deg > 0) {
			this.rotateImageCanvas(deg, x, y, w, h);
			const ox = -(w / 2);
			const oy = -(h / 2);

			x = ox;
			y = oy;
		}

		this.drawRectangleShape(x, y, w, h, s, RendererShapeType.FILL, col)
		this.canvasContext.restore();
	};

	drawRectangle(x: number, y: number, w: number, h: number, s: number, deg?: number) {
		this.canvasContext.save();

		if (deg && deg > 0) {
			this.rotateImageCanvas(deg, x, y, w, h);
			const ox = -(w / 2);
			const oy = -(h / 2);

			x = ox;
			y = oy;
		}

		this.drawRectangleShape(x, y, w, h, s, RendererShapeType.FILL)
		this.canvasContext.restore();
	};

	drawColoredCircle(x: number, y: number, r: number, s: number, clockwise: boolean, col: CanvasColor) {
		if (!s) {
			s = 1;
		}

		this.canvasContext.save();
		let color = this.setColor(col.r, col.g, col.b, col.a);
		this.canvasContext.strokeStyle = color;
		this.drawCircle(x, y, r, s, clockwise);
		this.canvasContext.restore();
	};

	drawCircle(x: number, y: number, r: number, s: number, clockwise: boolean) {
		if (typeof clockwise == 'undefined') {
			clockwise = true;
		}

		this.canvasContext.save();
		var counterClockwise = !clockwise;
		var fullCircleRads = 2 * Math.PI;
		if (!s) { s = 1; }

		this.canvasContext.lineWidth = s;

		this.canvasContext.beginPath();
		this.canvasContext.arc(x, y, r, 0, fullCircleRads, counterClockwise);
		this.canvasContext.stroke();
		this.canvasContext.restore();

	};

	drawColoredFillCircle(x: number, y: number, r: number, s: number, clockwise: boolean, col: CanvasColor) {
		if (!s) {
			s = 1;
		}

		this.canvasContext.save();
		let color = this.setColor(col.r, col.g, col.b, col.a);
		this.canvasContext.fillStyle = color;
		this.drawFillCircle(x, y, r, s, clockwise);
		this.canvasContext.restore();
	};

	drawFillCircle(x: number, y: number, r: number, s: number, clockwise: boolean) {
		if (typeof clockwise == 'undefined') {
			clockwise = true;
		}

		this.canvasContext.save();
		var counterClockwise = !clockwise;
		var fullCircleRads = 2 * Math.PI;
		if (!s) { s = 1; }

		this.canvasContext.lineWidth = s;
		this.canvasContext.beginPath();
		this.canvasContext.arc(x, y, r, 0, fullCircleRads, counterClockwise);
		this.canvasContext.fill();
		this.canvasContext.restore();
	};

	drawImage(img: CanvasImageSource, x: number, y: number, w: number, h: number, dx: number, dy: number) {
		this.drawScaledImage(
			img, x, y, w, h, dx, dy, 1
		);
	};

	drawScaledImage(img: CanvasImageSource, x: number, y: number, w: number, h: number, dx: number, dy: number, s: number) {
		if (typeof img == 'undefined' || !img || img == null) {
			console.log(`${this.constructor.name} - Failed to load texture for ${img}`);
		}

		if (!s) { s = 1; }
		this.canvasContext.drawImage(
			img.data, dx, dy, w, h, x, y, w * s, h * s
		);
	};

	drawScaledSprite(sprite: WQTextureSprite, s: number) {
		if (typeof sprite.texture == 'undefined' || sprite.id == 'unknown_sprite' || !sprite || typeof sprite == 'undefined' || !sprite || sprite == null) {
			if (sprite.id == 'unknown_sprite') {
				WQCore.logger.info('A unkown sprite was loaded. ID: ', sprite.id);
			} else {
				WQCore.logger.error(`${this.constructor.name} - Failed to load sprite for ${sprite}`);
			}
		}

		var pos = {
			xPos: sprite.bounds.shapeData.xCorner,
			yPos: sprite.bounds.shapeData.yCorner,
			w: sprite.bounds.shapeData.wCorner - sprite.bounds.shapeData.xCorner,
			h: sprite.bounds.shapeData.hCorner - sprite.bounds.shapeData.yCorner,
			ox: sprite.textureOffsets.xOffset,
			oy: sprite.textureOffsets.yOffset
		};


		if (!s) {
			s = 1;
		}

		var spriteTexture = sprite.texture;
		var spriteIndividualScaled = sprite.useIndividualScale && sprite.scale > 1;
		var spriteScale = (spriteIndividualScaled) ? sprite.scale : s;

		this.drawScaledImage(
			spriteTexture, pos.xPos, pos.yPos, pos.w, pos.h, pos.ox, pos.oy, spriteScale
		);
	};

	drawScaledSpriteByPos(x: number, y: number, w: number, h: number, sprite: any, s: number) {
		if (typeof sprite == 'undefined' || !sprite || sprite == null) {
			if (typeof sprite.texture == 'undefined' || !sprite || sprite.id == 'unknown_sprite') {
				console.log(`${this.constructor.name} - Failed to load sprite for ${sprite}`);
			}
		}

		var pos = {
			ox: sprite.textureOffsets.xOffset,
			oy: sprite.textureOffsets.yOffset
		};


		if (!s) {
			s = 1;
		}

		var spriteTexture = sprite.texture;
		var spriteIndividualScaled = sprite.useIndividualScale && sprite.scale > 1;
		var spriteScale = (spriteIndividualScaled) ? sprite.scale : s;

		this.drawScaledImage(
			spriteTexture, x, y, w, h, pos.ox, pos.oy, spriteScale
		);
	};

	// TODO: make own render for this?
	blit() {
		this.canvasContext.putImageData(this.rawImageData, 0, 0);
	}

	blitPixel(x: number, y: number, col?: CanvasColor) {
		let imageDataWidth = this.rawImageData.width;
		this.rawImageData.data.set([0, 0, 0, 255], (y * imageDataWidth + x) * 4);
	}

	blitLine(sx: number, sy: number, ex: number, ey: number, col?: CanvasColor) {
		let segments = WQBresenham.instance.plotLine(sx, ex, sy, ey);
		let imageDataWidth = this.rawImageData.width;
		for (let pos = 0; pos < segments.length; pos++) {
			let segmentPosition = segments[pos];
			let segmentPixelStride = (segmentPosition.y * imageDataWidth + segmentPosition.x) * 4;
			this.rawImageData.data.set([0, 0, 0, 255], segmentPixelStride);
		}
		WQBresenham.instance.resetPlots();
	}
};