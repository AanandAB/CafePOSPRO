import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";
// import * as QRCode from "qrcode.react";

// Types for payment gateway integration
interface PaymentGatewayConfig {
  apiKey: string;
  merchantId: string;
  environment: "sandbox" | "production";
}

interface PaymentStatusResponse {
  status: "pending" | "success" | "failed" | "cancelled";
  transactionId?: string;
  paymentMethod?: string;
  timestamp?: number;
}

interface PaymentGateway {
  checkPaymentStatus(transactionId: string): Promise<PaymentStatusResponse>;
}

// Mock payment gateway implementation - in a real app, this would connect to an actual payment provider
class MockPaymentGateway implements PaymentGateway {
  private config: PaymentGatewayConfig;
  
  constructor(config: PaymentGatewayConfig) {
    this.config = config;
  }
  
  async checkPaymentStatus(transactionId: string): Promise<PaymentStatusResponse> {
    // In a real implementation, this would call the payment gateway API to check status
    // For demo purposes, we'll simulate a response
    // In a real scenario, this would be replaced with actual API calls
    
    // Simulate random success/failure for demo
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // In a real implementation, you would make an API call like:
    // const response = await fetch(`${this.config.apiUrl}/payments/${transactionId}/status`, {
    //   headers: {
    //     'Authorization': `Bearer ${this.config.apiKey}`,
    //     'Content-Type': 'application/json'
    //   }
    // });
    // return await response.json();
    
    return {
      status: Math.random() > 0.3 ? "success" : "failed",
      transactionId,
      paymentMethod: "card",
      timestamp: Date.now()
    };
  }
}

interface PaymentProcessorProps {
  orderId: Id<"orders">;
  amount: number;
  onPaymentComplete: (paymentMode: "cash" | "card") => void;
  onCancel: () => void;
}

