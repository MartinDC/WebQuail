import axios, { AxiosRequestConfig, AxiosInstance, AxiosBasicCredentials, Method } from 'axios';
import { WQCore } from "../core/core";

export var methods = {
    remove: 'delete',
    create: 'post',
    fetch: 'get',
    update: 'put'
}

export var allowedMethods = [
    methods.fetch,
    methods.create,
    methods.update,
    methods.remove
];

// TODO These should be passed from config. Read from file

export var defaultCfgObject: AxiosRequestConfig = {
    headers: '', // Headers to always send
    baseURL: '', // Root/Domain of the request
    timeout: 3600,
    method: 'get',
    responseType: 'json',
};

export type EmptyAuthToken = null;
export type AuthToken = EmptyAuthToken | string;

const successMessage: string = "Successfully retrieved auth token: ";
const tokenFailedMessage: string = "token() failed to retrieve token!";
const authItemFailedMessage: string = "item() failed to retrieve authItem!";

export class AuthConfig {
    auth: { username: string, password: string, secret: string } = {
        username: '', password: '', secret: ''
    };
    grantType: string = "";
}

export class EndpointAuthConfig {
    endpoint: string = "";
    path: string = "";
}


export class AuthItem {
    public isAuthenticated: boolean = false;
    public tokenInfo: any;
    public authToken: string;
    public tokenExpiration: number;
    constructor() { this.isAuthenticated = false; }
}

// From npm 'querystring'

export class QueryStringHelper {
    stringifyPrimitive(v: string) {
        switch (typeof v) {
            case 'string':
                return v;
            case 'boolean':
                return v ? 'true' : 'false';
            case 'number':
                return isFinite(Number.parseInt(v)) ? v : '';
            default:
                return '';
        }
    };

    stringify(obj: any, sep?: string, eq?: string, name?: string) {
        sep = sep || '&';
        eq = eq || '=';
        if (obj === null) {
            obj = undefined;
        }

        let self = this;
        if (typeof obj === 'object') {
            return Object.keys(obj).map(function (k) {
                var ks = encodeURIComponent(self.stringifyPrimitive(k)) + eq;
                if (Array.isArray(obj[k])) {
                    return obj[k].map(function (v: any) {
                        return ks + encodeURIComponent(self.stringifyPrimitive(v));
                    }).join(sep);
                }
                return ks + encodeURIComponent(self.stringifyPrimitive(obj[k]));
            }).join(sep);
        }

        if (!name) return '';
        return encodeURIComponent(this.stringifyPrimitive(name)) + eq +
            encodeURIComponent(this.stringifyPrimitive(obj));
    };
}

/* *************************************************************************** */
/* 																			   */
/* Helper class for OAUTH2 authentication. Used internally by WQHttpClient.
/* Token and expiry timers are kept in a "authItem" object.
/* 																			   */
/* *************************************************************************** */

export class WQAuthenticator {
    public authItem: AuthItem;
    public authToken: AuthToken;
    public tokenExpiration: number = null;

    constructor(private config: AuthConfig) { }

    async authenticate(httpClient: WQHttpClient, usrAuthConfig: EndpointAuthConfig) {
        if (httpClient) {
            var data = { grant_type: this.config.grantType };
            var auth = { username: this.config.auth.username, password: this.config.auth.secret };
            var self = this;

            let configObj = httpClient.configObj;
            this.authItem = new AuthItem();

            // We might need a new token, perhaps it's expired or uninitialized.
            if (!this.authenticated()) {
                WQCore.logger.printDetailed(this.constructor.name, "Token expired or not yet authorized! Fetching new token...");
                try {
                    const response = await httpClient.post(usrAuthConfig.path, data, auth, usrAuthConfig.endpoint);
                    if (response.data) {
                        var text = (typeof response.data === "string");
                        var jsonObject = text ? JSON.parse(response.data) : response.data;
                        if (jsonObject && jsonObject.access_token && self.authItem) {
                            self.authItem.isAuthenticated = true;
                            self.authItem.tokenInfo = jsonObject;
                            self.authItem.authToken = `${jsonObject.token_type} ${jsonObject.access_token}`;
                            self.authItem.tokenExpiration = (Date.now() / 1000) + jsonObject.expires_in;
                            WQCore.logger.printDetailed(self.constructor.name, successMessage + jsonObject.access_token);
                        }
                    }

                    if (self.authItem && self.authItem.isAuthenticated) {
                        return Promise.resolve(self.authItem);
                    }
                    self.authItem = ({ isAuthenticated: false } as AuthItem);
                    return Promise.reject(self.authItem);
                }
                catch (error) {
                    try {
                        return Promise.reject(new Error("Failed"));
                    }
                    catch (error_1) {
                        WQCore.logger.printDetailed(self.constructor.name, "Authentication failed - could not get token");
                        return Promise.reject(this.authItem);
                    }
                }
            }

            // We already have a token, return it.
            try {
                return Promise.resolve(this.authItem);
            }
            catch (error_2) {
                WQCore.logger.printDetailed(self.constructor.name, error_2);
                return Promise.reject(this.authItem);
            }
        }
    }

