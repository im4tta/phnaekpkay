/* Shared application state. Other modules read these bindings directly (ES module live bindings) and change them through the assign…() functions. */

export let images = []; // {id, src, label, natW, natH, imgEl, selected}
export function assignImages(value) { images = value; }
export let nextId = 1;
export function assignNextId(value) { nextId = value; }
export function takeId() { return nextId++; }
export let mode = 'slider'; // 'grid' | 'slider'
export function assignMode(value) { mode = value; }
export let cols = 2;
export function assignCols(value) { cols = value; }
export let view = { zoom: 1, panx: 0, pany: 0 };
export function assignView(value) { view = value; }
export let sliderState = { leftId: null, middleId: null, rightId: null, clip: 50, clip2: 75, three: false, leftView:{zoom:1,x:0,y:0}, rightView:{zoom:1,x:0,y:0}, thirdView:{zoom:1,x:0,y:0} };
export function assignSliderState(value) { sliderState = value; }
export let overlayState = { baseId: null, topId: null, thirdId: null, density: 50, thirdDensity: 55 };
export function assignOverlayState(value) { overlayState = value; }
export let dragSrcIdx = null;
export function assignDragSrcIdx(value) { dragSrcIdx = value; }
export let pulseRAF = null, pulseStart = null;
export function assignPulseRAF(value) { pulseRAF = value; }
export function assignPulseStart(value) { pulseStart = value; }
export let changeState = { beforeId:null, afterId:null, method:'rgb', threshold:30, minSize:12 };
export function assignChangeState(value) { changeState = value; }
