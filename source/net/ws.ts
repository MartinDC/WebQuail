import { IsType, ImmutableKey } from '../defs';
import { WSReadyState, WSCloseCode } from './types';
import { WQServerLogger } from './logger';

import * as WebSocket from 'ws';
import * as http from 'http'

export class WQServerConfig {
    port: number;
    heartbeat: boolean;
    debuglog: boolean;
    heartbeatTime: number;
}

export class WQWebSocketConnection {
    isAlive: boolean = false;
    receive: (message: string | ArrayBuffer) => void;
    connection: () => void;
    close: () => void;

    constructor(public socket: WebSocket, public connectionId: ImmutableKey) {

    }

    send(message: Object) {
        let serialized = JSON.stringify(message);
        return this.sendJSON(serialized);
    }

    sendJSON(message: string) {
        return this.socket.send(message);
    }
}

export class WQWebSocketServer {
    private readonly defaultCfg: WQServerConfig = {
        debuglog: true,
        heartbeat: true,
        heartbeatTime: 10000,
        port: 8080
    };
    
    private clientIncrementer = 0;
    private open: boolean = false;

    private debugLogger: WQServerDebugLog = new WQServerDebugLog(this.defaultCfg);

    private connectionList: Array<WQWebSocketConnection> = new Array<WQWebSocketConnection>();
    private serverCfg: WQServerConfig = this.defaultCfg;
    private serverImpl: WebSocket.Server;

    private openCallback: (readyState?: number) => void;
    private connectionCallback: (client: WQWebSocketConnection) => void;
    private disconnectCallback: (client: WQWebSocketConnection) => void;

    get connectionOpen() { return this.open; }
    get connections(): Array<WQWebSocketConnection> { return this.connectionList; }
    get _rawServerImp(): WebSocket.Server { return this.serverImpl; }

    get config() { return this.serverCfg; }
    set config(config: WQServerConfig) { this.serverCfg = config; }

    onOpen(open_callback: (readyState?: number) => void) { this.openCallback = open_callback; }
    onConnection(connection_callback: (client: WQWebSocketConnection) => void) { this.connectionCallback = connection_callback; }
    onDisconnect(disconnection_callback: (client: WQWebSocketConnection) => void) { this.disconnectCallback = disconnection_callback; }

    performInit() {
        let httpServer = new http.Server().listen({ 
            port: this.defaultCfg.port
        });

        let wserver = new WebSocket.Server({
            verifyClient: (info: { origin: string, secure: boolean, req: http.IncomingMessage }): boolean => {
                this.debugLogger.verifyClientMessage(info);
                return info && info.req ? this.validateConnection(info.req) : false;
            },
            server: httpServer
        });

        wserver.on('listening', () => {
            this.debugLogger.listenMessage(wserver.address());
            if (this.openCallback) { this.openCallback(); }
            this.serverImpl = wserver;
            this.open = true;
        });

        wserver.on('connection', (ws: WebSocket, request: http.IncomingMessage) => {
            this.debugLogger.connectionMessage(ws, request);

            if (<string>request.headers.bkmg_id) {
                // TODO: Check if string starts with id prefix and we dont go over user limit.
            }

            let con = this.addConnection(ws, <string>request.headers.bkmg_id);
            if (this.connectionCallback) { this.connectionCallback(con); }
            if (con && con.connection) { con.connection(); }

            ws.binaryType = 'arraybuffer';
            if (ws.readyState == WSReadyState.OPEN) {
                ws.on('message', (data: WebSocket.Data) => {
                    if (con && con.receive) {
                        let typeGuard = (p: any) => { return typeof p == 'string' || p instanceof ArrayBuffer };
                        if (IsType<string | ArrayBuffer>(data, typeGuard)) {
                            con.receive(data);
                        }
                    }
                });

                ws.on('ping', (data: Buffer) => this.onConnectionRecievePingPong(con, data, 'ping'));
                ws.on('pong', (data: Buffer) => this.onConnectionRecievePingPong(con, data, 'pong'));

                ws.on('close', (code: number, reason: string) => {
                    switch (code) {
                        case WSCloseCode.POLICY_VIOLATION: break;
                        case WSCloseCode.UNSUPPORTED_DATA: break;
                        case WSCloseCode.INTERNAL_ERROR: break;
                        case WSCloseCode.PROTOCOL_ERROR: break;
                        case WSCloseCode.GOING_AWAY: break;
                    }

                    if (this.disconnectCallback) {
                        this.disconnectCallback(con);
                    }
                    
                    this.killConnection(con.connectionId.key);
                });
            }
        });

        if (this.config.heartbeat) {
            this.detectConnectionAlive(this.config.heartbeatTime);
        }

        wserver.on('error', (error: Error) => this.debugLogger.errorMessage);
        wserver.on('close', (error: Error) => this.debugLogger.closeMessage);
    }

