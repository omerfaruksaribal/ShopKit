import Foundation

struct UserModel: Codable {
    let id: String
    let email: String
    let role: String
    let token: String?
}
