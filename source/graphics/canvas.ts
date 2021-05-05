export class CanvasImageSource {
	public data: any | HTMLImageElement | HTMLCanvasElement | ImageBitmap;
};

export class CanvasColor {
	public r: number;
	public g: number;
	public b: number;
	public a?: number;
};

export enum CanvasObjects {
    GAME_CANVAS = 0,
    OVERLAY_CANVAS,
    BACKGROUND_CANVAS
};

