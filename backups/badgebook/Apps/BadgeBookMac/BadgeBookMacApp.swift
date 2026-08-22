import SwiftUI
import BadgeBookKit

/// BadgeBook for macOS — review-first logo matching for your address book.
/// Xcode project wiring comes in Phase 1 (see docs/ROADMAP.md); this shell
/// already exercises the real engine end-to-end.
@main
struct BadgeBookMacApp: App {
    @StateObject private var model = ScanViewModel()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(model)
                .frame(minWidth: 760, minHeight: 520)
        }
        .windowStyle(.titleBar)
    }
}

/// Drives scan → match → review. Contacts access is injected so tests and the
/// web shell can substitute a mock provider.
@MainActor
final class ScanViewModel: ObservableObject {
    enum Stage { case idle, scanning, matching(done: Int, total: Int), review, applying }
    @Published var stage: Stage = .idle
    @Published var results: [MatchResult] = []

    var autoAccepted: [MatchResult] { results.filter { $0.confidence == .high } }
    var needsReview: [MatchResult] { results.filter { $0.confidence == .medium || $0.confidence == .low } }
    var notFound: [MatchResult] { results.filter { $0.confidence == .skip } }
}
