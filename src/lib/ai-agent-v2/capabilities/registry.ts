import { Capability } from '../contracts/capability';
import { productCreateCapability } from './products/handlers';
import { categoryCreateCapability } from './categories/handlers';
import { orderUpdateStatusCapability } from './orders/handlers';
import { discountCreateCapability } from './discounts/handlers';
import { blogPostCreateCapability } from './content/handlers';

const registry = new Map<string, Capability>();

// Register initial robust capabilities
registerCapability(productCreateCapability);
registerCapability(categoryCreateCapability);
registerCapability(orderUpdateStatusCapability);
registerCapability(discountCreateCapability);
registerCapability(blogPostCreateCapability);

export function registerCapability(capability: Capability) {
  registry.set(capability.name, capability);
}

export function getCapability(name: string): Capability | null {
  return registry.get(name) || null;
}

export function getAllCapabilities(): Capability[] {
  return Array.from(registry.values());
}
export { getCapability as getCapabilityByName };
export { getAllCapabilities as getCapabilities };
export { registry as capabilityRegistry };
