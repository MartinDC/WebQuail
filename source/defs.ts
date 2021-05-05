export class EventHooks {
    public RESIZE_HOOK = 'resize';
    public FOCUS_HOOK = 'focus';
    public BLUR_HOOK = 'blur';

    public KEYBOARD_UP_HOOK = 'keyup';
    public KEYBOARD_DOWN_HOOK = 'keydown';

    public MOUSE_OVER_HOOK = 'mouseover';
    public MOUSE_LEAVE_HOOK = 'mouseleave';
    public MOUSE_OUT_HOOK = 'mouseout';
    
    public CLICK_HOOK = 'click';
}

export class MutableKey {
    constructor(private internalKey: string = 'Unknown_Client') { };
    write(newkey: string) { this.internalKey = newkey; }
    get key() { return this.internalKey; }
}

export class ImmutableKey {
    constructor(private readonly internalKey: string = 'Unknown_Client') { };
    get key(): string { return this.internalKey };
}

export type TypeOfType = 'string' | 'number' | 'boolean' | 'object' | 'function' | 'undefined' | 'symbol';
export type ReadOrWriteIDType = ImmutableKey | MutableKey;

export type ReadonlyKeys<T, K extends keyof T> = { readonly [P in K]?: T[P]; };
export type PartialKeys<T, K extends keyof T> = { [P in K]?: T[P]; };
export type Readonly<T> = { readonly [P in keyof T]: T[P]; };

export type Pick<T, K extends keyof T> = {[P in K]: T[P]; };

export type Partial<T> = { [P in keyof T]?: T[P]; };
export type Complete<T> = { [P in keyof T]-?: T[P]; };

export declare function PickSet<T, K extends keyof T>(obj: T, ...keys: K[]): Pick<T, K>;
export declare function PartialSet<T, K extends keyof T>(obj: T, ...keys: K[]): PartialKeys<T, K>;
export declare function ReadonlySet<T, K extends keyof T>(obj: T, ...keys: K[]): ReadonlyKeys<T, K>;

export let CloneObj = <T extends Object>(clon: T, eLit?: T) => { let lit = eLit && eLit != null ? eLit : {}; return Object.assign(lit, clon) };
export let CloneArr = (clon: Object, eArr?: Array<Object>) => { let arr = eArr && eArr != null ? eArr : []; return Object.assign(arr, clon) };

export let IsTypeof = (type: any, expected: TypeOfType): boolean => typeof(type) === expected;
export let IsType = <T>(type: any, pred: (p:any) => boolean): type is T => pred(type);
export let IsInstance = <T>(obj:T, b: any): boolean => obj instanceof b;

export let GetProperty = <T, K extends keyof T>(obj: T, key: K): T[K] => obj[key];
export let SetProperty = <T, K extends keyof T>(obj: T, key: K, value: T[K]) => obj[key] = value;
export let HasProp = <T>(prop:any, b: T): boolean => prop in b;

export let Defed = (t: any): boolean => t !== undefined && t !== null;
export let Undefed = (t: any): boolean => t === undefined || t === null;
export let NotEmpty = (str: string): boolean => str != null && str.length > 0;

export let Greater = (val:number, delta: number): boolean => delta > val;
export let Lesser = (val: number, delta: number): boolean => val > delta;

export let GetDegreesFromRad = (rad: number): number => rad * ONERADINDEG;
export let GetRadFromDegrees = (deg: number): number => deg * ONEDEGINRAD;

export let StrDefault = "";
export let PI = Math.PI;
export let ONEDEGINRAD: number = (PI / 180.0)
export let ONERADINDEG: number = (180.0 / PI);

export let ToDataUrl = (url: string, onLoad: (data: any) => void) => {
    var xhr = new XMLHttpRequest();
    xhr.responseType = 'blob';
    xhr.onload = function () {
        var reader = new FileReader();
        reader.onloadend = function () {
            onLoad(reader.result);
        };
        reader.readAsDataURL(xhr.response);
    };
    xhr.open('GET', url);
    xhr.send();
}