/** ------------------------------------------------------------------------ **/
/* * Copyright 2017 MDC
/* * All rights reserved. 
/* *
/* * This file is part of the WebQuail project.
/* *
/** ------------------------------------------------------------------------ **/

/** ------------------------------------------------------------------------ **/
/* *
/* * A mathematical 2D-Vector representation. Holds a magnitude and direction.
/* * Has a X and Y component that can be accessed.
/* *
/** ------------------------------------------------------------------------ **/

export class WQVector2D {
    public xComponent: number = 0;
    public yComponent: number = 0;

    public readonly PI: number = (3.14159265358979323846);
    public readonly DEGTORAD: number = (this.PI / 180.0);
    public readonly RADTODEG: number = (180.0 / this.PI);

    setComponent(xComponent: number, yComponent: number) {
        this.xComponent = xComponent;
        this.yComponent = yComponent;
    };

    setToZero() {
        this.xComponent = 0;
        this.yComponent = 0;
    };

    createNewVector2D() { return new WQVector2D(); };
    getXComponent() { return this.xComponent; };
    getYComponent() { return this.yComponent; };

    component() {
        return { xComponent: this.xComponent, yComponent: this.yComponent };
    };

    /* Clamp the min/max-length of this Vector. **/
    clamp(min: number, max: number) {
        var lsq = this.lengthSq();
        if (lsq <= 0.0) {
            return 0;
        }

        if (lsq >= max * max) {
            var masq = max * max;
            var norScaleG = Math.sqrt(masq / lsq);
            this.xComponent *= norScaleG;
            this.yComponent *= norScaleG;
        }

        if (lsq <= min * min) {
            var misq = min * min;
            var norScaleL = Math.sqrt(misq / lsq);
            this.xComponent *= norScaleL;
            this.yComponent *= norScaleL;
        }
    };

    add(amount: number) { return this.addComponent(amount, amount); };
    addVec(vec: WQVector2D) { return this.addComponent(vec.xComponent, vec.yComponent); };
    addComponent(amountx: number, amounty: number) {
        this.xComponent = this.xComponent + amountx;
        this.yComponent = this.yComponent + amounty;
    };

    subtract(amount: number) { return this.subtractComponent(amount, amount); };
    subtractVec(vec: WQVector2D) { return this.subtractComponent(vec.xComponent, vec.yComponent); };
    subtractComponent(amountx: number, amounty: number) {
        this.xComponent = this.xComponent - amountx;
        this.yComponent = this.yComponent - amounty;
    };

    divide(scale: number) { return this.divideComponent(scale, scale); };
    divideVec(vec: WQVector2D) { return this.divideComponent(vec.xComponent, vec.yComponent); };
    divideComponent(sclx: number, scly: number) {
        this.xComponent = (sclx > 0) ? (this.xComponent / sclx) : this.xComponent;
        this.yComponent = (scly > 0) ? (this.yComponent / scly) : this.yComponent;
    };

    scale(scale: number) { return this.scaleComponent(scale, scale); };
    scaleVec(vec: WQVector2D) { return this.scaleComponent(vec.xComponent, vec.yComponent); };
    scaleComponent(sclx: number, scly: number) {
        this.xComponent = this.xComponent * sclx;
        this.yComponent = this.yComponent * scly;
        return this;
    };

    negate() {
        this.xComponent = -this.xComponent;
        this.yComponent = -this.yComponent;
    };

    lengthSq() {
        return (this.xComponent * this.xComponent + this.yComponent * this.yComponent);
    };

    length() {
        var length = this.lengthSq();
        return Math.sqrt(length);
    };

    normalize() {
        var length = this.length();
        if (length != 0) {
            this.xComponent /= length;
            this.yComponent /= length;
        }
    };

    normalizeComponent(xComponent: number, yComponent: number) {
        var lengthSq = (xComponent * xComponent + yComponent * yComponent);
        var length = Math.sqrt(this.lengthSq());
        xComponent /= length;
        yComponent /= length;
        return ({ x: xComponent, y: yComponent });
    };

    distance(trgX: number, trgY: number) {
        var dx = trgX - this.xComponent;
        var dy = trgY - this.yComponent;
        var distSq = (dx * dx + dy * dy);
        return Math.sqrt(distSq);
    };

    distanceSq(trgX: number, trgY: number) {
        var dx = trgX - this.xComponent;
        var dy = trgY - this.yComponent;
        var distSq = (dx * dx + dy * dy);
        return distSq;
    };

    /* build a direction vector of this vector */
    buildDirectionVec(trgX: number, trgY: number) {
        this.xComponent -= trgX;
        this.yComponent -= trgY;
        return this.normalize();
    };

    angleDeg() { return (Math.atan2(this.yComponent, this.xComponent) * this.RADTODEG); };
    angleRad() { return (Math.atan2(this.yComponent, this.xComponent)); };

    angleToVec(otherVec: WQVector2D) { return this.angleTo(otherVec.xComponent, otherVec.yComponent); };
    angleTo(xComp: number, yComp: number) {
        var dx = (this.xComponent - xComp);
        var dy = (this.yComponent - yComp);
        return Math.atan2(dy, dx);
    };

    rotateVector(radian: number) {
        var wq_cos = Math.cos(radian);
        var wq_sin = Math.sin(radian);

        var rotX = this.xComponent * wq_cos - this.yComponent * wq_sin;
        var rotY = this.xComponent * wq_sin + this.yComponent * wq_cos;

        this.xComponent = rotX;
        this.yComponent = rotY;
    };

    /* Calculate Cross product from two components.
    /* Usefull for finding the normal of a plane, the right angle between two vectors
     **/
    cross(trgVec: WQVector2D) { return this.crossComponent(trgVec.xComponent, trgVec.yComponent); };
    crossComponent(vecX: number, vecY: number) {
        return ((this.xComponent * vecY) - (this.yComponent * vecX));
    };

    /* Caluclate Dot product from two components.
    /* Usefull for finding the angle and relationship between two vectors.
     **/
    dot(trgVec: WQVector2D) { return this.dotComponent(trgVec.xComponent, trgVec.yComponent); };
    dotComponent(vecX: number, vecY: number) {
        return ((this.xComponent * vecX) + (this.yComponent * vecY));
    };

    perpendicularWithVec(otherVec: WQVector2D) { return (this.dot(otherVec) === 0); };
    sameDirectionWithVec(otherVec: WQVector2D) { return (this.dot(otherVec) > 0); };
    oppositeWithVec(otherVec: WQVector2D) { return (this.dot(otherVec) < 0); };
}
