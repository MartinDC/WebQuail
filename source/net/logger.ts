import { Logger } from "../core/core";

export class WQServerLogger {
    protected static implGlobals: any = {
        WQLoggerImpl: {
            LOGGER_KEY: Symbol.for("app.bkmg.singleton.wqserverlogger"),
            doBufferLog: true,
            logIndice: 0,
            buffer: [],

            info: (message: string | Object, ...obs: Array<any>) => {
                console.info(message, ...obs);
            },

            warn: (message: string | Object, ...obs: Array<any>) => {
                console.warn(message, ...obs);
            },

            error: (message: string | Object, ...obs: Array<any>) => {
                console.error(message, ...obs);
            },

            print: (message: string | Object, ...obs: Array<any>) => {
                console.log(message, ...obs);
            },

            printFatal: (from: string, message: string | Object) => {
                WQServerLogger.implGlobals.WQLoggerImpl.print(message);
                throw message;
            },

            printDetailed: (from: string, message: string, ...obs: Array<any>) => {
                let composedMsg = `[${Date.now()}] -> [${from}] ${message}`;
                if (WQServerLogger.implGlobals.WQLoggerImpl.doBufferLog) {
                    WQServerLogger.implGlobals.WQLoggerImpl.buffer[WQServerLogger.implGlobals.WQLoggerImpl.logIndice++] = composedMsg;
                }
                WQServerLogger.implGlobals.WQLoggerImpl.print(composedMsg, ...obs);
            },

            printDetailedFatal: (from: string, message: string) => {
                WQServerLogger.implGlobals.WQLoggerImpl.printDetailed(from, message);
                throw message;
            },

            // TODO: this should be able to log to file.
            doLogOutput: () => {
                var indice = WQServerLogger.implGlobals.WQLoggerImpl.buffer.length;
                for (; indice > 0; --indice) {
                    if (typeof WQServerLogger.implGlobals.WQLoggerImpl.buffer[indice] !== 'undefined') {
                        WQServerLogger.implGlobals.WQLoggerImpl.print(WQServerLogger.implGlobals.WQLoggerImpl.buffer[indice]);
                    }
                }
            }
        }
    };

    // public static dsklogger: Logger = WQServerLogger.implGlobals.WQLoggerImpl; // Logs to file
    public static stdlogger: Logger = WQServerLogger.implGlobals.WQLoggerImpl; // Logs to standard out
}