import { WQCore } from "../core/core";

/** ------------------------------------------------------------------------ **/
/* * Copyright 2017 MDC
/* * All rights reserved. 
/* *
/* * This file is part of the WebQuail project.
/* *
/** ------------------------------------------------------------------------ **/

let globWindow = window as any;

/** ------------------------------------------------------------------------ **/
/* 																			 
/* Store information for individual origins, prefer browser's built in
/* LocalStorage utilities. 			
/* 																			 
/** ------------------------------------------------------------------------ **/

export class WQLocalStorage {

    storageAvailable(type: string) {
        var storage = globWindow[type];
        try {
            var x = '__storage_test__';
            storage.setItem(x, x);
            storage.removeItem(x);
            return true;
        }
        catch (e) {
            return e instanceof DOMException && (
                e.code === 22 ||
                e.code === 1014 ||
                e.name === 'QuotaExceededError' ||
                e.name === 'NS_ERROR_DOM_QUOTA_REACHED') &&
                storage.length !== 0;
        }
    };

    hasLocalStorage(alertOnError: boolean) {
        var hasLocalStorage = true;
        if (typeof window.localStorage == 'undefined' || !window.localStorage) {
            hasLocalStorage = false;
        }

        if (alertOnError && (!hasLocalStorage || !this.storageAvailable('localStorage'))) {
            WQCore.logger.info('Local storage is not available!');
        }
        return hasLocalStorage && this.storageAvailable('localStorage');
    };

    getRaw() {
        return window.localStorage;
    };

    clear() {
        this.hasLocalStorage(true);
        this.getRaw().clear();
    };

    remove(key: string) {
        this.hasLocalStorage(true);
        this.getRaw().removeItem(key);
    };

    put(key: string, val: any) {
        this.hasLocalStorage(true);
        this.getRaw().setItem(key, val);
    };

    get(key: string) {
        this.hasLocalStorage(true);
        this.getRaw().getItem(key);
    };
}
