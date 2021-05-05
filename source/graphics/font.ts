import fontCfg from "../../../data/font/pixelfont_settings.json"

import { WQRenderer } from "./renderer.js";
import { WQTextureSprite } from "./sprite";
import { WQCore } from "../core/core";

const FONT_TOTAL_TYPES = 4;
const FONT_TEXT_UPPER_TYPE = 0;
const FONT_TEXT_LOWER_TYPE = 1;
const FONT_NUMBER_TYPE = 2;
const FONT_MISC_TYPE = 3;

type FontCategoryTypeNames = 'letterU' | 'letterL' | 'number' | 'misc';

/* ---------------------------------------------------------------------------- */
// *
// * A Glyph holds a texture coordinates for a particular glyph in a bitmap font texture.
// * Can have kerning values to correctly kern with other glyphs in the font.
// *
// * Used by WQBitmapFont to batch render text.
// *
/* ---------------------------------------------------------------------------- */

export class WQGlyph {
    public xPos: number = 0;
    public yPos: number = 0;
    public width: number = 0;
    public height: number = 0;

    public offsetX: number = 0;
    public offsetY: number = 0;

    public kerningSize: number = 0;
    public glyphCharacter: string = '';

    public kerningGlyphs: Array<string> = new Array<string>();
    public kerningAdvance: Array<number> = new Array<number>();

    public isKerning: boolean = true;

    createGlyph(glyphCharacter: string, kerningSize: number, kerningGlyphs: Array<string>, kerningAdvance: Array<number>, x: number, y: number, width: number, height: number) {
        this.xPos = x;
        this.yPos = y;
        this.width = width;
        this.height = height;

        this.kerningSize = kerningSize;
        this.glyphCharacter = glyphCharacter;
        this.kerningAdvance = kerningAdvance;
        this.kerningGlyphs = kerningGlyphs;
    }

    createOffset(xOff: number, yOff: number) {
        this.offsetX = xOff;
        this.offsetY = yOff;
    }

    // Find the distance this glyph should be advanced relative to the 
    // adjacent glyph in the given text string.
    getKerningAdvance(glyph: WQGlyph) {
        if (!this.isKerningGlyph()) {
            return 0;
        }

        let canKern = this.kerningGlyphs.findIndex((g) => g == glyph.glyphCharacter);
        if (canKern !== -1) { return this.kerningAdvance[canKern]; }
        return 0;
    }

    canKernWith(glyph: WQGlyph) {
        let kerning: boolean = false;
        if (this.isKerningGlyph()) {
            if (this.glyphCharacter == glyph.glyphCharacter) {
                kerning = !kerning;
            }
        }
        return kerning;
    }

    isKerningGlyph() {
        return this.isKerning;
    }
}

/* ---------------------------------------------------------------------------- */
// *
// * WQBitmapFont represents a bitmap font storing fixed-width characters.
// * A font has the ability to render letters from itself with the required
// * kerning and text alignment. Letter spacing and alignment can be specified
// * when calling the draw function.
// *
/* ---------------------------------------------------------------------------- */

export class WQBitmapFont {
    private glyphs: Array<WQGlyph> = new Array<WQGlyph>();
    private legalCharString: string = '';
    private fontsheet: WQTextureSprite;

    // The different groups offset in the texture.
    // Each axis(X , Y) occupy one indice of the array
    // ie. X is stored as FONT_XXXX_TYPE and Y FONT_XXXX_TYPE + 1.
    private groupOffset: Array<number> = new Array<number>(4 * 2);

    public charSpacing: number = 0;
    public lineSpacing: number = 0;
    public wordSpacing: number = 0;

    public paddingY: number = 0;
    public paddingX: number = 0;
    public textRow: number = 0;
    public drawX: number = 0;
    public drawY: number = 0;
    public width: number = 0; // Glyph width
    public height: number = 0; // Glyph height

    public isLoaded: boolean = false;
    public isGenerated: boolean = false;

    constructor(core: WQCore) {
        this.generateTexture(core);
    }

    generateTexture(core: WQCore) {
        this.fontsheet = new WQTextureSprite();
        this.fontsheet.textureOffsets.hOffset = fontCfg.dimensionH;
        this.fontsheet.textureOffsets.wOffset = fontCfg.dimensionW;
        this.fontsheet.loadBitmaped(core, fontCfg.path, () => {
            this.isLoaded = true;
            this.initFont();
        });
    }

    initFont() {
        if (!this.isLoaded) {
            throw 'WQBitmapFont - NO TEXTURE - Make sure the font-texture is loaded before calling this function!'
        }

        let totalTypes = 4;
        let typeName: Array<FontCategoryTypeNames> = [
            'letterU', 'letterL', 'number', 'misc'
        ];

        let fontConfig = fontCfg;
        if (fontConfig && fontConfig.name) {
            for (let i = 0; i < totalTypes * 2; i += 2) {	// Figure out the offsets of the different groups in the texture.
                let type = (i < 2) ? 0 : i / 2;
                this.groupOffset[i] = fontCfg.glyphData[typeName[type]].xOffset;
                this.groupOffset[i + 1] = fontCfg.glyphData[typeName[type]].yOffset;
            }

            this.legalCharString = this.legalCharString.concat(fontConfig.legalCharString.letterU);
            this.legalCharString = this.legalCharString.concat(fontConfig.legalCharString.letterL);
            this.legalCharString = this.legalCharString.concat(fontConfig.legalCharString.number);
            this.legalCharString = this.legalCharString.concat(fontConfig.legalCharString.miscs);

            this.textRow = fontConfig.legalCharString.textRow;
            this.paddingX = fontConfig.fontPaddingX;
            this.paddingY = fontConfig.fontPaddingY;
            this.height = fontConfig.charHeight;
            this.width = fontConfig.charWidth;
            this.drawX = fontConfig.fontDrawX;
            this.drawY = fontConfig.fontDrawY;

            this.validateTexture();
            this.createFontGlyphs(this.textRow, 10, 24, this.paddingX, this.paddingY);

            this.charSpacing = fontCfg.charSpacing;
            this.lineSpacing = fontCfg.lineSpacing;
            this.wordSpacing = fontCfg.wordSpacing;
        }
    }

