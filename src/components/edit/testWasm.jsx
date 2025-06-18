import * as ort from 'onnxruntime-web';

async function testWasm() {

    // Configure WASM paths to use files in public/wasm/
ort.env.wasm.wasmPaths = {
'ort16': '/wasm/ort-wasm-simd.wasm', // Map to available SIMD WASM
'ort-wasm-simd-threaded.wasm': '/wasm/ort-wasm-simd-threaded.wasm',
'ort-wasm-simd-threaded.jsep.wasm': '/wasm/ort-wasm-simd-threaded.jsep.wasm',
};
    

  try {
    const session = await ort.InferenceSession.create('/models/sam_onnx_example.onnx', { executionProviders: ['wasm'] });
    console.log('WASM backend initialized:', session);
  } catch (error) {
    console.error('WASM test failed:', error);
  }
}
export default testWasm();