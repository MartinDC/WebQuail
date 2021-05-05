
// Bresenham's line algorithm. 
// Intended for plotting lines, doing LOS and that sort of thing...

export class WQBresenham {
    private static bresenhamInstance: WQBresenham; 
    public xyPts: Array<{ x: number, y: number }> = new Array<{ x: number, y: number }>();

    static get instance(): WQBresenham { // Global instance for normal use case.
        return this.bresenhamInstance || (this.bresenhamInstance = new this()); 
    }

    // Plot a line from x0,y0 to x1,y1 and store visited coordinates by x and y-axis
    plotLine(x0: number, x1: number, y0: number, y1: number) {
        let shouldSwapXWithY = Math.abs(y1 - y0) > Math.abs(x1 - x0);
        x0 = shouldSwapXWithY ? y0 : x0; x1 = shouldSwapXWithY ? y1 : x1;
        y0 = shouldSwapXWithY ? x0 : y0; y1 = shouldSwapXWithY ? x1 : y1;

        // our stating point(x0) has to be less then x1(end)
        let isStartpointLessThenEnd = x0 > x1;
        x0 = isStartpointLessThenEnd ? x1 : x0; x1 = isStartpointLessThenEnd ? x0 : x1;
        y0 = isStartpointLessThenEnd ? y1 : y0; y1 = isStartpointLessThenEnd ? y0 : y1;

        var y = y0;
        var dx = x1 - x0;
        var dy = Math.floor(Math.abs(y1 - y0));
        var error = Math.floor(dx / 2);
        var ystep = y0 < y1 ? 1 : -1;

        if (shouldSwapXWithY) {
            for (let x = x0; x < x1 + 1; x++) {
                this.xyPts.push({ x: y, y: x });
                error -= dy;
                if (error < 0) {
                    y = y + ystep;
                    error = error + dx;
                }
            }
            return this.xyPts;
        }

        for (let x = x0; x < x1 + 1; x++) {
            this.xyPts.push({ x: x, y: y });
            error -= dy;
            if (error < 0) {
                y = y + ystep;
                error = error + dx;
            }
        }
        return this.xyPts;
    }

    bline(x0: number, x1: number, y0: number, y1: number) {
        var dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
        var dy = Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
        var err = (dx > dy ? dx : -dy) / 2;

        while (true) {
            this.xyPts.push({
                x: x0, y: y0
            });

            if (x0 === x1 && y0 === y1) break;
            var e2 = err;
            if (e2 > -dx) { err -= dy; x0 += sx; }
            if (e2 < dy) { err += dx; y0 += sy; }
        }
        return this.xyPts;
    }

    resetPlots() { this.xyPts = new Array<{ x: number, y: number }>(); }
    lineLength() { return this.xyPts && this.xyPts.length > 0; }
    created() { return this.xyPts && this.xyPts.length > 0; }
}