    validateTexture() {
        this.isGenerated = true;
    }

    createFontGlyphs(textRow: number, numberRow: number, miscRow: number, charPaddingX: number, charPaddingY: number) {
        if (!this.isGenerated) {
            throw 'WQBitmapFont - NO INITED - Make sure the font is fully inited before calling this function!'
        }

        let numberRowLength = numberRow;
        let textRowLength = textRow;
        let miscRowLength = miscRow;

        let rawPixeldata = this.fontsheet.getRawPixelData();
        let pixelDataSize32 = rawPixeldata.width * rawPixeldata.height;
        let pixelDataWidth = rawPixeldata.width;

        let pBuffer8 = new Uint8Array(rawPixeldata.data);
        let buffer32_ptr = new Uint32Array(pixelDataSize32);

        let iter = 4;
        for (let idx = 0; idx < pixelDataSize32; ++idx) { // Easier to work with RGBA32, pack some bytes
            buffer32_ptr[idx] = 0;
            buffer32_ptr[idx] |= ((pBuffer8[iter - 4]) << 0) & 0x000000ff; // r
            buffer32_ptr[idx] |= ((pBuffer8[iter - 3]) << 8) & 0x0000ff00; // g
            buffer32_ptr[idx] |= ((pBuffer8[iter - 2]) << 16) & 0x00ff0000; // b
            buffer32_ptr[idx] |= ((pBuffer8[iter - 1]) << 24) & 0xff000000; // a
            iter += 4;
        }

        // We have multiple rows of text, both upper and lower case.
        let size = textRowLength + textRowLength + numberRowLength + miscRowLength;
        let fontSize = this.legalCharString.length;
        let leftmostPixel = 0;
        let ogtype = 0;

        let verticalOffset: Array<number> = [textRowLength, textRowLength, numberRowLength, miscRowLength];

        // Check if we have more chars in the string then we have available to draw.
        if (fontSize <= size) {
            for (let j = 0; j < FONT_TOTAL_TYPES; j++) {  // We have 4 types of characters.
                for (let i = 0; i < verticalOffset[j]; ++i) {
                    ogtype = j * verticalOffset[j];
                    let c = this.legalCharString[ogtype + i];
                    let xpos = this.drawX + (i * this.width);
                    let ypos = this.drawY + (j * this.height);
                    xpos += (this.paddingX > 0) ? (this.paddingX + j) : 0;
                    ypos += (this.paddingY > 0) ? (this.paddingY + j) : 0;

                    /* TODO: Calculate kerning and glyph advance / offset */
                    let kerningGlyphs: Array<string> = ['0', '1', '2', '3', '4'];
                    let kerningAdvance: Array<number> = [0, 1, 2, 3, 4];

                    // Glyphs are not proportionaly placed in the bitmap/texture.
                    // Consider the different sizes, remove any trailing transparent pixels.
                    for (let startX = xpos; startX < xpos + this.width; ++startX) {
                        for (let startY = ypos; startY < ypos + this.height; ++startY) {
                            if ((buffer32_ptr[startX + (startY * pixelDataWidth)] == 0xffffffff)) {
                                leftmostPixel++;
                                break;
                            }
                        }
                    }

                    let drawWidth = leftmostPixel;
                    let drawHeight = this.height;

                    let t = (j < 1) ? 0 : j * 2;
                    let offsetX = this.groupOffset[t];
                    let offsetY = this.groupOffset[t + 1];

                    leftmostPixel = 0;
                    let glyph: WQGlyph = new WQGlyph();
                    glyph.createGlyph(c, 5, kerningGlyphs, kerningAdvance, xpos, ypos, drawWidth, drawHeight);
                    glyph.createOffset(offsetX, offsetY);
                    this.glyphs.push(glyph);
                }
            }
        }
    }

    getGlyphFromIdx(idx: number) {
        if (idx < 0 || idx > this.glyphs.length) {
            return this.glyphs[0];
        }
        return this.glyphs[idx]
    }

    draw(renderer: WQRenderer, text: string, x: number, y: number, wrapping?: number, s?: number, spacing?: number) {
        if (!this.glyphs || this.glyphs.length === 0 || text.length === 0) {
            return;
        }

        let defaultCharSpacing: number = spacing != null ? this.charSpacing + spacing : this.charSpacing;
        let defaultWordSpacing: number = this.wordSpacing;
        let charspacing: number = defaultCharSpacing;
        let wordspacing: number = defaultWordSpacing;
        let texture = this.fontsheet.texture;
        let size: number = text.length;

        let scale = renderer.getScreenScale();
        if (s) { scale = s; }

        for (let i = 0; i < size; ++i) {
            if (text[i] == ' ') {
                x += wordspacing * scale;
                continue;
            }

            let idx = this.legalCharString.indexOf(text[i]);
            let glyph = this.getGlyphFromIdx(idx);

            let u2 = glyph.xPos;
            let v2 = glyph.yPos;
            let drawx = x + glyph.offsetX;
            let drawy = y + glyph.offsetY;

            renderer.drawScaledImage(
                texture, drawx, drawy, glyph.width, glyph.height, u2, v2, scale
            );
            x += (glyph.width + charspacing) * scale;
        }
    }
}