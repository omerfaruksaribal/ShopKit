import Foundation

struct RegisterRequest: Codable {
    let email: String
    let password: String
    let role: String
}
