import { randomUUID } from "node:crypto"
import type { VirtualContext } from "./virtualContext.js"
import type { VirtualSlot } from "./virtualSlot.js"

export const generateId = (): string => randomUUID()

export const processVirtualSlot = (
  slot: VirtualSlot,
  callback: (slot: VirtualSlot) => void,
): void => {
  callback(slot)
  for (const child of slot.children) {
    processVirtualSlot(child, callback)
  }
}

export const processVirtualSlotWithPath = (
  slot: VirtualSlot,
  parentPath: string,
  callback: (slot: VirtualSlot, path: string) => void,
): void => {
  const name = slot.name.asPrimitive()
  const currentPath = `${parentPath}/${name == null ? "" : String(name)}`
  callback(slot, currentPath)
  for (const child of slot.children) {
    processVirtualSlotWithPath(child, currentPath, callback)
  }
}

export const deleteHolder = (context: VirtualContext): VirtualContext => {
  const rootName = context.object.name.asPrimitive()
  const firstChild = context.object.children[0]
  if (rootName === "Holder" && firstChild) {
    context.setRootObject(firstChild)
  }
  return context
}
