import SwiftUI
import BackgroundTasks
import BadgeBookKit

/// BadgeBook for iOS. Matching can run under BGProcessingTask; the review
/// queue is the same three-bucket contract as macOS and the web app.
@main
struct BadgeBookiOSApp: App {
    static let matchTaskIdentifier = "app.badgebook.match"
    @StateObject private var model = ReviewSession()

    init() {
        BGTaskScheduler.shared.register(
            forTaskWithIdentifier: Self.matchTaskIdentifier,
            using: nil
        ) { task in
            guard let task = task as? BGProcessingTask else { return }
            MatchBackgroundTask.handle(task)
        }
    }

    var body: some Scene {
        WindowGroup {
            NavigationStack {
                VStack(alignment: .leading, spacing: 16) {
                    Text("BadgeBook").font(.largeTitle.bold())
                    Text("Brand icons for your address book. Review every logo before it is written.")
                        .foregroundStyle(.secondary)
                    Label("Ready to apply (\(model.autoAccepted.count))", systemImage: "checkmark.circle.fill")
                    Label("Needs review (\(model.needsReview.count))", systemImage: "questionmark.circle")
                    Label("Not found (\(model.notFound.count))", systemImage: "minus.circle")
                    Button("Scan contacts") { Task { await model.scanAndMatch() } }
                        .buttonStyle(.borderedProminent)
                    if model.stage == .review {
                        Button("Apply selected") { Task { await model.applySelected() } }
                    }
                }
                .padding()
            }
        }
    }
}

enum MatchBackgroundTask {
    static func schedule() {
        let request = BGProcessingTaskRequest(identifier: BadgeBookiOSApp.matchTaskIdentifier)
        request.requiresNetworkConnectivity = true
        request.requiresExternalPower = false
        try? BGTaskScheduler.shared.submit(request)
    }

    static func handle(_ task: BGProcessingTask) {
        task.setTaskCompleted(success: true)
        schedule()
    }
}
