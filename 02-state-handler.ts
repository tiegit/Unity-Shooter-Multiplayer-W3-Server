import { Room, Client } from "colyseus";
import { Schema, type, MapSchema } from "@colyseus/schema";

export class Player extends Schema {
    @type("uint8")
    loss = 0;

    @type("int8")
    maxHP = 0;

    @type("int8")
    currentHP = 0;

    @type("number")
    speed = 0;

    @type("number")
    pX = Math.floor(Math.random() * 50) -25;

    @type("number")
    pY = 0;

    @type("number")
    pZ = Math.floor(Math.random() * 50) -25;

    @type("number")
    vX = 0;

    @type("number")
    vY = 0;

    @type("number")
    vZ = 0;

    @type("number")
    rX = 0;

    @type("number")
    rY = 0;

    @type("boolean")
    sit = 0;
}

export class State extends Schema {
    @type({ map: Player })
    players = new MapSchema<Player>();

    something = "This attribute won't be sent to the client-side";

    createPlayer(sessionId: string, data: any) {
        const player = new Player();
        player.maxHP = data.hp;
        player.currentHP = data.hp;
        player.speed = data.speed;

        this.players.set(sessionId, player);
    }

    removePlayer(sessionId: string) {
        this.players.delete(sessionId);
    }

    movePlayer (sessionId: string, data: any) {
        const player = this.players.get(sessionId);

        player.pX = data.pX;
        player.pY = data.pY;
        player.pZ = data.pZ;

        player.vX = data.vX;
        player.vY = data.vY;
        player.vZ = data.vZ;

        player.rX = data.rX;
        player.rY = data.rY;

        player.sit = data.sit
    }
}

export class StateHandlerRoom extends Room<State> {
    maxClients = 2;

    onCreate (options) {
        console.log("StateHandlerRoom created!", options);

        this.setState(new State());

        this.onMessage("move", (client, data) => {
            //console.log("StateHandlerRoom received message from", client.sessionId, ":", data);
            this.state.movePlayer(client.sessionId, data);
        });

        this.onMessage("shoot", (client, data) => {
            this.broadcast("Shoot", data, {except: client}); // делаем массовую рассылку
        });

        this.onMessage("damage", (client, data) => { //2. Урон от врага передается игроку
            const clientID = data.id;
            const player = this.state.players.get(clientID);

            let hp = player.currentHP - data.value;
            if (hp > 0)
            {
                player.currentHP = hp;
                return;
            }

            player.loss++;
            player.currentHP = player.maxHP;

            for (var i = 0; i < this.clients.length; i++){
                if (this.clients[i].id != clientID) continue;

                const x = Math.floor(Math.random()*50 ) -25; // получаем новые рандомные координаты для спавна
                const z = Math.floor(Math.random()*50 ) -25;

                const message = JSON.stringify({x, z}); // делаем строку

                this.clients[i].send("Restart", message); // отправляем сообщение убитому
            }
        });

        this.onMessage("weapon", (client, data) => {
            this.broadcast("Weapon", data, {except: client}); // делаем массовую рассылку
        });
    }

    onAuth(client, options, req) {
        return true;
    }

    onJoin (client: Client, data: any) {
        if (this.clients.length > 1) this.lock();

        client.send("hello", "world");
        this.state.createPlayer(client.sessionId, data);
    }

    onLeave (client) {
        this.state.removePlayer(client.sessionId);
    }

    onDispose () {
        console.log("Dispose StateHandlerRoom");
    }

}
