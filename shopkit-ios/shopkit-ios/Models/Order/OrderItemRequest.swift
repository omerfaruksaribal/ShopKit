import Foundation

struct OrderItemRequest: Codable {
    let product_id: String
    let quantity: Int
}
