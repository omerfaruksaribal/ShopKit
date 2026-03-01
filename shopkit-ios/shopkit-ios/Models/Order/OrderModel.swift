import Foundation

struct OrderModel: Codable {
    let id: String
    let customer_id: String
    let total_amount: String
    let status: String
    let tax_rate: String
    let invoice_url: String?
    let created_at: String
    let updated_at: String
    let items: [OrderItemModel]?
    let transactions: [TransactionModel]?

    var totalAmountValue: Double {
        Double(total_amount) ?? 0.0
    }
}
