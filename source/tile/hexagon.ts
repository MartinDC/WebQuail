import { GetRadFromDegrees } from "../defs";

export class HexagonTile {
    public xpos: number = 0;
    public ypos: number = 0;

    // Did we move the hex and need to update coords?
    public updateCoords: boolean = false;

    // Corners of the hexagon in actuall screen coords. Useful for drawing with .lineTo
    public xAxisCorners: Array<number> = new Array<number>();
    public yAxisCorners: Array<number> = new Array<number>();

    private readonly neighboursCount = 6;
    private readonly radius: number = 60;

    private readonly sideangle: number = Math.sin(GetRadFromDegrees(60));
    private readonly height: number = 2 * this.radius * this.sideangle;
    private readonly halfHeightStep: number = this.height / 2;
    private readonly halfRadStep: number = this.radius / 2;
    private readonly side: number = (3 / 2) * this.radius;
    private readonly width: number = this.radius * 2;

    // This is offset for the corners of the hexagon. On the x-axis.
    public readonly cornersX: Array<number> = [
        this.halfRadStep, this.side, this.width, this.side, this.halfRadStep, 0
    ];

    // This is offset for the corners of the hexagon. On the y-axis.
    public readonly cornersY: Array<number> = [
        0, 0, this.halfHeightStep, this.height, this.height, this.halfHeightStep
    ];

    constructor(radius: number) { 
        this.radius = radius; 
    }

    calculateCorners(refArrX: Array<number>, refArrY: Array<Number>) {
        if (refArrX.length > this.neighboursCount || refArrY.length > this.neighboursCount) {
            throw "calculateCorners - bad value for parameters";
        }

        this.cornersX.forEach((p, i) => refArrX[i] = Math.round(this.xpos + this.cornersX[i]));
        this.cornersY.forEach((p, i) => refArrY[i] = Math.round(this.ypos + this.cornersY[i]));
    }

    // TODO: This only deal with the side/flat orientation 
    // Calculate a hextile from given screen coord value. 
    calcTileCord(mx: number, my: number): { tileX: number, tileY: number } {
        let xt = Math.floor(mx / this.side); // Wich x-axis are we in

        // Y-axis offset for odd and even row
        let yoff = my - (xt % 2) * this.halfHeightStep;
        let yt = Math.floor(yoff / this.height);

        let xPosTile = mx % this.side;
        let yPosTile = yoff % this.height;
        if (xPosTile > Math.abs(this.radius / 2 - (this.radius * yPosTile / this.height))) {
            return {
                tileX: xt, tileY: yt 
            };
        }

        let underMiddle = (yPosTile < this.halfHeightStep) ? 1 : 0;
        return {
            tileX: xt - 1, tileY: yt + (xt % 2) - underMiddle
        };
    }

    // TODO: This only deal with the side/flat orientation 
    // Screen position from hexagon index.
    // This only deals with one orientation, so side/flat hexagons only.
    getScreenPos(tx: number, ty: number) {
        let s = this.side;
        let h = this.height;
        let oddEven = tx % 2;

        return {
            x: tx * s,
            y: h * (2 * ty + oddEven) / 2
        }
    }

    getTileDistance(xa: number, ya: number, xb: number, yb: number) {
		let dx = xb - xa;
		let dy = yb - ya;
		return Math.sqrt((dx * dx) + (dy * dy));
    }
    
    setPosition(x: number, y: number) {
        this.updateCoords = true;
        this.xpos = x;
        this.ypos = y;
    }

    get top() { return this.ypos; }
    get left() { return this.xpos; }
    get right() { return this.xpos + this.width; }
    get bottom() { return this.ypos + this.height; }

    get centerX() { return this.xpos + this.radius; }
    get centerY() { return this.ypos + this.halfHeightStep; }

    get xPosition() { return this.left; }
    get yPosition() { return this.top; }
}