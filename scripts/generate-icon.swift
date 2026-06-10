#!/usr/bin/env swift
// Orrery app icon generator. Produces three 1024×1024 PNG variants
// in icon-variants/ for visual comparison before installing.
// Re-run after edits:  swift scripts/generate-icon.swift

import AppKit
import CoreGraphics

let size: CGFloat = 1024
let outDir = "icon-variants"

// ─── Color helpers ──────────────────────────────────────────────────────────

func rgb(_ r: Int, _ g: Int, _ b: Int, _ a: CGFloat = 1) -> CGColor {
    CGColor(red: CGFloat(r) / 255, green: CGFloat(g) / 255, blue: CGFloat(b) / 255, alpha: a)
}

func hex(_ s: String, _ a: CGFloat = 1) -> CGColor {
    var v = s
    if v.hasPrefix("#") { v.removeFirst() }
    let n = UInt32(v, radix: 16) ?? 0
    return rgb(Int((n >> 16) & 0xff), Int((n >> 8) & 0xff), Int(n & 0xff), a)
}

// ─── Drawing primitives ─────────────────────────────────────────────────────

func fillBackground(_ ctx: CGContext, top: CGColor, bottom: CGColor) {
    let space = CGColorSpaceCreateDeviceRGB()
    guard let grad = CGGradient(colorsSpace: space, colors: [top, bottom] as CFArray, locations: [0, 1]) else { return }
    ctx.drawLinearGradient(grad, start: CGPoint(x: size / 2, y: size), end: CGPoint(x: size / 2, y: 0), options: [])
}

func radialGlow(_ ctx: CGContext, center: CGPoint, inner: CGFloat, outer: CGFloat, color: CGColor, alpha: CGFloat) {
    let space = CGColorSpaceCreateDeviceRGB()
    let cc = color.copy(alpha: alpha) ?? color
    let transparent = color.copy(alpha: 0) ?? color
    guard let grad = CGGradient(colorsSpace: space, colors: [cc, transparent] as CFArray, locations: [0, 1]) else { return }
    ctx.drawRadialGradient(grad, startCenter: center, startRadius: inner, endCenter: center, endRadius: outer, options: [])
}

func fillCircle(_ ctx: CGContext, center: CGPoint, radius: CGFloat, color: CGColor) {
    ctx.setFillColor(color)
    ctx.fillEllipse(in: CGRect(x: center.x - radius, y: center.y - radius, width: radius * 2, height: radius * 2))
}

func strokeEllipse(_ ctx: CGContext, center: CGPoint, rx: CGFloat, ry: CGFloat, lineWidth: CGFloat, color: CGColor) {
    ctx.saveGState()
    ctx.setStrokeColor(color)
    ctx.setLineWidth(lineWidth)
    ctx.strokeEllipse(in: CGRect(x: center.x - rx, y: center.y - ry, width: rx * 2, height: ry * 2))
    ctx.restoreGState()
}

func tiltedRing(_ ctx: CGContext, center: CGPoint, rx: CGFloat, ry: CGFloat, tilt: CGFloat, lineWidth: CGFloat, color: CGColor) {
    ctx.saveGState()
    ctx.translateBy(x: center.x, y: center.y)
    ctx.rotate(by: tilt)
    strokeEllipse(ctx, center: .zero, rx: rx, ry: ry, lineWidth: lineWidth, color: color)
    ctx.restoreGState()
}

func planetOnRing(_ ctx: CGContext, center: CGPoint, rx: CGFloat, ry: CGFloat, tilt: CGFloat, angle: CGFloat, radius: CGFloat, color: CGColor, glow: CGColor? = nil) {
    let x = center.x + cos(angle) * rx * cos(tilt) - sin(angle) * ry * sin(tilt)
    let y = center.y + cos(angle) * rx * sin(tilt) + sin(angle) * ry * cos(tilt)
    let p = CGPoint(x: x, y: y)
    if let g = glow {
        radialGlow(ctx, center: p, inner: radius * 0.4, outer: radius * 4, color: g, alpha: 0.85)
    }
    fillCircle(ctx, center: p, radius: radius, color: color)
}

