import {WORLD} from './world.js';
// Transport boundary: commands go upstream, authoritative snapshots come downstream.
// The local authority currently simulates the entire world. No fake online player count.
export class LocalSession {
  constructor(){this.playerId='local-1';this.tick=0;this.commands=[];this.mode='local';}
  sendInput(input){this.commands.push({type:'input',playerId:this.playerId,tick:this.tick,worldVersion:WORLD.version,...input});if(this.commands.length>120)this.commands.shift();}
  snapshot(player,vehicles,npcs){return {worldVersion:WORLD.version,seed:WORLD.seed,tick:this.tick,players:[{id:player.id,x:player.x,y:player.y,z:player.z,yaw:player.yaw,hp:player.hp,vehicle:player.vehicle}],vehicles:vehicles.map(v=>({id:v.id,type:v.type,x:v.x,z:v.z,yaw:v.yaw,speed:v.speed})),npcs:npcs.map(n=>({id:n.id,x:n.x,z:n.z,hp:n.hp}))};}
}
export class WebSocketTransport {
  constructor(url,onSnapshot,onStatus=()=>{}){this.url=url;this.onSnapshot=onSnapshot;this.onStatus=onStatus;this.socket=null;}
  connect(){this.socket=new WebSocket(this.url);this.socket.onopen=()=>{this.socket.send(JSON.stringify({type:'join',worldVersion:WORLD.version,seed:WORLD.seed}));this.onStatus('connected');};this.socket.onmessage=e=>{try{const data=JSON.parse(e.data);if(data.type==='snapshot'&&data.worldVersion===WORLD.version)this.onSnapshot(data);}catch{this.onStatus('invalid packet');}};this.socket.onclose=()=>this.onStatus('disconnected');this.socket.onerror=()=>this.onStatus('connection error');}
  sendInput(command){if(this.socket?.readyState===WebSocket.OPEN)this.socket.send(JSON.stringify({type:'input',worldVersion:WORLD.version,...command}));}
  close(){this.socket?.close();}
}
