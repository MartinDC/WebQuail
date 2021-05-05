
export class WQObjectMap<V> {
    private sequence: Map<string, Array<V>> = new Map<string, Array<V>>();

    add(value: V) {
        if (!this.has(value)) { this.sequence.set(value.constructor.name, new Array<V>()); }
        this.sequence.get(value.constructor.name).push(value);
    }

    remove(value: V) {
        if (!this.has(value)) { return; }
        this.removeWithKey(value.constructor.name, value);
    }

    get(value: V): V {
        if (!this.has(value)) { return null; }
        return this.sequence.get(value.constructor.name).find(obj => Object.is(obj, value));
    }

    getSequence(value: V): Array<V> {
        if (!this.has(value)) { return null; }
        return this.sequence.get(value.constructor.name);
    }

    has(value: V): boolean {
        return this.sequence && this.sequence.has(value.constructor.name);
    }

    private removeWithKey(key: string, value: V) {
        if (!this.has(value)) { return; }

        const evts = this.sequence.get(key);
        const rindex = this.findIndex(key, value);

        if (rindex > 0) {
            evts.splice(rindex, 1)
            this.ensureElements(key, evts);
        }
    }

    private findIndex(key: string, value: V) {
        if (!this.has(value)) { return; }

        const evts = this.sequence.get(key);
        return evts.findIndex(evt => Object.is(evt, value));
    }

    private ensureElements(key: string, evts: Array<V>) {
        if (evts.length === 0) { this.sequence.delete(key); }
    }
}