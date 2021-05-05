import { WQObjectMap } from "../data/objectmap";
import { WQObserverEvent } from "./event";

export class WQEventPublisher {
    private events: WQObjectMap<WQObserverEvent<any>> = new WQObjectMap<WQObserverEvent<any>>();
    public static publisher: WQEventPublisher;

    dispatchAll(event: WQObserverEvent<any>, ...params: any[]) {
        this.events.getSequence(event).forEach(listener => listener.on(params));
    }

    dispatch(event: WQObserverEvent<any>, ...params: any[]) {
        this.events.get(event).on(...params);
    }

    cancel(event: WQObserverEvent<any>) {
        this.events.remove(event);
    }

    register(event: WQObserverEvent<any>) {
        this.registerWithAction(event, event.on);
    }

    registerWithAction(event: WQObserverEvent<any>, action: (...params: any[]) => void) {
        this.events.add(event.register(this, action));
    }

    static get instance() { return this.publisher || (this.publisher = new this()); }
}
