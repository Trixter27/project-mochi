import { ExtrudeGeometry, Shape, ShapeGeometry } from 'three'
import { CAR } from './carConfig.ts'

function bodyProfile() {
  // Short rear deck, longer wedge hood, and open wheel wells. Forward is +Z.
  const shape = new Shape()
  shape.moveTo(-1.52, 0.34)
  shape.quadraticCurveTo(-1.69, 0.45, -1.55, 0.75)
  shape.lineTo(-0.85, 0.8)
  shape.lineTo(0.36, 0.79)
  shape.lineTo(1.13, 0.76)
  shape.quadraticCurveTo(1.45, 0.72, 1.62, 0.59)
  shape.lineTo(1.62, 0.4)
  shape.quadraticCurveTo(1.59, 0.34, 1.48, 0.34)
  for (const axle of [CAR.wheelbase, -CAR.wheelbase]) {
    shape.lineTo(axle + CAR.archRadius, CAR.axleHeight)
    shape.absarc(axle, CAR.axleHeight, CAR.archRadius, 0, Math.PI, false)
  }
  shape.lineTo(-1.52, 0.34)
  shape.closePath()
  return shape
}

function cabinProfile(inset = 0) {
  const shape = new Shape()
  shape.moveTo(-1.02 + inset, 0.78 + inset)
  shape.lineTo(-0.69 + inset, 1.13 - inset)
  shape.quadraticCurveTo(-0.61, 1.2 - inset, -0.45, 1.2 - inset)
  shape.lineTo(-0.17, 1.2 - inset)
  shape.quadraticCurveTo(-0.03, 1.2 - inset, 0.07, 1.14 - inset)
  shape.lineTo(0.55 - inset, 0.78 + inset)
  shape.closePath()
  return shape
}

function extrude(shape: Shape, width: number, bevel: number) {
  const geometry = new ExtrudeGeometry(shape, { depth: width, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, steps: 1, curveSegments: 5 })
  geometry.translate(0, 0, -width / 2)
  geometry.rotateY(-Math.PI / 2)
  return geometry
}

export function createCarGeometry() {
  return {
    body: extrude(bodyProfile(), 1.36, 0.04),
    cabin: extrude(cabinProfile(), 1.02, 0.04),
    window: new ShapeGeometry(cabinProfile(0.07), 5),
  }
}
