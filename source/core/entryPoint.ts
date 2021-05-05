import * as asciiCfg from "../../../data/main.json";

import { WQConfig, DefaultConfig } from "../config";
import { WQSimpleGame } from "./simpleGame";
import { WQDriver } from "./driver";
import { WQCore } from "./core";

import { Defed, Partial } from "../defs";

declare type ASCIISplashItem = { ending: string; color: string; art: string;  };
declare type ASCIIData = Partial<{ entryAscii: ASCIISplashItem }>

class SimpleASCIISplasher {
    constructor(private ascii: ASCIISplashItem) { return this; }
    splash() { WQCore.logger.info(this.ascii.art, this.ascii.color, this.ascii.ending); }
}

/** ------------------------------------------------------------------------ **/
/* * Copyright 2018 MDC
/* * All rights reserved. 
/* *
/* * This file is part of the WebQuail project.
/* *
/** ------------------------------------------------------------------------ **/

export namespace WQ {
    export let runWebQuail = (gameInstance: WQSimpleGame, config?: WQConfig) => {
        let gameDriver = new WQDriver(WQCore.instance);

        if (Defed(config)) {
            config = Object.assign(DefaultConfig, config);
        }

        new SimpleASCIISplasher((<ASCIIData>asciiCfg).entryAscii).splash();
        gameDriver.setConfig(config ? config : DefaultConfig);
        gameDriver.useDeltaTimedLoop(true);
        gameDriver.createNew(gameInstance);
    }
};