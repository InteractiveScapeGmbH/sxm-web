import mqtt, { IClientSubscribeOptions } from "mqtt";

interface Message {
    topic: string,
    qos: QoS,
    payload: Buffer | string,
    retained: boolean,
}

type Callback = (payload?: string | Buffer) => void;

export enum QoS {
    Zero = 0,
    One = 1,
    Two = 2,
}

export class MqttClient {

    private clientOptions: mqtt.IClientOptions;
    private client: mqtt.MqttClient;
    private isOpen: boolean;
    private onConnectedCallbacks: Callback[];
    private onDisconnectedCallbacks: Callback[];
    private onMessageDict: Map<string, Callback>;
    private messageQueue: Message[];

    constructor(brokerUrl: string, port: number, clientId: string, username?: string, password?: string) {
        this.onConnectedCallbacks = [];
        this.onDisconnectedCallbacks = [];
        this.onMessageDict = new Map<string, Callback>();
        this.messageQueue = [];

        this.isOpen = false;
        this.clientOptions = {
            host: brokerUrl,
            port: port,
            clientId: clientId,
            username: username,
            password: password,
            manualConnect: true,
            protocol: "wss",
            path: "/mqtt"
        };
        this.client = mqtt.connect(this.clientOptions);
        this.client.on("connect", (connack) => this.onConnect(connack));
        this.client.on("message", (topic, message, packet) => this.onMessageArrived(topic, message, packet));
        this.client.on("disconnect", (response) => this.onDisconnect(response));
        this.client.connect();
    }

    public send(topic: string, message: string | Buffer, qos: QoS, retained: boolean = false) {
        if (this.isOpen) {
            this.client.publish("sxm/" + topic, message, { qos: qos, retain: retained });
        } else {
            const msg: Message = {
                topic: topic,
                qos: qos,
                retained: retained,
                payload: message
            };
            this.messageQueue.push(msg);
        }
    }

    public subscribe(topic: string, onMessageCallback: Callback) {
        if (this.isOpen) {
            const options: IClientSubscribeOptions = { qos: QoS.One };
            this.client.subscribe(topic, options, (error) => {
                if (error) {
                    console.log(`Could not subscribe to topic: ${topic} -> ${error.message}`);
                } else {
                    this.onMessageDict.set(topic, onMessageCallback);
                    console.log(`Subscribed to topic: ${topic}`);
                }
            })
        }
    }

    public registerOnConnected(callback: Callback) {
        this.onConnectedCallbacks.push(callback);
    }

    public registerOnDisconnected(callback: Callback) {
        this.onDisconnectedCallbacks.push(callback);
    }

    private onConnect(connack: mqtt.IConnackPacket): void {
        console.log(`MQTT Client connected to ${this.clientOptions.host}:${this.clientOptions.port}`);
        this.triggerCallbacks(this.onConnectedCallbacks);
        this.isOpen = true;
        this.messageQueue.forEach(message => {
            this.send(message.topic, message.payload, message.qos, message.retained);
        });
        this.messageQueue = [];

    }
    private triggerCallbacks(callbacks: Callback[]) {
        callbacks.forEach(callback => callback());
    }

    private onMessageArrived(topic: string, message: Buffer, packet: mqtt.IPublishPacket): void {
        if (this.onMessageDict.has(topic)) {
            const callback = this.onMessageDict.get(topic);
            if (callback != null) {
                callback(packet.payload);
            } else {
                console.log(`Received message ${message}, but no handler was given.`);
            }
        } else {
            console.log(`Received message for topic ${topic}, but no listeners for the topic were found.`);
        }
    }

    private onDisconnect(response: mqtt.IDisconnectPacket): void {
        if (response.reasonCode !== 0) {
            console.log(`Connection lost because: ${response.properties?.reasonString}`);
        } else {
            this.triggerCallbacks(this.onDisconnectedCallbacks);
            console.log("Connection to the MQTT broker was closed.");
        }
        this.isOpen = false;
    }
}