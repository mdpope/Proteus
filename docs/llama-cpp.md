# llama.cpp inference provider

Use an official Windows CUDA llama-server binary with an existing GGUF. LM Studio itself uses llama.cpp; a standalone server is useful for background operation and a shared OpenAI-compatible API, not an automatic speed guarantee.

## Proteus connection

Create ~/.config/proteus/llama-cpp.json, or set PROTEUS_LLAMA_CPP_CONFIG to another private configuration file:

```json
{
  "endpoint": "https://inference-host:8080/v1",
  "apiKeyFile": "api-key.txt",
  "caFile": "server-public.crt"
}
```

Paths resolve relative to the configuration file. The API key is read from its private file, never a URL or saved chat. caFile is optional for a publicly trusted server; a supplied CA trusts only this connection and never disables TLS verification. Plain HTTP is allowed only on loopback. Redirects are not followed. Restart Proteus after changing connection configuration, then refresh Providers and select llama.cpp in New Chat. Other Proteus computers can use this HTTPS configuration after receiving the provider build, or use existing paired-computer access to execute on the serving computer. Other apps need an OpenAI-compatible base URL, model ID and bearer API key, plus trust for the server certificate.

## Windows starting point

For an RTX 4060 8 GB and Ryzen 5950X, start with Q4_K_M, 20 GPU layers, 8,192 context, 12 generation threads, 16 prompt threads, Flash Attention, one parallel slot and draft-mtp with three draft tokens. The model must contain compatible MTP tensors. The deployed Proteus profile uses 32,768 context, Q8_0 K/V cache and 18 GPU layers to fit its 17 host-tool schemas with room for selected sources. Dedicated inference VRAM measured about 5.85 GiB. Increase context only after measuring dedicated VRAM and prompt throughput. Full offload of a 27B Q4 model cannot fit on this GPU. Avoid loading another model concurrently.

Bind explicitly to loopback and the intended LAN interface. Enable llama.cpp API-key-file, SSL certificate and SSL private-key options. Restrict the inbound firewall rule to the intended subnet and port. Keep private keys separate from public certificate/client setup material. Run the server hidden under the current user and configure a login startup entry; a logged-out PC is not a verified always-on service. Keep the exact binary version, hashes and private acceptance receipts outside Git.

The initial deployment is text/tool use. The existing vision projector is preserved but not loaded; image input is unavailable unless the server actually advertises it. Reasoning efforts are shown only when advertised by the live template metadata.

## Acceptance

Offline tests cover metadata, streaming/history, denied tools, cancellation, key transport and token-budget errors. The opt-in test/llama-cpp-ui.mjs exercises a disposable real desktop against the configured live server; it is not part of the offline suite. Live two-round fixture read/answer completed with observed usage. Cross-device reachability and real application compatibility require a client-side check after the firewall is approved.
