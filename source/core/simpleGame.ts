import { WQConfig } from "../config";
import { WQDriver } from "./driver";
import { WQ } from "./entryPoint";

export abstract class WQSimpleGame {
    bootstrapApplication(config?: WQConfig) {
        WQ.runWebQuail(this, config);
    }

    abstract init(quailInstance: WQDriver): void;
    abstract tick(elapsed: number): void;
    abstract partial(elapsed: number): void;
}