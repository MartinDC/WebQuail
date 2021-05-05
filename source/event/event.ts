import { WQEventPublisher } from "./publisher";

export interface  WQEventData<T, V> {
    data: V;

    withData(data: V): T;
}

export abstract class WQObserverEvent<T> {
    subject: WQEventPublisher;

    abstract on(...params: T[]): void;

    register(subject: WQEventPublisher, action: (...params: T[]) => void): WQObserverEvent<T> {
        this.subject = subject;
        this.on = action;
        return this;
    }
}

export abstract class WQObserverEventWithData<T, Tdata> implements WQEventData<T, Tdata> {
    subject: WQEventPublisher;
    data: Tdata;

    withData(data: Tdata): any { 
        this.data = data;
        return this;
    }

    abstract on(...params: T[]): void;

    register(subject: WQEventPublisher, action: (...params: T[]) => void): WQObserverEvent<T> {
        this.subject = subject;
        this.on = action;
        return this;
    }
}
