// Authenticated descriptive metadata, never an authorization or feature gate.
// Keep protocol 1 and its existing hostName/capabilities fields for older clients.
const labels = Object.freeze({ darwin: 'macOS', linux: 'Linux', win32: 'Windows', unknown: 'Computer' });
const architectures = new Set(['arm', 'arm64', 'ia32', 'loong64', 'mips', 'mipsel', 'ppc', 'ppc64', 'riscv64', 's390', 's390x', 'x64']);

export function hostPlatformMetadata({ platform = globalThis.process?.platform, architecture = globalThis.process?.arch } = {}) {
  const hostPlatform = typeof platform === 'string' && Object.hasOwn(labels, platform) ? platform : 'unknown';
  return { hostPlatform, hostPlatformLabel: labels[hostPlatform], hostArchitecture: architectures.has(architecture) ? architecture : 'unknown' };
}

export function readHostPlatformMetadata(value) {
  return hostPlatformMetadata({ platform: value?.hostPlatform || 'unknown', architecture: value?.hostArchitecture || 'unknown' });
}
