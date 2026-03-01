import Foundation

struct TransactionModel: Codable {
    let id: String
    let order_id: String
    let amount: String
    let status: String
    let provider: String
    let created_at: String

    var amountValue: Double {
        Double(amount) ?? 0.0
    }
}
