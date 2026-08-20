import Foundation

/// Undo log (WRITE POLICY §7): every apply batch first persists the contacts'
/// prior images (or "had none" markers), so any batch is one-tap restorable.
public struct UndoLog: Sendable {
    public let directory: URL

    public init(directory: URL? = nil) {
        if let directory {
            self.directory = directory
        } else {
            let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
            self.directory = base.appendingPathComponent("ContactLogo/Undo", isDirectory: true)
        }
    }

    struct BatchMeta: Codable {
        struct Entry: Codable {
            let contactID: String
            let previousImageFile: String? // nil → previously no image
        }
        let createdAt: Date
        let entries: [Entry]
    }

    /// Call BEFORE applying. Returns the batch directory.
    @discardableResult
    public func recordBatch(_ entries: [ChangeSet.Entry]) throws -> URL {
        let batchID = UUID().uuidString
        let dir = directory.appendingPathComponent(batchID, isDirectory: true)
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        var meta: [BatchMeta.Entry] = []
        for entry in entries {
            var file: String? = nil
            if let prev = entry.previousImageData {
                file = "\(entry.contactID).img"
                try prev.write(to: dir.appendingPathComponent(file!))
            }
            meta.append(.init(contactID: entry.contactID, previousImageFile: file))
        }
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        try encoder.encode(BatchMeta(createdAt: Date(), entries: meta))
            .write(to: dir.appendingPathComponent("meta.json"))
        return dir
    }

    public func listBatches() throws -> [URL] {
        try FileManager.default.contentsOfDirectory(at: directory, includingPropertiesForKeys: nil)
            .filter { $0.hasDirectoryPath }
            .sorted { $0.lastPathComponent < $1.lastPathComponent }
    }

    /// Restore a batch: puts previous images back (or removes applied ones).
    public func restore(batchID: String, using provider: any ContactsProvider) async throws {
        let dir = directory.appendingPathComponent(batchID, isDirectory: true)
        let meta = try JSONDecoder().decode(BatchMeta.self, from: Data(contentsOf: dir.appendingPathComponent("meta.json")))
        for entry in meta.entries {
            if let file = entry.previousImageFile {
                let data = try Data(contentsOf: dir.appendingPathComponent(file))
                try await provider.setImage(data, forContactID: entry.contactID)
            } else {
                try await provider.removeImage(forContactID: entry.contactID)
            }
        }
    }
}