    expired() {
        var authItem = this.item();
        if (authItem && authItem.tokenExpiration) { // reddit might still allow more calls with old token
            return (Date.now() / 1000) > authItem.tokenExpiration;
        }
        return false;
    }

    token() {
        if (this.authItem && this.authItem.isAuthenticated && !this.authItem.authToken) {
            WQCore.logger.printDetailed(this.constructor.name, tokenFailedMessage);
            throw "Severe error! - getAuthToken failed!";
        }

        return this.authItem ? this.authItem.authToken : null;
    }

    item() {
        if (this.authItem && this.authItem.isAuthenticated && !this.authItem.authToken) {
            WQCore.logger.printDetailed(this.constructor.name, authItemFailedMessage);
            throw "Severe error - getAuthItem failed!";
        }

        return this.authItem;
    }

    authenticated() {
        return this.item() && this.item().isAuthenticated && !this.expired();
    }
}

/*
 * Encapsulates a OAUTH2 capable REST-API client and exposes it to any application.
 *
 * This file is made for BKMG.
 */

export class WQHttpClient {
    public httpServiceCreated = false;

    public qsHelper: QueryStringHelper;
    public authenticator: WQAuthenticator;
    public configObj: AxiosRequestConfig;
    public httpService: AxiosInstance;
    public core: WQCore;

    constructor() {

    }

    init(core: WQCore, configObj?: AxiosRequestConfig) {
        this.configObj = !configObj ? defaultCfgObject : configObj;
        var axiosInstance = axios.create(!configObj ? defaultCfgObject : configObj);
        if (!axiosInstance) { throw "Falied to create axios config!"; }

        this.qsHelper = new QueryStringHelper();
        this.httpService = axiosInstance;
        this.httpServiceCreated = true;
        this.core = core;

        return {
            client: this
        };
    };

    setDefaultHeaders() {
        var anon = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': defaultCfgObject.headers
        } as any;

        if (this.authenticator && this.authenticator.authenticated()) {
            anon['Authorization'] = this.authenticator.token();
        }

        return anon;
    }

    makeResourcePath(path: string, endpoint: string) {
        return (typeof endpoint != 'undefined') ? `${endpoint}${path}` : `${defaultCfgObject.baseURL}${path}`;
    }

    performAuthentication() {
        let endpntCfg: EndpointAuthConfig = { endpoint: '', path: '' }
        if (this.httpServiceCreated && !this.authenticator) {
            this.authenticator = new WQAuthenticator({} as AuthConfig);
        }

        return this.authenticator.authenticate(this, endpntCfg);
    };

    performRequest(path: string, method: string, params: string | undefined, data: any, auth: AxiosBasicCredentials) {
        if (!this.httpServiceCreated || !this.httpService) {
            WQCore.logger.printDetailed(this.constructor.name, "Could not create HttpService");
        }

        if (allowedMethods.filter((am) => am === method).length === 0) {
            WQCore.logger.printDetailed(this.constructor.name, `${method} is not allowed!`);
            WQCore.logger.printDetailed(this.constructor.name, 'Unallowed HTTP method used! By HttpClient rules');
        }

        let selfContext = this;
        var headers = this.setDefaultHeaders();
        this.httpService.interceptors.response.use(function (response: any) {
            if (response.status <= 400) {
                response.headers = headers;
                return response;
            };

            var friendlyMessageString = `${method} request failed with a status greater then 400.`;
            WQCore.logger.printDetailed(selfContext.constructor.name, friendlyMessageString);

            return Promise.reject({
                headers: response.headers,
                data: response.data,
                error: friendlyMessageString,
            });
        }, (error: any) => this.handleError(error));

        var requestData: AxiosRequestConfig = {
            url: path, auth: auth, data: data, method: method as Method, params: params, headers: headers
        };
        return this.httpService.request(requestData);
    }

    // JSON Parse should be querystring for these funcs, look into module(npm querystring) or roll own

    get(path: string, data: any, auth: any, endpoint: string) { // Basic http authed
        return this.performRequest(this.makeResourcePath(path, endpoint), methods['fetch'], this.qsHelper.stringify(data), undefined, auth);
    }

    post(path: string, data: any, auth: any, endpoint: string) { // Basic http authed
        return this.performRequest(this.makeResourcePath(path, endpoint), methods['create'], undefined, this.qsHelper.stringify(data), auth);
    }

    delete(path: string, data: any, auth: any, endpoint: string) { // Basic http authed
        return this.performRequest(this.makeResourcePath(path, endpoint), methods['remove'], this.qsHelper.stringify(data), undefined, auth);
    };

    put(path: string, data: any, auth: any, endpoint: string) { // Basic http authed
        return this.performRequest(this.makeResourcePath(path, endpoint), methods['update'], undefined, this.qsHelper.stringify(data), auth);
    }

    handleError(error: Object) {
        const friendlyMessageString = `Request failed with message ${error}`;
        WQCore.logger.printDetailed(this.constructor.name, friendlyMessageString);
        return Promise.reject(error);
    }

}