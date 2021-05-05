
/** ------------------------------------------------------------------------ **/
/* * Copyright 2017 MDC
/* * All rights reserved. 
/* *
/* * This file is part of the WebQuail project.
/* *
/** ------------------------------------------------------------------------ **/

/** ------------------------------------------------------------------------ **/
/* * 
/* * Define functions and types common to different shapes ( not strictly math-units )
/* * Such as Areas, Shapes and Coordinates.
/* * 
/** ------------------------------------------------------------------------ **/

export class WQShape {
    static createNewArea() { return new Area(); };
    static createNewCoordinate() { return new WQCoord(); };
    static createNewAABBRectangle() { return new AABBRect(); };

    static createNewCoordinateFrom(x: number, y: number): WQCoord {
        return new WQCoord().setCoord(x, y);
    };

    static getArea(): typeof Area { return Area; }
    static getCoordinate(): typeof WQCoord { return WQCoord; }
    static getAABBRectangle(): typeof AABBRect { return AABBRect; }

    /* Shape info */
    public static readonly AREA_SHAPE = {
        AS_SQUARE: 0,
        AS_RECTANGLE: 1,
        AS_RHOMBUS: 2
    };

    /* Array indices for neighbour types */
    public static readonly NEIGHBOUR_TYPE = {
        NT_INVALID: -1,
        NT_SIMPLE: 4,
        NT_FULL: 8
    };

    public static readonly neighbouringCoords = [
        { xCoordinate: 0, yCoordinate: 1 },     // Bottom 		    S
        { xCoordinate: 0, yCoordinate: -1 },    // Top 		        N
        { xCoordinate: 1, yCoordinate: 0 },     // Right 		    E
        { xCoordinate: -1, yCoordinate: 0 },    // Left    		    W
        { xCoordinate: 1, yCoordinate: 1 },     // Bottom-right     SE
        { xCoordinate: -1, yCoordinate: -1 },   // Top-Left 	    NW
        { xCoordinate: 1, yCoordinate: -1 },    // Bottom-Left 	    SW
        { xCoordinate: -1, yCoordinate: 1 }     // Top-right 	    NE
    ];
}

/** ------------------------------------------------------------------------ **/
/* *
/* * Simple container for a square or area. Holds 4 corners making up the area.
/* *
/** ------------------------------------------------------------------------ **/

export class WQCoord {
    public neighbouringCoords = WQShape.neighbouringCoords;

    public readonly south = this.neighbouringCoords[0];
    public readonly north = this.neighbouringCoords[1];
    public readonly east = this.neighbouringCoords[2];
    public readonly west = this.neighbouringCoords[3];

    public xCoordinate: number = -1;
    public yCoordinate: number = -1;
    public defaultVoidCoord: number = -1;

    getXCoordinate() { return this.xCoordinate; };
    getYCoordinate() { return this.yCoordinate; };

    getSouthFromOrigin() { return this.south; };
    getNorthFromOrigin() { return this.north; };
    getEastFromOrigin() { return this.east; };
    getWestFromOrigin() { return this.west; };

    isSameCoord(otherCoord: WQCoord) {
        return (
            (this.xCoordinate === otherCoord.xCoordinate) &&
            (this.yCoordinate === otherCoord.yCoordinate)
        );
    };

    setCoord(xCoord: number, yCoord: number) {
        this.xCoordinate = xCoord;
        this.yCoordinate = yCoord;
        return this;
    };

    clampMax(maxValueCoord: WQCoord) {
        if (this.xCoordinate > maxValueCoord.xCoordinate) {
            this.xCoordinate = maxValueCoord.xCoordinate;
        }

        if (this.yCoordinate > maxValueCoord.yCoordinate) {
            this.yCoordinate = maxValueCoord.yCoordinate;
        }
    };

    clampMin(minValueCoord: WQCoord) {
        if (this.xCoordinate < minValueCoord.xCoordinate) {
            this.xCoordinate = minValueCoord.xCoordinate;
        }

        if (this.xCoordinate < minValueCoord.xCoordinate) {
            this.xCoordinate = minValueCoord.xCoordinate;
        }
    }
}

/** ------------------------------------------------------------------------ **/
/* *
/* * Simple container for a square or area. Holds 4 corners makeing up the area.
/* *
/** ------------------------------------------------------------------------ **/

class Area {
    public currentShape: any = WQShape.AREA_SHAPE.AS_SQUARE;

    public aWidth: number = 0;
    public aHeight: number = 0;

    public xCorner: number = 0;
    public yCorner: number = 0;
    public wCorner: number = 0;
    public hCorner: number = 0;


