import AppKit

let output = URL(fileURLWithPath: CommandLine.arguments[1], isDirectory: true)
try FileManager.default.createDirectory(at: output, withIntermediateDirectories: true)

let navy = NSColor(srgbRed: 15/255, green: 23/255, blue: 42/255, alpha: 1)       // #0F172A
let blue = NSColor(srgbRed: 14/255, green: 165/255, blue: 233/255, alpha: 1)   // #0EA5E9
let green = NSColor(srgbRed: 16/255, green: 185/255, blue: 129/255, alpha: 1) // #10B981
let white = NSColor(srgbRed: 248/255, green: 250/255, blue: 252/255, alpha: 1)

func rounded(_ rect: NSRect, radius: CGFloat, color: NSColor) {
    color.setFill()
    NSBezierPath(roundedRect: rect, xRadius: radius, yRadius: radius).fill()
}

func drawMark(scale: CGFloat, origin: NSPoint) {
    NSGraphicsContext.saveGraphicsState()
    let transform = NSAffineTransform()
    transform.translateX(by: origin.x, yBy: origin.y)
    transform.scale(by: scale)
    transform.concat()

    // The curved handle and simple tote silhouette make a compact shop mark.
    let handle = NSBezierPath()
    handle.lineWidth = 48
    handle.lineCapStyle = .round
    handle.lineJoinStyle = .round
    handle.move(to: NSPoint(x: 392, y: 626))
    handle.curve(to: NSPoint(x: 632, y: 626), controlPoint1: NSPoint(x: 392, y: 826), controlPoint2: NSPoint(x: 632, y: 826))
    blue.setStroke()
    handle.stroke()

    rounded(NSRect(x: 250, y: 270, width: 524, height: 410), radius: 82, color: white)

    // A bold D anchors the wordmark and stays legible at launcher size.
    let d = NSAttributedString(string: "D", attributes: [
        .font: NSFont.systemFont(ofSize: 280, weight: .bold),
        .foregroundColor: navy
    ])
    d.draw(at: NSPoint(x: 399, y: 310))

    // Green check badge signals a shop that's in control.
    let badge = NSRect(x: 665, y: 210, width: 190, height: 190)
    green.setFill()
    NSBezierPath(ovalIn: badge).fill()
    let check = NSBezierPath()
    check.lineWidth = 22
    check.lineCapStyle = .round
    check.lineJoinStyle = .round
    check.move(to: NSPoint(x: 713, y: 305))
    check.line(to: NSPoint(x: 754, y: 264))
    check.line(to: NSPoint(x: 808, y: 330))
    white.setStroke()
    check.stroke()

    NSGraphicsContext.restoreGraphicsState()
}

func makeImage(size: Int, draw: () -> Void, name: String) throws {
    let image = NSImage(size: NSSize(width: size, height: size))
    image.lockFocus()
    NSColor.clear.setFill()
    NSRect(x: 0, y: 0, width: size, height: size).fill()
    draw()
    image.unlockFocus()
    guard let tiff = image.tiffRepresentation,
          let bitmap = NSBitmapImageRep(data: tiff),
          let png = bitmap.representation(using: .png, properties: [:]) else {
        throw NSError(domain: "DukaPoSBrand", code: 1, userInfo: [NSLocalizedDescriptionKey: "Could not encode \(name)"])
    }
    try png.write(to: output.appendingPathComponent(name), options: .atomic)
}

try makeImage(size: 1024, draw: {
    navy.setFill()
    NSRect(x: 0, y: 0, width: 1024, height: 1024).fill()
    let glow = NSGradient(colors: [
        NSColor(srgbRed: 14/255, green: 165/255, blue: 233/255, alpha: 0.22),
        NSColor(srgbRed: 15/255, green: 23/255, blue: 42/255, alpha: 0)
    ])!
    glow.draw(in: NSRect(x: 112, y: 112, width: 800, height: 800), relativeCenterPosition: .zero)
    drawMark(scale: 1, origin: .zero)
}, name: "icon.png")

try makeImage(size: 1024, draw: {
    drawMark(scale: 1, origin: .zero)
}, name: "adaptive-icon.png")

try makeImage(size: 1024, draw: {
    // Keep all artwork transparent so Expo can apply the same deep-slate
    // background natively on Android and iOS.
    drawMark(scale: 0.63, origin: NSPoint(x: 190, y: 468))

    let wordmark = NSMutableAttributedString()
    wordmark.append(NSAttributedString(string: "Duka", attributes: [
        .font: NSFont.systemFont(ofSize: 104, weight: .bold),
        .foregroundColor: white
    ]))
    wordmark.append(NSAttributedString(string: "PoS", attributes: [
        .font: NSFont.systemFont(ofSize: 104, weight: .bold),
        .foregroundColor: NSColor(srgbRed: 56/255, green: 189/255, blue: 248/255, alpha: 1)
    ]))
    let wordSize = wordmark.size()
    wordmark.draw(at: NSPoint(x: (1024 - wordSize.width) / 2, y: 335))

    let tagline = NSAttributedString(string: "YOUR SHOP, IN CONTROL", attributes: [
        .font: NSFont.systemFont(ofSize: 29, weight: .medium),
        .foregroundColor: NSColor(srgbRed: 148/255, green: 163/255, blue: 184/255, alpha: 1),
        .kern: 5.0
    ])
    tagline.draw(at: NSPoint(x: (1024 - tagline.size().width) / 2, y: 278))
}, name: "splash.png")

print("Generated icon.png and splash.png in \(output.path)")
