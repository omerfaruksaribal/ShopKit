import Foundation

struct CreateOrderRequest: Codable {
    let items: [OrderItemRequest]
}
