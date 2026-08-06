importScripts('https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/ort.min.js');

ort.env.wasm.wasmPaths='https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/';
ort.env.wasm.numThreads=1;

let session=null;
self.onmessage=async(event)=>{
  const message=event.data||{};
  try{
    if(message.type==='load'){
      self.postMessage({type:'progress',value:15,label:'Loading model in background...'});
      session=await ort.InferenceSession.create(message.buffer,{executionProviders:['wasm']});
      self.postMessage({type:'progress',value:100,label:'Model ready'});
      self.postMessage({type:'ready',inputName:session.inputNames[0],outputName:session.outputNames[0]});
    }else if(message.type==='run'){
      if(!session) throw Error('Model is not loaded');
      self.postMessage({type:'progress',value:20,label:'Running super-resolution inference...'});
      const input=new ort.Tensor('float32',message.data,[1,3,message.height,message.width]);
      const result=await session.run({[session.inputNames[0]]:input});
      self.postMessage({type:'progress',value:88,label:'Decoding enhanced image...'});
      const output=result[session.outputNames[0]];
      self.postMessage({type:'result',data:output.data.buffer,dims:output.dims},[output.data.buffer]);
    }
  }catch(error){ self.postMessage({type:'error',message:error.message||String(error)}); }
};
