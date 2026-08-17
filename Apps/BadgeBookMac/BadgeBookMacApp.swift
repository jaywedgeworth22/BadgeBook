import SwiftUI
import BadgeBookKit

/// BadgeBook for macOS — review-first logo matching for your address book.
@main
struct BadgeBookMacApp: App {
    @StateObject private var model = ReviewSession()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(model)
                .frame(minWidth: 760, minHeight: 520)
        }
        .windowStyle(.titleBar)
    }
}