    addConnection(socket: WebSocket, key?: string) {
        const connectionClientKey = key ? new ImmutableKey(key) : new ImmutableKey(this.generateClientId());
        let uncorrectedConnections = this.connectionList.push(new WQWebSocketConnection(socket, connectionClientKey));
        let connection = this.connectionList[uncorrectedConnections - 1];
        connection.isAlive = true;

        return connection;
    }

    fetchConnection(key: string) {
        let conn = this.connectionList.find((con) => con.connectionId.key === key);
        if (conn && conn.connectionId) { return conn; }
    }

    killConnection(key: string) {
        let connIndex = this.connectionList.findIndex((con) => con.connectionId.key === key);
        let conn = this.connectionList[connIndex];

        if (conn && conn.socket) { conn.socket.close(); }
        if (conn && conn.close) { conn.close(); }

        this.connectionList.splice(connIndex, 1);
    }

    terminateAllConnections() { // We should use terminate here because this is not "normal" behaviour.
        let wservercons = this._rawServerImp.clients.size; // Should these be in sync?
        if (wservercons !== this.connections.length) {
            throw "WQWebSocketServer - terminateAllConnections failed";
        }

        this.connections.forEach((c) => {
            c.socket.terminate();
        })
    }

    private generateClientId() { 
        return `92${this.clientIncrementer++}`; 
    }

    private validateConnection(req: http.IncomingMessage): boolean {
        if (req.headers.upgrade == 'websocket' && req.headers.origin == 'file://') {
            req.headers.bkmg_id = this.generateClientId();
            req.headers.bkmg_session = "BKMG_SES";
        } else {
            WQServerLogger.stdlogger.warn('Verification failed for client: ', req.connection.remoteAddress);
            req.statusCode = 401;
            req.destroy();
        }
        return req.headers.bkmg_session != undefined;
    }

    private detectConnectionAlive(time: number) {
        setInterval(() => {
            this.connections.forEach((connection) => {
                let ws = connection.socket;
                if (ws.readyState == WebSocket.CLOSING || ws.readyState == WebSocket.CLOSED || !connection.isAlive) {
                    return this.killConnection(connection.connectionId.key);
                }

                connection.isAlive = false;
                ws.ping();
            });
        }, time);
    }

    private onConnectionRecievePingPong(connection: WQWebSocketConnection, data: Buffer, type: 'ping' | 'pong') {
        if (type === 'pong') {
            connection.isAlive = true;
        }
    }
}

class WQServerDebugLog {
    constructor(private config: WQServerConfig) {

    }

    listenMessage(address: any) {
        if (this.config.debuglog) {
            WQServerLogger.stdlogger.print('WQServer up and running. Listening ', address);
        }
    }

    connectionMessage(ws: WebSocket, request: http.IncomingMessage) {
        if (this.config.debuglog) {
            WQServerLogger.stdlogger.print('Connection from', request.connection.remoteAddress, request.headers)
        }
    }

    verifyClientMessage(info: { origin: string, secure: boolean, req: http.IncomingMessage }) {
        if (this.config.debuglog) {
            WQServerLogger.stdlogger.print('A client is connecting. Verifying...', info.origin, info.secure)
        }
    }

    closeMessage(error: Error) {
        if (this.config.debuglog) {
            WQServerLogger.stdlogger.print('closeing connection', error.message)
        }
    }

    errorMessage(error: Error) {
        if (this.config.debuglog) {
            WQServerLogger.stdlogger.print('error', error.message)
        }
    }
}