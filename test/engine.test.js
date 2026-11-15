import test from "node:test";import assert from "node:assert/strict";
import{newGame,act,endSol,C}from"../src/engine.js";
test("same seed, same schedule",()=>assert.deepEqual(newGame(7,"normal").sched,newGame(7,"normal").sched));
test("errors are codes",()=>{const g=newGame(1,"normal");assert.equal(act(g,{k:"build",type:"solar",x:0,y:0}).err,"NOT_ADJACENT");assert.equal(act(g,{k:"build",type:"solar",x:3,y:2}).err,"TILE_OCCUPIED")});
test("idle player never gets non-finite numbers and game ends",()=>{let g=newGame(2,"normal");for(let i=0;i<110;i++)g=endSol(g);assert.ok(g.over);assert.ok(["o2","water","food","bat","mc","dose"].every(k=>Number.isFinite(g[k])))});
test("building spends MC",()=>{const g=act(newGame(1,"normal"),{k:"build",type:"o2",x:3,y:1}).s;assert.equal(g.mc,1200-C.mod.o2.c)});