func starField(_ ctx: CGContext, seed: UInt64, count: Int, rect: CGRect, brightness: CGFloat) {
    var s = seed
    func rand() -> CGFloat {
        s = s &* 6364136223846793005 &+ 1442695040888963407
        return CGFloat((s >> 33) & 0x7fffffff) / CGFloat(0x7fffffff)
    }
    for _ in 0..<count {
        let x = rect.origin.x + rand() * rect.width
        let y = rect.origin.y + rand() * rect.height
        let r = 0.5 + rand() * 1.6
        let a = brightness * (0.25 + rand() * 0.75)
        fillCircle(ctx, center: CGPoint(x: x, y: y), radius: r, color: hex("ffffff", a))
    }
}

// ─── Variant A: Concentric orrery — defining feature, restrained palette ────

func drawOrreryRings(_ ctx: CGContext) {
    let top = hex("1a0833")
    let bottom = hex("050108")
    fillBackground(ctx, top: top, bottom: bottom)

    let center = CGPoint(x: size / 2, y: size / 2)
    starField(ctx, seed: 0xA1F0_4B91, count: 110, rect: CGRect(x: 0, y: 0, width: size, height: size), brightness: 0.55)

    radialGlow(ctx, center: center, inner: 0, outer: size * 0.55, color: hex("ff8a3d"), alpha: 0.22)
    radialGlow(ctx, center: center, inner: 0, outer: size * 0.18, color: hex("ffd07a"), alpha: 0.55)

    let tilt = CGFloat.pi * 0.16
    let ringColors: [(CGFloat, CGColor, CGFloat)] = [
        (0.18, hex("ffd07a", 0.55), 4.5),
        (0.30, hex("c8a6ff", 0.52), 4.0),
        (0.42, hex("8db4ff", 0.48), 3.6),
        (0.55, hex("66c7ff", 0.42), 3.2),
        (0.69, hex("ffffff", 0.30), 2.8),
    ]
    for (frac, color, lw) in ringColors {
        let r = size * frac
        tiltedRing(ctx, center: center, rx: r, ry: r * 0.42, tilt: tilt, lineWidth: lw, color: color)
    }

    fillCircle(ctx, center: center, radius: size * 0.085, color: hex("fff2c4"))
    radialGlow(ctx, center: center, inner: size * 0.05, outer: size * 0.18, color: hex("ffb84d"), alpha: 0.9)

    planetOnRing(ctx, center: center, rx: size * 0.30, ry: size * 0.30 * 0.42, tilt: tilt, angle: -.pi * 0.18, radius: size * 0.018, color: hex("ffd9a8"), glow: hex("ff9b3a"))
    planetOnRing(ctx, center: center, rx: size * 0.42, ry: size * 0.42 * 0.42, tilt: tilt, angle: .pi * 0.62, radius: size * 0.024, color: hex("9ccaff"), glow: hex("4d8fff"))
    planetOnRing(ctx, center: center, rx: size * 0.55, ry: size * 0.55 * 0.42, tilt: tilt, angle: .pi * 1.15, radius: size * 0.022, color: hex("d7c3ff"), glow: hex("8a6bff"))
}

// ─── Variant B: Bold sun — single focal point, very iOS-grid friendly ───────

