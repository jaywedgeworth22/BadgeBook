#if canImport(Combine)
import Combine
import Foundation

/// Shared scan → match → review → apply session for macOS and iOS.
/// High-confidence rows start selected; guessed domains never do.
@MainActor
public final class ReviewSession: ObservableObject {
    public enum Stage: Equatable { case idle, scanning, matching(done: Int, total: Int), review, applying }
    public enum Bucket { case auto, review, notFound }

    @Published public var stage: Stage = .idle
    @Published public var bucket: Bucket = .auto
    @Published public var results: [MatchResult] = []
    @Published public var selected: Set<String> = []
    @Published public var names: [String: String] = [:]
    @Published public var lastBatchID: String?

    public var autoAccepted: [MatchResult] { results.filter { $0.confidence == .high } }
    public var needsReview: [MatchResult] { results.filter { $0.confidence == .medium || $0.confidence == .low } }
    public var notFound: [MatchResult] { results.filter { $0.confidence == .skip } }

    public init() {}

    public func displayName(for id: String) -> String { names[id] ?? id }

    public func setSelected(_ id: String, _ on: Bool) {
        if on { selected.insert(id) } else { selected.remove(id) }
    }

    public func selectHigh(_ on: Bool) {
        let ids = autoAccepted.map(\.contactID)
        if on { selected.formUnion(ids) } else { selected.subtract(ids) }
    }

    public static func makePipeline() -> MatchPipeline {
        MatchPipeline(sources: [
            PreferredMarksSource(),
            SimpleIconsSource(),
            WikimediaSource(),
            FaviconSource()
        ]) { url in
            if url.scheme == "data" { return Data(contentsOf: url) }
            let (data, _) = try await URLSession.shared.data(from: url)
            return data
        }
    }

    public func scanAndMatch() async {
        #if canImport(Contacts)
        stage = .scanning
        let provider = CNContactsProvider()
        do {
            guard try await provider.requestAccess() else {
                stage = .idle
                return
            }
            let contacts = try await provider.fetchCandidates()
            names = Dictionary(uniqueKeysWithValues: contacts.map { ($0.id, $0.displayName) })
            let pipeline = Self.makePipeline()
            let targets = contacts.filter { pipeline.classify($0) != .nonBrand }
            stage = .matching(done: 0, total: targets.count)
            var out: [MatchResult] = []
            for (i, contact) in targets.enumerated() {
                out.append(await pipeline.match(contact))
                stage = .matching(done: i + 1, total: targets.count)
            }
            results = out
            selected = Set(out.filter { $0.confidence == .high }.map(\.contactID))
            stage = .review
        } catch {
            stage = .idle
        }
        #else
        stage = .idle
        #endif
    }

    public func applySelected() async {
        #if canImport(Contacts)
        stage = .applying
        let provider = CNContactsProvider()
        var entries: [ChangeSet.Entry] = []
        for result in results where selected.contains(result.contactID) {
            guard let url = result.candidates.first?.imageURL,
                  let data = try? await Self.fetchImage(url),
                  data.count > 80 else { continue }
            let prev = try? await provider.imageData(forContactID: result.contactID)
            entries.append(.init(contactID: result.contactID, newImageData: data, previousImageData: prev))
        }
        do {
            let dir = try UndoLog().recordBatch(entries)
            lastBatchID = dir.lastPathComponent
            for entry in entries {
                try await provider.setImage(entry.newImageData, forContactID: entry.contactID)
            }
        } catch {
            /* stay in review */
        }
        stage = .review
        #endif
    }

    public func undoLast() async {
        #if canImport(Contacts)
        guard let id = lastBatchID else { return }
        let provider = CNContactsProvider()
        try? await UndoLog().restore(batchID: id, using: provider)
        lastBatchID = nil
        #endif
    }

    public static func fetchImage(_ url: URL) async throws -> Data {
        if url.scheme == "data" { return try Data(contentsOf: url) }
        let (data, _) = try await URLSession.shared.data(from: url)
        return data
    }
}
#endif
