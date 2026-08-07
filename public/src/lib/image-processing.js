/* Shared browser image processing primitives for Phnaek Pkay. */
(function(global){
  'use strict';

  function sharpen(ctx,width,height,amount){
    if(!amount) return false;
    try{
      const image=ctx.getImageData(0,0,width,height);
      const source=new Uint8ClampedArray(image.data);
      const strength=Math.min(.8,Math.max(0,amount));
      const center=1+4*strength;
      for(let y=1;y<height-1;y++) for(let x=1;x<width-1;x++){
        const p=(y*width+x)*4;
        for(let c=0;c<3;c++) image.data[p+c]=center*source[p+c]-strength*(source[p-4+c]+source[p+4+c]+source[p-width*4+c]+source[p+width*4+c]);
      }
      ctx.putImageData(image,0,0);
      return true;
    }catch(err){ return false; }
  }

  global.PhnaekPkayImageProcessing={sharpen};
})(window);