func drawBoldSun(_ ctx: CGContext) {
    fillBackground(ctx, top: hex("0a0a1f"), bottom: hex("020207"))

    let center = CGPoint(x: size / 2, y: size / 2)
    starField(ctx, seed: 0xBE11_C0DE, count: 90, rect: CGRect(x: 0, y: 0, width: size, height: size), brightness: 0.5)

    radialGlow(ctx, center: center, inner: 0, outer: size * 0.62, color: hex("ff7a2d"), alpha: 0.42)
    radialGlow(ctx, center: center, inner: 0, outer: size * 0.34, color: hex("ffd07a"), alpha: 0.7)
    radialGlow(ctx, center: center, inner: 0, outer: size * 0.18, color: hex("ffffff"), alpha: 0.55)

    fillCircle(ctx, center: center, radius: size * 0.215, color: hex("fff6dc"))

    let tilt = CGFloat.pi * 0.14
    strokeEllipse(ctx, center: center, rx: size * 0.34, ry: size * 0.34 * 0.36, lineWidth: 5, color: hex("ffd9a8", 0.45))
    tiltedRing(ctx, center: center, rx: size * 0.42, ry: size * 0.42 * 0.34, tilt: tilt, lineWidth: 4, color: hex("c8a6ff", 0.42))

    planetOnRing(ctx, center: center, rx: size * 0.42, ry: size * 0.42 * 0.34, tilt: tilt, angle: .pi * 0.78, radius: size * 0.026, color: hex("9ccaff"), glow: hex("4d8fff"))
}

// ─── Variant C: Abstract orbital mark — designer-y, less literal ────────────

func drawAbstractMark(_ ctx: CGContext) {
    fillBackground(ctx, top: hex("131a2e"), bottom: hex("05080f"))

    let center = CGPoint(x: size / 2, y: size / 2)
    starField(ctx, seed: 0xC0FF_EE42, count: 70, rect: CGRect(x: 0, y: 0, width: size, height: size), brightness: 0.45)

    radialGlow(ctx, center: center, inner: 0, outer: size * 0.50, color: hex("ffd07a"), alpha: 0.28)

    let baseRy: CGFloat = size * 0.42 * 0.30
    for (i, frac) in [0.28, 0.40, 0.52].enumerated() {
        let r = size * CGFloat(frac)
        let tilt = CGFloat.pi * (0.08 + Double(i) * 0.07)
        let alpha: CGFloat = [0.85, 0.7, 0.55][i]
        let color = [hex("ffd07a"), hex("9ccaff"), hex("c8a6ff")][i].copy(alpha: alpha) ?? hex("ffffff")
        tiltedRing(ctx, center: center, rx: r, ry: baseRy * CGFloat(frac) / 0.42, tilt: tilt, lineWidth: 5, color: color)
    }

    fillCircle(ctx, center: center, radius: size * 0.065, color: hex("fff2c4"))
    radialGlow(ctx, center: center, inner: size * 0.035, outer: size * 0.16, color: hex("ffb84d"), alpha: 0.92)

    let tilt0 = CGFloat.pi * 0.08
    planetOnRing(ctx, center: center, rx: size * 0.28, ry: baseRy * 0.28 / 0.42, tilt: tilt0, angle: .pi * 0.35, radius: size * 0.022, color: hex("fff0c2"), glow: hex("ff9b3a"))
}

// ─── Variant D: Constellation + sun/planet — explicit astronomy cue ─────────

