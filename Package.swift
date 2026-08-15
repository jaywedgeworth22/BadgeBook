// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "BadgeBook",
    platforms: [.macOS(.v14), .iOS(.v17)],
    products: [
        .library(name: "BadgeBookKit", targets: ["BadgeBookKit"]),
        .executable(name: "badgebook", targets: ["badgebook"])
    ],
    targets: [
        .target(name: "BadgeBookKit"),
        .executableTarget(
            name: "badgebook",
            dependencies: ["BadgeBookKit"],
            path: "Sources/badgebook"
        ),
        .testTarget(name: "BadgeBookKitTests", dependencies: ["BadgeBookKit"])
    ]
)
