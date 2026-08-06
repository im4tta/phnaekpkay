# Local super-resolution models

The browser-ready model has been exported here:

```text
models/RealESRGAN_x4plus.onnx
```

It is a 4x Real-ESRGAN model exported from the local PyTorch checkpoint and
validated with the ONNX checker. Place additional browser-compatible models
here using the same pattern:

```text
models/RealESRGAN_x4plus.onnx
```

Then run the Vite server and click **Load hosted model**. The default URL is
`/models/RealESRGAN_x4plus.onnx`.

The `.pth` files shipped by the Python Real-ESRGAN project are not browser
models. They must be exported to ONNX first, and the exported model must accept
`[1, 3, height, width]` float RGB input normalized to `0..1` and return an
`[1, 3, height, width]`-style output. Keep model files out of git if they are
large; static hosting and browser memory limits still apply.
