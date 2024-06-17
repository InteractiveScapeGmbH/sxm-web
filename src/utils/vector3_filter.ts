import { OneEuroFilter } from "./one_euro_filter";

class Vector3Filter {
    private xFilter: OneEuroFilter;
    private yFilter: OneEuroFilter;
    private zFilter: OneEuroFilter;

    constructor(freq: number, minCutoff: number = 1.0, beta: number = 0.0, dCutoff: number = 1.0) {
        this.xFilter = new OneEuroFilter(freq, minCutoff, beta, dCutoff);
        this.yFilter = new OneEuroFilter(freq, minCutoff, beta, dCutoff);
        this.zFilter = new OneEuroFilter(freq, minCutoff, beta, dCutoff);
    }

    public filter(x: number, y: number, z: number, timestamp: number) {
        this.xFilter.filter(x, timestamp);
        this.yFilter.filter(y, timestamp);
        this.zFilter.filter(z, timestamp);
    }
}