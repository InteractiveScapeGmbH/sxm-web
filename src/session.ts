import { v4 as uuidv4 } from 'uuid';
import { MqttClient, QoS } from './mqtt_client';
import { Device } from './device';

const deviceIdKey: string = "device_uuid";
const defaultBrokerUrl: string = "broker.hivemq.com";
const defaultBrokerPort: number = 8884;
const defaultRoomId: string = "room_uuid";
const heartbeatIntervalMilliseconds: number = 200;

type Callback = (message: string | Buffer | undefined) => void;

export class SxmSession {
    private uuid: string | null;
    private device: Device;
    private client: MqttClient;
    private brokerUrl: string;
    private brokerPort: number;
    private roomId: string;
    private statusIntervalId: number | undefined;

    private startCallback: Callback | null;
    private shutdownCallback: Callback | null;
    private downCallback: Callback | null;
    private upCallback: Callback | null;

    constructor(roomId: string) {
        this.uuid = this.initDeviceId();

        this.brokerUrl = defaultBrokerUrl;
        this.brokerPort = defaultBrokerPort;
        this.roomId = (!!roomId) ? roomId : defaultRoomId;

        this.getParameterFromUrl();

        this.device = new Device(this.uuid);
        this.device.registerOnMotionChanged(() => this.sendStatus());

        this.client = new MqttClient(this.brokerUrl, this.brokerPort, this.uuid + "_capore");

        this.startCallback = null;
        this.shutdownCallback = null;
        this.downCallback = null;
        this.upCallback = null;
        this.subscribeTopics();
    }

    public start() {
        this.statusIntervalId = window.setInterval(() => this.sendStatus(), heartbeatIntervalMilliseconds);
    }

    public stop() {
        clearInterval(this.statusIntervalId);
    }

    public set onStart(callback: Callback) {
        this.startCallback = callback;
    }

    public set onShutdown(callback: Callback) {
        this.shutdownCallback = callback;
    }

    public set onDown(callback: Callback) {
        this.downCallback = callback;
    }

    public set onUp(callback: Callback) {
        this.upCallback = callback;
    }

    private subscribeTopics() {
        this.client.subscribe(`/sxm/${this.roomId}/start`, (message) => this._onStart(message));
        this.client.subscribe(`/sxm/${this.roomId}/shutdown`, (message) => this._onShutdown(message));
        this.client.subscribe(`/sxm/${this.roomId}/${this.uuid}/down`, (message) => this._onDown(message));
        this.client.subscribe(`/sxm/${this.roomId}/${this.uuid}/up`, (message) => this._onUp(message));
    }

    private initDeviceId(): string {
        let deviceId = localStorage.getItem(deviceIdKey);
        if (deviceId === null) {
            deviceId = uuidv4();
            localStorage.setItem(deviceIdKey, deviceId);
        }
        return deviceId;
    }

    private _onStart(message: string | Buffer | undefined): void {
        if (this.startCallback != null) {
            this.startCallback(message);
        }
    }

    private _onShutdown(message: string | Buffer | undefined): void {
        if (this.shutdownCallback != null) {
            this.shutdownCallback(message);
        }
    }

    private _onDown(message: string | Buffer | undefined): void {
        if (this.downCallback != null) {
            this.downCallback(message);
        }
    }

    private _onUp(message: string | Buffer | undefined): void {
        if (this.upCallback != null) {
            this.upCallback(message);
        }
    }

    private getParameterFromUrl() {
        // use exitings library for this?
        const urlString = window.location.search.substring(1);
        const urlVars = urlString.split('&');
        urlVars.forEach(parameter => {
            const [key, value] = decodeURI(parameter).split("=");
            switch (key) {
                case "u":
                    const url = decodeURIComponent(value);
                    if (url != "") {
                        const [address, port] = url.split(":");
                        this.brokerUrl = address;
                        if (port !== undefined) {
                            this.brokerPort = Number(port);
                        }
                    }
                    break;
                case "r":
                    this.roomId = decodeURIComponent(value);
                    break;
                case deviceIdKey:
                    this.uuid = decodeURIComponent(value);
                    break;
            }
        });
    }

    private sendStatus(): void {
        const status = this.device.getStatus;
        this.client.send(`${this.roomId}/box`, status, QoS.One, false);
    }
}