    isSameArea(otherArea: Area) {
        return (
            this.xCorner === otherArea.xCorner && this.yCorner === otherArea.yCorner &&
            this.wCorner === otherArea.wCorner && this.hCorner === otherArea.hCorner
        );
    };

    setAreaPosition(x: number, y: number, w: number, h: number) {
        this.xCorner = x;
        this.yCorner = y;

        if (w && h) {
            this.wCorner = w;
            this.hCorner = h;
        }

        this.recalculateWidth(true);
        this.recalculateHeight(true);
    };

    getAreaX() { return this.xCorner; };
    getAreaY() { return this.yCorner; };
    getAreaW() { return this.wCorner; };
    getAreaH() { return this.hCorner; };

    getAreaWidth() {
        this.recalculateWidth(true);
        return this.aWidth;
    };

    getAreaHeight() {
        this.recalculateHeight(true);
        return this.aHeight;
    };

    areaSquare() { return (this.currentShape == WQShape.AREA_SHAPE.AS_SQUARE); };
    areaRhombus() { return (this.currentShape == WQShape.AREA_SHAPE.AS_RHOMBUS); };
    areaRectangle() { return (this.currentShape == WQShape.AREA_SHAPE.AS_RECTANGLE); };
    getAreaShape() { return this.currentShape; };

    recalculateShapeType() {
        var x = (this.xCorner);
        var x2 = (this.wCorner);

        var y = (this.yCorner);
        var y2 = (this.hCorner);

        var shape = WQShape.AREA_SHAPE.AS_SQUARE;
        if (x + x2 == y + y2) {
            this.currentShape = shape;
        } else {
            var w = this.getAreaWidth();
            var h = this.getAreaHeight();
            shape = WQShape.AREA_SHAPE.AS_RHOMBUS;

            if ((w > h) || (h > w)) {
                shape = WQShape.AREA_SHAPE.AS_RECTANGLE;
            }
        }

        this.currentShape = shape;
    };

    recalculateWidth(preventNegs: boolean) {
        const shouldPreventNegs = this.wCorner > this.xCorner && preventNegs;
        this.aWidth = shouldPreventNegs ? this.wCorner - this.xCorner : this.xCorner - this.wCorner;
    };

    recalculateHeight(preventNegs: boolean) {
        const shouldPreventNegs = this.hCorner > this.yCorner && preventNegs;
        this.aHeight = shouldPreventNegs ? this.hCorner - this.yCorner : this.yCorner - this.hCorner;
    };

    getShapeArea() { return this.aWidth * this.aHeight; };
    getShapePerimeter() { return (2 * (this.aWidth + this.aHeight)); };
}

/** ------------------------------------------------------------------------ **/
/* *
/* * Simple collision detection AABB
/* *
/** ------------------------------------------------------------------------ **/


class AABBRect {
    public shapeData = new Area();

    cloneShape(x: number, y: number, w: number, h: number) { return new AABBRect().setShapeData(this.shapeData); };
    setSize(w: number, h: number) { this.shapeData.aWidth = w; this.shapeData.aHeight = h; };
    setPosition(x: number, y: number, w: number, h: number) { this.shapeData.setAreaPosition(x, y, w, h); };
    setShapeData(shapeData: Area) { this.shapeData = shapeData; };

    collideAABB(otherShape: AABBRect) {
        var s = otherShape.shapeData;
        return this.intersectPoint(s.xCorner, s.yCorner, s.wCorner, s.hCorner);
    };

    intersectPoint(x: number, y: number, w: number, h: number) {
        var s = this.shapeData;
        var widthCollision = ((s.xCorner <= x + w) && (s.xCorner + s.wCorner >= x));
        var heightCollision = ((s.yCorner <= y + h) && (s.yCorner + s.hCorner >= y));
        return (widthCollision && heightCollision);
    };

    growSize(amount: number) {
        this.shapeData.xCorner -= (this.shapeData.xCorner * amount);
        this.shapeData.yCorner -= (this.shapeData.yCorner * amount);

        this.shapeData.wCorner += (this.shapeData.wCorner * amount);
        this.shapeData.hCorner += (this.shapeData.hCorner * amount);
    };

    reduceSize(amount: number) {
        this.shapeData.xCorner += (this.shapeData.xCorner * amount);
        this.shapeData.yCorner += (this.shapeData.yCorner * amount);

        this.shapeData.wCorner -= (this.shapeData.wCorner * amount);
        this.shapeData.hCorner -= (this.shapeData.hCorner * amount);
    }
}