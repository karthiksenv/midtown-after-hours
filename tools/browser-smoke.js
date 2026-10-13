// Browser integration harness, only loaded with ?qa=1. Exercises physical input paths.
export function runSmoke(game){
 const results=[];const check=(name,test)=>{if(!test)throw new Error(name);results.push(`PASS ${name}`);};
 const press=code=>{window.dispatchEvent(new KeyboardEvent('keydown',{code}));window.dispatchEvent(new KeyboardEvent('keyup',{code}));};
 const ticks=n=>{for(let i=0;i<n;i++)game.step(1/60);};
 try{
 game.start();game.pause();game.start();
 const initial=game.player.z;game.keys.add('KeyW');ticks(60);game.keys.clear();check('W movement',game.player.z<initial-4);
 press('Space');ticks(10);check('Jump rises',game.player.y>.5);ticks(90);check('Ground landing',game.player.y===0);
 game.player.x=8;game.player.z=8;press('KeyE');check('Enter sport bike',game.player.vehicle==='vehicle-bike-01');game.keys.add('KeyW');ticks(90);game.keys.clear();check('Bike acceleration',game.vehicles.entities[0].speed>20);game.keys.add('Space');ticks(120);game.keys.clear();press('KeyE');check('Brake and exit',!game.player.vehicle);
 press('Digit2');check('Select rifle',game.state.weapon===1);window.dispatchEvent(new MouseEvent('mousedown',{button:0}));ticks(12);window.dispatchEvent(new MouseEvent('mouseup',{button:0}));check('Fire spends ammunition',game.state.weapons[1].ammo<30);press('KeyR');ticks(110);check('Reload completes',game.state.weapons[1].ammo===30);
 game.player.hp=0;ticks(1);check('Death overlay',game.state.dead&&document.getElementById('dead').style.display==='flex');document.getElementById('restart').click();check('Restart restores health and bike',game.player.hp===100&&!game.state.dead&&game.vehicles.entities[0].x===5&&game.vehicles.entities[0].z===5);
 const snap=game.snapshot();check('Serializable stable world snapshot',JSON.parse(JSON.stringify(snap)).worldVersion==='midtown-v1');game.pause();
 }catch(error){results.push(`FAIL ${error.message}`);game.pause();}
 const output=document.createElement('pre');output.id='qa-results';output.style.cssText='position:fixed;z-index:100;right:10px;top:50px;background:#091a20;color:#d9fa6d;padding:15px;font:12px monospace';output.textContent=results.join('\n');document.body.appendChild(output);console.log(results.join('\n'));
}