export function PaymentProcessor({ 
  orderId, 
  amount, 
  onPaymentComplete,
  onCancel
}: PaymentProcessorProps) {
  const [paymentMode, setPaymentMode] = useState<"cash" | "card">("cash");
  const [isProcessing, setIsProcessing] = useState(false);
  // const [showUpiScanner, setShowUpiScanner] = useState(false);
  // const [upiPaymentStatus, setUpiPaymentStatus] = useState<"pending" | "success" | "failed">("pending");
  // const [upiQrCodeData, setUpiQrCodeData] = useState("");
  // const [transactionId, setTransactionId] = useState("");
  const [tipAssignedTo, setTipAssignedTo] = useState<Id<"staff"> | undefined>(undefined); // Add state for tip assignment
  const [paymentGateway] = useState<PaymentGateway>(() => {
    // In a real implementation, you would load these from environment variables or settings
    const config: PaymentGatewayConfig = {
      apiKey: "your_payment_gateway_api_key",
      merchantId: "your_merchant_id",
      environment: "sandbox" // Change to "production" for live payments
    };
    return new MockPaymentGateway(config);
  });
  
  const restaurantProfile = useQuery(api.restaurant.getRestaurantProfile);
  const completeOrder = useMutation(api.orders.completeOrder);
  const staffDetails = useQuery(api.auth.getStaffDetails);
  const allStaff = useQuery(api.staff.getAllStaff);
  const orderDetails = useQuery(api.orders.getOrderById, { orderId });

  // Load system settings
  const systemSettings = JSON.parse(localStorage.getItem("systemSettings") || "{}");

  const handleCashPayment = () => {
    void completePayment("cash");
  };

  const handleCardPayment = () => {
    void completePayment("card");
  };

  const completePayment = async (mode: "cash" | "card") => {
    setIsProcessing(true);
    try {
      // Get cashier ID (current staff member)
      // We need to map the authenticated user to a staff member
      let cashierId = null;
      
      if (staffDetails && allStaff) {
        // If staffDetails exists, it's from Convex Auth
        // We need to find the corresponding staff member in the staff table
        const staffMember = allStaff.find((staff: any) => staff.email === staffDetails.email);
        cashierId = staffMember?._id;
      }
      
      // Fallback to a default cashier if none found
      if (!cashierId && allStaff) {
        const cashiers = allStaff.filter((staff: any) => 
          staff.role === "cashier" || staff.role === "manager"
        );
        cashierId = cashiers.length > 0 ? cashiers[0]._id : null;
      }
      
      if (!cashierId) {
        throw new Error("No cashier found. Please ensure staff members exist in the system.");
      }

      // Get tip information from order details
      const tipAmount = orderDetails?.tip || 0;
      // Use undefined instead of null for tipAssignedTo
      const tipAssignedToValue = tipAssignedTo || undefined;

      // Log the values for debugging
      console.log("Completing payment with:", {
        orderId,
        paymentMode: mode,
        cashierId,
        tip: tipAmount,
        tipAssignedTo: tipAssignedToValue
      });

      await completeOrder({
        orderId,
        paymentMode: mode,
        cashierId,
        tip: tipAmount,
        tipAssignedTo: tipAssignedToValue,
      });

      // Handle automatic bill actions based on system settings
      if (systemSettings.autoDownloadBills) {
        downloadBill();
      }
      
      if (systemSettings.printBillsAutomatically) {
        printBill();
      }

      toast.success("Order completed successfully!");
      onPaymentComplete(mode);
    } catch (error: any) {
      toast.error(`Payment failed: ${error.message || "Unknown error"}`);
      console.error("Payment error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  // UPI payment functionality removed for internationalization

  const printBill = () => {
    // Create a professional bill print function with actual order items
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      // Calculate totals
      const subtotal = orderDetails?.subtotal || amount;
      const tax = orderDetails?.tax || 0;
      const finalAmount = orderDetails?.finalAmount || amount;
      
      // Get currency symbol from restaurant profile or default to $
      const currencySymbol = restaurantProfile?.currency || "₹";
      
      // Get VAT settings from restaurant profile
      const enableVAT = restaurantProfile?.enableVAT !== false; // Default to true
      const vatRate = restaurantProfile?.vatRate || 5; // Default to 5% (UAE rate)
      
      printWindow.document.write(`
        <html>
          <head>
            <title>Bill Receipt</title>
            <style>
              body { 
                font-family: 'Courier New', monospace; 
                margin: 0;
                padding: 20px;
                background: #fff;
                color: #000;
                font-size: 14px;
                line-height: 1.4;
                width: 300px;
              }
              .receipt-header {
                text-align: center;
                margin-bottom: 15px;
              }
              .restaurant-name {
                font-size: 18px;
                font-weight: bold;
                margin-bottom: 5px;
              }
              .restaurant-address, .restaurant-contact {
                font-size: 12px;
                color: #666;
              }
              .receipt-title {
                text-align: center;
                font-weight: bold;
                font-size: 16px;
                margin: 15px 0;
                border-top: 1px dashed #000;
                border-bottom: 1px dashed #000;
                padding: 10px 0;
              }
              .info-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 5px;
              }
              .info-label {
                font-weight: bold;
              }
              .items-table {
                width: 100%;
                border-collapse: collapse;
                margin: 15px 0;
              }
              .items-table th {
                text-align: left;
                border-bottom: 1px dashed #000;
                padding: 5px 0;
                font-size: 12px;
              }
              .items-table td {
                padding: 3px 0;
              }
              .item-name {
                width: 40%;
              }
              .item-qty {
                width: 15%;
                text-align: center;
              }
              .item-price {
                width: 20%;
                text-align: right;
              }
              .item-total {
                width: 25%;
                text-align: right;
              }
              .totals-section {
                margin: 15px 0;
              }
              .total-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 5px;
              }
              .grand-total {
                font-weight: bold;
                border-top: 1px dashed #000;
                padding-top: 5px;
                margin-top: 5px;
              }
              .payment-info {
                border-top: 1px dashed #000;
                padding-top: 10px;
                margin-top: 10px;
              }
              .footer {
                text-align: center;
                margin-top: 20px;
                font-size: 11px;
                border-top: 1px dashed #000;
                padding-top: 10px;
              }
              .thank-you {
                font-size: 16px;
                font-weight: bold;
                margin: 10px 0;
              }
              .divider {
                border-top: 1px dashed #000;
                margin: 10px 0;
              }
              /* Arabic styles */
              .arabic {
                direction: rtl;
                font-family: 'Arial', sans-serif;
              }
              .arabic .receipt-title, .arabic .info-label, .arabic .item-name, 
              .arabic .item-qty, .arabic .item-price, .arabic .item-total,
              .arabic .total-row, .arabic .thank-you {
                font-family: 'Arial', sans-serif;
              }
            </style>
          </head>
          <body>
            <!-- English Receipt -->
            <div class="receipt-header">
              <div class="restaurant-name">${restaurantProfile?.name || "CafePOSPro"}</div>
              <div class="restaurant-address">123 Cafe Street, City, State 12345</div>
              <div class="restaurant-contact">Phone: (123) 456-7890 | Email: info@cafepospro.com</div>
            </div>
            
            <div class="receipt-title">BILL RECEIPT</div>
            
            <div class="info-row">
              <span class="info-label">Order ID:</span>
              <span>${orderId}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Date:</span>
              <span>${new Date().toLocaleDateString()}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Time:</span>
              <span>${new Date().toLocaleTimeString()}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Cashier:</span>
              <span>${staffDetails?.name || "Cashier"}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Table:</span>
              <span>${orderDetails?.tableInfo?.tableNumber || "N/A"}</span>
            </div>

            
            <div class="divider"></div>
            
            <table class="items-table">
              <thead>
                <tr>
                  <th class="item-name">Item</th>
                  <th class="item-qty">Qty</th>
                  <th class="item-price">Price</th>
                  <th class="item-total">Total</th>
                </tr>
              </thead>
              <tbody>
                ${orderDetails?.items?.map((item: any) => `
                  <tr>
                    <td class="item-name">${item.itemName}</td>
                    <td class="item-qty">${item.quantity}</td>
                    <td class="item-price">${currencySymbol}${item.unitPrice.toFixed(2)}</td>
                    <td class="item-total">${currencySymbol}${item.total.toFixed(2)}</td>
                  </tr>
                  ${item.cookingInstructions ? `<tr>
                    <td colspan="4" style="font-size: 10px; color: #666;">Note: ${item.cookingInstructions}</td>
                  </tr>` : ""}
                `).join('') || `
                  <tr>
                    <td class="item-name">Cappuccino</td>
                    <td class="item-qty">2</td>
                    <td class="item-price">${currencySymbol}150</td>
                    <td class="item-total">${currencySymbol}300</td>
                  </tr>
                  <tr>
                    <td class="item-name">Croissant</td>
                    <td class="item-qty">1</td>
                    <td class="item-price">${currencySymbol}120</td>
                    <td class="item-total">${currencySymbol}120</td>
                  </tr>
                  <tr>
                    <td class="item-name">Caesar Salad</td>
                    <td class="item-qty">1</td>
                    <td class="item-price">${currencySymbol}250</td>
                    <td class="item-total">${currencySymbol}250</td>
                  </tr>
                `}
              </tbody>
            </table>
            
            <div class="totals-section">
              <div class="total-row">
                <span>Subtotal:</span>
                <span>${currencySymbol}${subtotal.toFixed(2)}</span>
              </div>
              ${enableVAT ? `<div class="total-row">
                <span>VAT (${vatRate}%):</span>
                <span>${currencySymbol}${tax.toFixed(2)}</span>
              </div>` : ""}
              <div class="total-row grand-total">
                <span>Total:</span>
                <span>${currencySymbol}${finalAmount.toFixed(2)}</span>
              </div>
            </div>
            
            <div class="payment-info">
              <div class="info-row">
                <span class="info-label">Payment Method:</span>
                <span>${paymentMode.toUpperCase()}</span>
              </div>

            </div>
            
            <div class="divider"></div>
            
            <div class="footer">
              <div class="thank-you">THANK YOU!</div>
              <div>Visit Again</div>
              <div>www.cafepospro.com</div>
            </div>
            
            <!-- Arabic Receipt -->
            <div class="divider" style="margin: 30px 0;"></div>
            
            <div class="receipt-header arabic">
              <div class="restaurant-name">${restaurantProfile?.name || "CafePOSPro"}</div>
              <div class="restaurant-address">123 شارع الكافتيريا، المدينة، الولاية 12345</div>
              <div class="restaurant-contact">الهاتف: (123) 456-7890 | البريد الإلكتروني: info@cafepospro.com</div>
            </div>
            
            <div class="receipt-title arabic">فاتورة الشراء</div>
            
            <div class="info-row arabic">
              <span class="info-label">رقم الطلب:</span>
              <span>${orderId}</span>
            </div>
            <div class="info-row arabic">
              <span class="info-label">التاريخ:</span>
              <span>${new Date().toLocaleDateString()}</span>
            </div>
            <div class="info-row arabic">
              <span class="info-label">الوقت:</span>
              <span>${new Date().toLocaleTimeString()}</span>
            </div>
            <div class="info-row arabic">
              <span class="info-label">الكاشير:</span>
              <span>${staffDetails?.name || "الكاشير"}</span>
            </div>
            <div class="info-row arabic">
              <span class="info-label">الطاولة:</span>
              <span>${orderDetails?.tableInfo?.tableNumber || "غير متوفر"}</span>
            </div>

            
            <div class="divider"></div>
            
            <table class="items-table arabic">
              <thead>
                <tr>
                  <th class="item-name">الصنف</th>
                  <th class="item-qty">الكمية</th>
                  <th class="item-price">السعر</th>
                  <th class="item-total">الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                ${orderDetails?.items?.map((item: any) => `
                  <tr>
                    <td class="item-name">${item.itemName}</td>
                    <td class="item-qty">${item.quantity}</td>
                    <td class="item-price">${currencySymbol}${item.unitPrice.toFixed(2)}</td>
                    <td class="item-total">${currencySymbol}${item.total.toFixed(2)}</td>
                  </tr>
                  ${item.cookingInstructions ? `<tr>
                    <td colspan="4" style="font-size: 10px; color: #666;">ملاحظة: ${item.cookingInstructions}</td>
                  </tr>` : ""}
                `).join('') || `
                  <tr>
                    <td class="item-name">كابتشينو</td>
                    <td class="item-qty">2</td>
                    <td class="item-price">${currencySymbol}150</td>
                    <td class="item-total">${currencySymbol}300</td>
                  </tr>
                  <tr>
                    <td class="item-name">كرواسون</td>
                    <td class="item-qty">1</td>
                    <td class="item-price">${currencySymbol}120</td>
                    <td class="item-total">${currencySymbol}120</td>
                  </tr>
                  <tr>
                    <td class="item-name">سلطة سيزر</td>
                    <td class="item-qty">1</td>
                    <td class="item-price">${currencySymbol}250</td>
                    <td class="item-total">${currencySymbol}250</td>
                  </tr>
                `}
              </tbody>
            </table>
            
            <div class="totals-section arabic">
              <div class="total-row">
                <span>المجموع الفرعي:</span>
                <span>${currencySymbol}${subtotal.toFixed(2)}</span>
              </div>
              ${enableVAT ? `<div class="total-row">
                <span>ضريبة القيمة المضافة (${vatRate}%):</span>
                <span>${currencySymbol}${tax.toFixed(2)}</span>
              </div>` : ""}
              <div class="total-row grand-total">
                <span>الإجمالي:</span>
                <span>${currencySymbol}${finalAmount.toFixed(2)}</span>
              </div>
            </div>
            
            <div class="payment-info arabic">
              <div class="info-row">
                <span class="info-label">طريقة الدفع:</span>
                <span>${paymentMode.toUpperCase()}</span>
              </div>

            </div>
            
            <div class="divider"></div>
            
            <div class="footer arabic">
              <div class="thank-you">شكراً لك!</div>
              <div>نأمل زيارتك مرة أخرى</div>
              <div>www.cafepospro.com</div>
            </div>
            
            <script>
              window.onload = function() {
                window.print();
                // Close window after printing (optional)
                // window.close();
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const downloadBill = () => {
    // Create a professional bill download function with actual order items
    // Calculate totals
    const subtotal = orderDetails?.subtotal || amount;
    const tax = orderDetails?.tax || 0;
    const finalAmount = orderDetails?.finalAmount || amount;
    
    // Get currency symbol from restaurant profile or default to $
    const currencySymbol = restaurantProfile?.currency || "₹";
    
    // Get VAT settings from restaurant profile
    const enableVAT = restaurantProfile?.enableVAT !== false; // Default to true
    const vatRate = restaurantProfile?.vatRate || 5; // Default to 5% (UAE rate)
    
    // Generate item list
    let itemsList = "";
    if (orderDetails?.items && orderDetails.items.length > 0) {
      itemsList = orderDetails.items.map((item: any) => 
        `║ ${item.itemName.padEnd(23)} ${String(item.quantity).padStart(3)}    ${currencySymbol}${item.unitPrice.toFixed(2).padStart(6)}   ${currencySymbol}${item.total.toFixed(2).padStart(7)}               ║`
      ).join('\n');
    } else {
      itemsList = `║ Cappuccino              2      ${currencySymbol}150       ${currencySymbol}300               ║
║ Croissant               1      ${currencySymbol}120       ${currencySymbol}120               ║
║ Caesar Salad            1      ${currencySymbol}250       ${currencySymbol}250               ║`;
    }
    
    const billContent = `
╔══════════════════════════════════════════════════════════════╗
║                    ${restaurantProfile?.name || "CafePOSPro"}                    ║
║              123 Cafe Street, City, State 12345              ║
║            Phone: (123) 456-7890 | Email: info@cafepospro.com ║
╠══════════════════════════════════════════════════════════════╣
║                         BILL RECEIPT                         ║
╠══════════════════════════════════════════════════════════════╣
║ Order ID: ${orderId}
║ Date: ${new Date().toLocaleDateString()}
║ Time: ${new Date().toLocaleTimeString()}
║ Cashier: ${staffDetails?.name || "Cashier"}
║ Table: ${orderDetails?.tableInfo?.tableNumber || "N/A"}
║ Payment Method: ${paymentMode.toUpperCase()}
║
╠══════════════════════════════════════════════════════════════╣
║ Item                    Qty    Price      Total              ║
╠──────────────────────────────────────────────────────────────╣
${itemsList}
╠══════════════════════════════════════════════════════════════╣
║ Subtotal:                                       ${currencySymbol}${subtotal.toFixed(2).padStart(7)}     ║
${enableVAT ? `║ VAT (${vatRate}%):                                          ${currencySymbol}${tax.toFixed(2).padStart(7)}     ║` : ""}
║                                                      ║
║ GRAND TOTAL:                                    ${currencySymbol}${finalAmount.toFixed(2).padStart(7)}     ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║                        THANK YOU!                            ║
║                       Visit Again                            ║
║                     www.cafepospro.com                       ║
╚══════════════════════════════════════════════════════════════╝

════════════════════════════════════════════════════════════════
║                    ${restaurantProfile?.name || "CafePOSPro"}                    ║
║              123 شارع الكافتيريا، المدينة، الولاية 12345        ║
║            الهاتف: (123) 456-7890 | البريد الإلكتروني: info@cafepospro.com ║
╠══════════════════════════════════════════════════════════════╣
║                         فاتورة الشراء                        ║
╠══════════════════════════════════════════════════════════════╣
║ رقم الطلب: ${orderId}
║ التاريخ: ${new Date().toLocaleDateString()}
║ الوقت: ${new Date().toLocaleTimeString()}
║ الكاشير: ${staffDetails?.name || "الكاشير"}
║ الطاولة: ${orderDetails?.tableInfo?.tableNumber || "غير متوفر"}
║ طريقة الدفع: ${paymentMode.toUpperCase()}
║
╠══════════════════════════════════════════════════════════════╣
║ الصنف                   الكمية   السعر      الإجمالي          ║
╠──────────────────────────────────────────────────────────────╣
${itemsList.replace(/Item/g, "الصنف").replace(/Qty/g, "الكمية").replace(/Price/g, "السعر").replace(/Total/g, "الإجمالي")}
╠══════════════════════════════════════════════════════════════╣
║ المجموع الفرعي:                             ${currencySymbol}${subtotal.toFixed(2).padStart(7)}     ║
${enableVAT ? `║ ضريبة القيمة المضافة (${vatRate}%):                    ${currencySymbol}${tax.toFixed(2).padStart(7)}     ║` : ""}
║                                                      ║
║ الإجمالي:                                   ${currencySymbol}${finalAmount.toFixed(2).padStart(7)}     ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║                        شكراً لك!                             ║
║                     نأمل زيارتك مرة أخرى                    ║
║                     www.cafepospro.com                       ║
╚══════════════════════════════════════════════════════════════╝
    `;

    const blob = new Blob([billContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bill_${orderId}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // UPI scanner section removed for internationalization

  return (
    <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Complete Payment</h2>
          <button
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700"
          >
            <span className="text-2xl">×</span>
          </button>
        </div>

        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Amount to Pay:</span>
            <span className="text-2xl font-bold text-gray-900">
              {restaurantProfile?.currency || "₹"}{amount.toFixed(2)}
            </span>
          </div>
          
          {/* Display tip information if there's a tip */}
          {orderDetails?.tip && orderDetails.tip > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-200">
              <div className="flex justify-between">
                <span className="text-gray-600">Tip Amount:</span>
                <span className="font-medium text-gray-900">
                  {restaurantProfile?.currency || "₹"}{orderDetails.tip.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-gray-600">Total:</span>
                <span className="font-bold text-gray-900">
                  {restaurantProfile?.currency || "₹"}{(amount + orderDetails.tip).toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Tip Assignment Section - Only show if there's a tip */}
        {orderDetails?.tip && orderDetails.tip > 0 && allStaff && (
          <div className="mb-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
            <h3 className="font-medium text-amber-800 mb-2">Assign Tip</h3>
            <p className="text-sm text-amber-700 mb-3">
              Select which waiter should receive this tip
            </p>
            <select
              value={tipAssignedTo || ""}
              onChange={(e) => setTipAssignedTo(e.target.value as Id<"staff">)}
              className="w-full px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-50"
            >
              <option value="">Select a waiter</option>
              {allStaff
                .filter((staff: any) => staff.role === "waiter" && staff.isActive)
                .map((staff: any) => (
                  <option key={staff._id} value={staff._id}>
                    {staff.name} ({staff.role})
                  </option>
                ))}
            </select>
          </div>
        )}

        {/* Payment Method Selection */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Method
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setPaymentMode("cash")}
                className={`p-4 rounded-lg border-2 transition-all ${
                  paymentMode === "cash"
                    ? "border-green-500 bg-green-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex flex-col items-center">
                  <span className="text-2xl">💵</span>
                  <span className="mt-1 text-sm font-medium">Cash</span>
                </div>
              </button>
              <button
                onClick={() => setPaymentMode("card")}
                className={`p-4 rounded-lg border-2 transition-all ${
                  paymentMode === "card"
                    ? "border-purple-500 bg-purple-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex flex-col items-center">
                  <span className="text-2xl">💳</span>
                  <span className="mt-1 text-sm font-medium">Card</span>
                </div>
              </button>
            </div>
          </div>

          <button
            onClick={() => {
              if (paymentMode === "cash") {
                void handleCashPayment();
              } else if (paymentMode === "card") {
                void handleCardPayment();
              }
            }}
            disabled={isProcessing || (orderDetails?.tip && orderDetails.tip > 0 && !tipAssignedTo ? true : false)}
            className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-colors ${
              (isProcessing || (orderDetails?.tip && orderDetails.tip > 0 && !tipAssignedTo))
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {isProcessing ? (
              <span className="flex items-center justify-center">
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                Processing...
              </span>
            ) : (
              `Pay ${restaurantProfile?.currency || "₹"}${orderDetails?.tip && orderDetails.tip > 0 ? (amount + orderDetails.tip).toFixed(2) : amount.toFixed(2)}`
            )}
          </button>
        </div>

        {/* UPI Payment Scanner - Removed for internationalization */}
      </div>
    </div>
  );
}
