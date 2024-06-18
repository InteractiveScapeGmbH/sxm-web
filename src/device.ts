interface DeviceOrientationEventExtended extends DeviceOrientationEvent {
    requestPermission?: () => Promise<"granted" | "denied">;
}

interface DeviceMotionEventExtended extends DeviceMotionEvent {
    requestPermission?: () => Promise<"granted" | "denied">;
}

interface DeviceStatus {
    device_id: string,
    device_movement: string,
    device_tilt: string
}

type Callback = () => void;


export class Device {

    private joined: boolean;
    private alpha: number;
    private beta: number;
    private gamma: number;
    private acceleration: DeviceMotionEventAcceleration | null | undefined;
    private rotationRate: DeviceMotionEventRotationRate | null | undefined;
    private lastMoving: boolean;
    private currentMoving: boolean;
    private lastTilted: boolean;
    private currentTilted: boolean;
    private onMotionChangedCallbacks: Callback[];
    private status: DeviceStatus;


    constructor(deviceId: string) {

        this.joined = false;
        this.alpha = 0.0;
        this.beta = 0.0;
        this.gamma = 0.0;

        this.currentMoving = true;
        this.lastMoving = true;
        this.currentTilted = true;
        this.lastTilted = true;

        this.onMotionChangedCallbacks = [];

        this.status = { device_id: deviceId, device_movement: "moving", device_tilt: "tilted" };

        this.init();
    }

    public get isMoving(): boolean {
        return this.currentMoving;
    }

    public get isTilted(): boolean {
        return this.currentTilted;
    }

    private updateStatus() {
        this.status.device_movement = this.isMoving ? "moving" : "stationary";
        this.status.device_tilt = this.isTilted ? "tilted" : "horizontal";
    }

    public get getStatus(): string {
        return JSON.stringify(this.status);
    }

    public registerOnMotionChanged(callback: Callback) {
        this.onMotionChangedCallbacks.push(callback);
    }

    private async init() {
        await this.requestMotion();
        await this.requestOrientation();
        setInterval(() => this.update(), 1.0 / 60.0);
    }

    private update() {
        this.lastMoving = this.currentMoving;
        this.lastTilted = this.currentTilted;
        this.currentMoving = false;
        this.currentTilted = false;

        this.currentTilted = this._isTilted(5.0);
        this.currentMoving = this._isMoving(1.0, 2.0);

        if ((!this.currentTilted && this.currentMoving !== this.lastMoving) || (!this.currentMoving && this.currentTilted !== this.lastTilted)) {
            this.triggerCallbacks();
        }

        this.updateStatus();
    }

    private triggerCallbacks() {
        this.onMotionChangedCallbacks.forEach(callback => callback());
    }

    private _isMoving(accelerationThreshold: number, rotationThreshold: number): boolean {
        if (this.acceleration == null || this.rotationRate == null) return false;
        const { x = 0, y = 0, z = 0 } = this.acceleration;
        const maxAcceleration = Math.max(Math.abs(x ?? 0), Math.abs(y ?? 0), Math.abs(z ?? 0));

        const { alpha = 0, beta = 0, gamma = 0 } = this.rotationRate;
        const maxRotation = Math.max(Math.abs(alpha ?? 0), Math.abs(beta ?? 0), Math.abs(gamma ?? 0));

        return maxAcceleration > accelerationThreshold || maxRotation > rotationThreshold;
    }

    private _isTilted(angleThreshold: number): boolean {
        return Math.max(Math.abs(this.beta), Math.abs(this.gamma)) > angleThreshold;
    }

    private async requestMotion() {
        const requestPermission = (DeviceMotionEvent as unknown as DeviceMotionEventExtended).requestPermission;
        if (typeof requestPermission === 'function') {
            const response = await requestPermission();
            if (response === 'granted') {
                window.addEventListener('devicemotion', (event) => this.onMotion(event));
                this.joined = true;
            }
        } else {
            window.addEventListener('devicemotion', (event) => this.onMotion(event));
            this.joined = true;
        }
    }

    private async requestOrientation() {
        const requestPermission = (DeviceOrientationEvent as unknown as DeviceOrientationEventExtended).requestPermission;

        if (typeof requestPermission === 'function') {
            const response = await requestPermission();
            if (response === 'granted') {
                window.addEventListener('deviceorientation', (event) => this.onOrientation(event));
                this.joined = true;
            }
        } else {
            window.addEventListener('deviceorientation', (event) => this.onOrientation(event));
            this.joined = true;
        }
    }

    private onMotion(event: DeviceMotionEvent): any {
        this.acceleration = event.acceleration;
        this.rotationRate = event.rotationRate;
    }

    private onOrientation(event: DeviceOrientationEvent): any {
        if (event.alpha != null) {
            this.alpha = event.alpha;
        }

        if (event.beta != null) {
            this.beta = event.beta;
        }

        if (event.gamma != null) {
            this.gamma = event.gamma;
        }
    }
}
