import SwiftUI
import BackgroundTasks
import BadgeBookKit

/// BadgeBook for iOS. Matching runs under BGProcessingTask (typically while
/// charging overnight); a local notification brings the user into the review
/// queue when it's ready (ARCHITECTURE §data-flow).
@main
struct BadgeBookiOSApp: App {
    static let matchTaskIdentifier = "app.badgebook.match"

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
            Text("BadgeBook")
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
        // Phase 2: resume the persisted match queue, then post a local
        // UNUserNotification "Your logos are ready to review".
        task.setTaskCompleted(success: true)
        schedule()
    }
}
