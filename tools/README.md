# Model conversion notes

Real-ESRGAN and SwinIR repositories normally publish PyTorch checkpoints
(`.pth`), not ONNX browser models. Convert the exact network and checkpoint in
a Python environment using a tested ONNX export script, then validate the
input/output tensor names and dimensions with ONNX Runtime before placing the
result in `models/`.

Recommended browser runtime: ONNX Runtime Web with WebGPU and WASM fallback.
Process source imagery in tiles and never feed AI-generated frames into change
detection. Super-resolution can invent plausible structures.
