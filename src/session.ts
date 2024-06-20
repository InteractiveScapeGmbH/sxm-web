import { v4 as uuidv4 } from 'uuid';
import { MqttClient, QoS } from './mqtt_client';
import { Device } from './device';

const DEVICE_ID_KEY: string = "device_uuid";
const DEFAULT_BROKER_URL: string = "broker.hivemq.com";
const DEFAULT_BROKER_PORT: number = 8884;
const DEFAULT_ROOM_ID: string = "room_uuid";

type Callback = (message: string | Buffer) => void;

export class SxmSession {
    private uuid: string | null;
    private _device: Device;
    private client: MqttClient;
    private _brokerUrl: string = "";
    private _brokerPort: number = -1;
    private _roomId: string = "";
    private statusIntervalId: number | undefined;

    private startCallback: Callback | null;
    private shutdownCallback: Callback | null;
    private downCallback: Callback | null;
    private upCallback: Callback | null;

    /**
     * 
     * The Session is responsible for the communication with the MQTT broker.
     * 
     */
    constructor(roomId?: string) {
        this.uuid = this.initDeviceId();

        this.brokerUrl = DEFAULT_BROKER_URL;
        this.brokerPort = DEFAULT_BROKER_PORT;
        this.roomId = roomId != null ? roomId : DEFAULT_ROOM_ID;

        this.getParameterFromUrl();

        this._device = new Device(this.uuid);
        this._device.registerOnMotionChanged(() => this.sendStatus());

        this.client = new MqttClient(this.brokerUrl, this.brokerPort, this.uuid + "_capore");

        this.startCallback = null;
        this.shutdownCallback = null;
        this.downCallback = null;
        this.upCallback = null;
        this.subscribeTopics();
    }

    /**
     * 
     * Starts the communication with the MQTT broker.
     * 
     * @param interval - The interval in ms in which a message is sent to the server. (Default: 200ms)
     */
    public start(interval: number = 200) {
        this.statusIntervalId = window.setInterval(() => this.sendStatus(), interval);
    }

    /**
     * Stops the communication with the MQTT broker.
     */
    public stop() {
        clearInterval(this.statusIntervalId);
    }

    /**
     * Sets a callback method which gets invoked when the touch table is connected to the MQTT server.
     */
    public set onStart(callback: Callback) {
        this.startCallback = callback;
    }

    /**
    * Sets a callback method which gets invoked when the touch table is disconnected from the MQTT server.
    */
    public set onShutdown(callback: Callback) {
        this.shutdownCallback = callback;
    }

    /**
    * Sets a callback method which gets invoked when the phone is placed on the touch table.
    */
    public set onDown(callback: Callback) {
        this.downCallback = callback;
    }

    /**
    * Sets a callback method which gets invoked when the phone is lifted from the touch table.
    */
    public set onUp(callback: Callback) {
        this.upCallback = callback;
    }

    public get device(): Device {
        return this._device;
    }

    /**
     * Returns the roomId of the touch table the session is trying to communicate with.
     */
    public get roomId(): string {
        return this._roomId;
    }

    private set roomId(roomId: string) {
        this._roomId = roomId;
        console.log(`Set RoomId -> ${roomId}`);
    }

    /**
     * Returns the url of the broker this client is connected to.
     */
    public get brokerUrl(): string {
        return this._brokerUrl;
    }

    private set brokerUrl(url: string) {
        this._brokerUrl = url;
        console.log(`Set broker url -> ${url}`);
    }

    /**
     * Returns the port of the broker this client is connected to. 
     */
    public get brokerPort(): number {
        return this._brokerPort;
    }

    private set brokerPort(port: number) {
        this._brokerPort = port;
        console.log(`Set broker port -> ${port}`);
    }

    // could be removed?
    private subscribeTopics() {
        this.client.subscribe(`/sxm/${this.roomId}/start`, (message) => this._onStart(message));
        this.client.subscribe(`/sxm/${this.roomId}/shutdown`, (message) => this._onShutdown(message));
        this.client.subscribe(`/sxm/${this.roomId}/${this.uuid}/down`, (message) => this._onDown(message));
        this.client.subscribe(`/sxm/${this.roomId}/${this.uuid}/up`, (message) => this._onUp(message));
    }

    private initDeviceId(): string {
        let deviceId = localStorage.getItem(DEVICE_ID_KEY);
        if (deviceId === null) {
            deviceId = uuidv4();
            localStorage.setItem(DEVICE_ID_KEY, deviceId);
        }
        return deviceId;
    }

    private _onStart(message: string | Buffer | undefined): void {
        if (this.startCallback != null && message != null) {
            this.startCallback(message);
        }
    }

    private _onShutdown(message: string | Buffer | undefined): void {
        if (this.shutdownCallback != null && message != null) {
            this.shutdownCallback(message);
        }
    }

    private _onDown(message: string | Buffer | undefined): void {
        if (this.downCallback != null && message != null) {
            this.downCallback(message);
        }
    }

    private _onUp(message: string | Buffer | undefined): void {
        if (this.upCallback != null && message != null) {
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
                case DEVICE_ID_KEY:
                    this.uuid = decodeURIComponent(value);
                    break;
            }
        });
    }

    private sendStatus(): void {
        const status = this._device.getStatus;
        this.client.send(`sxm/${this.roomId}/box`, status, QoS.One, false);
    }
}