func drawConstellationSunPlanet(_ ctx: CGContext) {
    fillBackground(ctx, top: hex("0b1430"), bottom: hex("030711"))

    starField(ctx, seed: 0x51A7_C0DE, count: 150, rect: CGRect(x: 0, y: 0, width: size, height: size), brightness: 0.62)

    // Main sun and halo
    let sun = CGPoint(x: size * 0.43, y: size * 0.56)
    radialGlow(ctx, center: sun, inner: 0, outer: size * 0.46, color: hex("ff9a3f"), alpha: 0.30)
    radialGlow(ctx, center: sun, inner: 0, outer: size * 0.22, color: hex("ffd987"), alpha: 0.72)
    fillCircle(ctx, center: sun, radius: size * 0.105, color: hex("fff6d9"))
    radialGlow(ctx, center: sun, inner: size * 0.04, outer: size * 0.16, color: hex("ffb24d"), alpha: 0.94)

    // Planet on a visible orbit around sun
    let orbitTilt = CGFloat.pi * 0.17
    let orbitRx = size * 0.33
    let orbitRy = size * 0.33 * 0.42
    tiltedRing(ctx, center: sun, rx: orbitRx, ry: orbitRy, tilt: orbitTilt, lineWidth: 5.0, color: hex("b3cfff", 0.46))
    tiltedRing(ctx, center: sun, rx: orbitRx * 0.76, ry: orbitRy * 0.76, tilt: orbitTilt, lineWidth: 3.5, color: hex("88b8ff", 0.26))
    planetOnRing(ctx, center: sun, rx: orbitRx, ry: orbitRy, tilt: orbitTilt, angle: .pi * 0.21, radius: size * 0.032, color: hex("a8d1ff"), glow: hex("4d90ff"))

    // Constellation pattern in upper-right to make intent unmistakable.
    let nodes: [CGPoint] = [
        CGPoint(x: size * 0.62, y: size * 0.78),
        CGPoint(x: size * 0.70, y: size * 0.84),
        CGPoint(x: size * 0.79, y: size * 0.80),
        CGPoint(x: size * 0.86, y: size * 0.88),
        CGPoint(x: size * 0.91, y: size * 0.79),
        CGPoint(x: size * 0.84, y: size * 0.70),
        CGPoint(x: size * 0.74, y: size * 0.72),
    ]

    ctx.saveGState()
    ctx.setStrokeColor(hex("bcd8ff", 0.68))
    ctx.setLineWidth(3.0)
    let links: [(Int, Int)] = [(0, 1), (1, 2), (2, 3), (3, 4), (2, 5), (5, 6), (6, 0)]
    for (a, b) in links {
        ctx.move(to: nodes[a])
        ctx.addLine(to: nodes[b])
        ctx.strokePath()
    }
    ctx.restoreGState()

    for (index, p) in nodes.enumerated() {
        let r: CGFloat = index == 2 ? size * 0.012 : size * 0.009
        radialGlow(ctx, center: p, inner: 0, outer: r * 5.0, color: hex("9bc5ff"), alpha: 0.72)
        fillCircle(ctx, center: p, radius: r, color: hex("e9f4ff"))
    }

    // Small directional comet streak for motion and depth.
    ctx.saveGState()
    ctx.setStrokeColor(hex("d7e8ff", 0.55))
    ctx.setLineWidth(4.0)
    ctx.move(to: CGPoint(x: size * 0.18, y: size * 0.80))
    ctx.addLine(to: CGPoint(x: size * 0.28, y: size * 0.73))
    ctx.strokePath()
    ctx.restoreGState()
}

// ─── Save helper ────────────────────────────────────────────────────────────

func save(_ name: String, draw: (CGContext) -> Void) {
    let cs = CGColorSpaceCreateDeviceRGB()
    guard let ctx = CGContext(data: nil, width: Int(size), height: Int(size), bitsPerComponent: 8, bytesPerRow: 0, space: cs, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { return }
    draw(ctx)
    guard let img = ctx.makeImage() else { return }
    let rep = NSBitmapImageRep(cgImage: img)
    guard let data = rep.representation(using: .png, properties: [:]) else { return }
    let path = "\(outDir)/\(name).png"
    try? data.write(to: URL(fileURLWithPath: path))
    print("wrote \(path)")
}

// ─── Main ───────────────────────────────────────────────────────────────────

try? FileManager.default.createDirectory(atPath: outDir, withIntermediateDirectories: true)
save("variant-A-orrery-rings", draw: drawOrreryRings)
save("variant-B-bold-sun", draw: drawBoldSun)
save("variant-C-abstract-mark", draw: drawAbstractMark)
save("variant-D-constellation-sun-planet", draw: drawConstellationSunPlanet)
print("\ndone — pick one, then I'll resize and install.")
