import Foundation

/// vendor/crest image-flags: detect transparency without rendering, and score
/// iconic marks above opaque JPEG wordmarks.
public enum ImageFlags {

    public static func hasAlpha(_ data: Data, contentType: String? = nil) -> Bool {
        let type = (contentType ?? "").lowercased()
        if type.contains("svg") { return true }
        if type.contains("jpeg") || type.contains("jpg") || type.contains("icon") { return false }
        if type.contains("png") || isPNG(data) { return pngHasAlpha(data) }
        return false
    }

    public static func isPNG(_ data: Data) -> Bool {
        data.count >= 24 && data.starts(with: [0x89, 0x50, 0x4E, 0x47])
    }

    /// PNG color type 4/6 or a tRNS chunk means the asset can sit on a contact card.
    public static func pngHasAlpha(_ data: Data) -> Bool {
        guard data.count >= 26 else { return false }
        let colorType = data[25]
        if colorType == 4 || colorType == 6 { return true }
        var offset = 8
        while offset + 8 <= data.count {
            let length = Int(data[offset]) << 24 | Int(data[offset + 1]) << 16
                | Int(data[offset + 2]) << 8 | Int(data[offset + 3])
            let name = String(bytes: data[offset + 4 ..< offset + 8], encoding: .ascii) ?? ""
            if name == "tRNS" { return true }
            if name == "IEND" { break }
            let next = offset + 12 + length
            if next <= offset { break }
            offset = next
        }
        return false
    }

    /// Letter-tile / empty fallback: tiny files are not real logos.
    public static func isTooSmall(_ data: Data) -> Bool {
        data.count < 80
    }
}
