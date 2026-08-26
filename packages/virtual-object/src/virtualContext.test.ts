import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { VirtualContext } from "./virtualContext.js"

describe("VirtualContext", () => {
  it("creates an empty context and exports a root object", () => {
    const { context, warnings } = VirtualContext.createEmpty()
    assert.equal(warnings.length, 0)
    assert.equal(context.active, true)

    const { context: exported } = context.export()
    assert.equal(exported.Object.Name.Data, "EmptyObject")
    assert.deepEqual(exported.Object.Position.Data, [0, 0, 0])
  })

  it("creates child slots", () => {
    const { context } = VirtualContext.createEmpty()
    const child = context.object.createChild({ name: "Child" })
    assert.equal(child.name.asPrimitive(), "Child")
    assert.equal(context.object.children.length, 1)
  })
})
