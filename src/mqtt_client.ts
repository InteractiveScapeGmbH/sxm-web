import mqtt from "mqtt";

interface Message {
    topic: string,
    qos: number,
    payload: Buffer | string,
    retained: boolean,
}

type Callback = () => void;

export class MqttClient {

    private clientOptions: mqtt.IClientOptions;
    private client: mqtt.MqttClient;
    private isOpen: boolean;
    private onConnectedCallbacks: Callback[];
    private onMessageDict: Record<string, Buffer>;
    private messageQueue: Message[];


    constructor(brokerUrl: string, clientId: string, username: string = "", password: string = "") {
        this.onConnectedCallbacks = [];
        this.onMessageDict = {};
        this.messageQueue = [];

        this.isOpen = false;
        this.clientOptions = {
            host: brokerUrl,
            port: 8884,
            clientId: clientId,
            username: username,
            password: password,
            manualConnect: true
        };
        this.client = mqtt.connect(this.clientOptions);
        this.client.on("connect", (connack) => this.onConnect(connack));
        this.client.on("message", (topic, message, packet) => this.onMessageArrived(topic, message, packet));
        this.client.on("disconnect", (response) => this.onDisconnect(response));
        this.client.connect();
    }

    public send(topic: string, message: string | Buffer, qos: number = 0, retained: boolean = false) {
        if (this.isOpen) {
            this.client.publish("sxm/" + topic, message, { retain: retained });
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

    }

    private onConnect(connack: mqtt.IConnackPacket): void {
        console.log("MQTT Client connected.");
        this.triggerCallbacks(this.onConnectedCallbacks);
        this.isOpen = true;

    }
    private triggerCallbacks(callbacks: Callback[]) {
        callbacks.forEach(callback => callback());
    }
    private onMessageArrived(topic: string, message: Buffer, packet: mqtt.IPublishPacket): void {
        const msg: Message = { topic: packet.topic, qos: packet.qos, payload: packet.payload, retained: packet.retain };
    }
    private onDisconnect(response: mqtt.IDisconnectPacket): void {
        throw new Error("Method not implemented.");
    }


}