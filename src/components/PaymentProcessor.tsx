import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";
import * as QRCode from "qrcode.react";

// Types for payment gateway integration
interface PaymentGatewayConfig {
  apiKey: string;
  merchantId: string;
  environment: "sandbox" | "production";
}

interface UpiPaymentRequest {
  orderId: string;
  amount: number;
  currency: string;
  customerEmail?: string;
  customerPhone?: string;
  description: string;
  returnUrl?: string;
  webhookUrl?: string;
}

interface PaymentStatusResponse {
  status: "pending" | "success" | "failed" | "cancelled";
  transactionId?: string;
  paymentMethod?: string;
  timestamp?: number;
}

interface PaymentGateway {
  createUpiPaymentRequest(request: UpiPaymentRequest): Promise<{ paymentUrl: string; qrCodeData: string; transactionId: string }>;
  checkPaymentStatus(transactionId: string): Promise<PaymentStatusResponse>;
}

// Mock payment gateway implementation - in a real app, this would connect to an actual payment provider
class MockPaymentGateway implements PaymentGateway {
  private config: PaymentGatewayConfig;
  
  constructor(config: PaymentGatewayConfig) {
    this.config = config;
  }
  
  async createUpiPaymentRequest(request: UpiPaymentRequest) {
    // In a real implementation, this would call the payment gateway API
    // For demo purposes, we'll simulate the response
    const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Generate UPI link
    const upiLink = `upi://pay?pa=merchant@upi&pn=${encodeURIComponent(request.description)}&am=${request.amount}&cu=INR&tn=${transactionId}`;
    
    return {
      paymentUrl: upiLink,
      qrCodeData: upiLink,
      transactionId
    };
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
      paymentMethod: "upi",
      timestamp: Date.now()
    };
  }
}

interface PaymentProcessorProps {
  orderId: Id<"orders">;
  amount: number;
  onPaymentComplete: (paymentMode: "cash" | "upi" | "card") => void;
  onCancel: () => void;
}

export function PaymentProcessor({ 
  orderId, 
  amount, 
  onPaymentComplete,
  onCancel
}: PaymentProcessorProps) {
  const [paymentMode, setPaymentMode] = useState<"cash" | "upi" | "card">("upi");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showUpiScanner, setShowUpiScanner] = useState(false);
  const [upiPaymentStatus, setUpiPaymentStatus] = useState<"pending" | "success" | "failed">("pending");
  const [upiQrCodeData, setUpiQrCodeData] = useState("");
  const [transactionId, setTransactionId] = useState("");
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

  // Check payment status periodically
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (showUpiScanner && upiPaymentStatus === "pending" && transactionId) {
      // In a real implementation, this would check with the actual payment gateway
      interval = setInterval(() => {
        void (async () => {
          try {
            const statusResponse = await paymentGateway.checkPaymentStatus(transactionId);
            
            if (statusResponse.status === "success") {
              setUpiPaymentStatus("success");
              toast.success("UPI payment received!", {
                duration: 5000,
                description: `₹${amount} has been received via UPI for Order ${orderId}`,
              });
              void completePayment("upi");
            } else if (statusResponse.status === "failed") {
              setUpiPaymentStatus("failed");
              toast.error("UPI payment failed", {
                duration: 5000,
                description: "Payment was not received. Please try again or use another payment method.",
              });
            }
          } catch (error) {
            console.error("Error checking payment status:", error);
          }
        })();
      }, 3000); // Check every 3 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [showUpiScanner, upiPaymentStatus, transactionId]);

  const handleUpiPaymentSuccess = () => {
    setUpiPaymentStatus("success");
    toast.success("UPI payment received!", {
      duration: 5000,
      description: `₹${amount} has been received via UPI for Order ${orderId}`,
    });
    void completePayment("upi");
  };

  const handleCashPayment = () => {
    void completePayment("cash");
  };

  const handleCardPayment = () => {
    void completePayment("card");
  };

  const completePayment = async (mode: "cash" | "upi" | "card") => {
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

      await completeOrder({
        orderId,
        paymentMode: mode,
        cashierId,
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
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpiPayment = async () => {
    if (!restaurantProfile?.upiId) {
      toast.error("UPI ID not configured. Please set it in Settings.");
      return;
    }

    setIsProcessing(true);
    
    try {
      // Create payment request with real payment gateway
      const paymentRequest: UpiPaymentRequest = {
        orderId: orderId.toString(),
        amount: amount,
        currency: "INR",
        description: `Order ${orderId} at ${restaurantProfile.name}`,
        webhookUrl: `${window.location.origin}/api/payment-webhook`, // Webhook for real-time payment notifications
      };
      
      const paymentResponse = await paymentGateway.createUpiPaymentRequest(paymentRequest);
      
      // Set the QR code data and transaction ID
      setUpiQrCodeData(paymentResponse.qrCodeData);
      setTransactionId(paymentResponse.transactionId);
      
      // Show UPI QR code scanner
      setShowUpiScanner(true);
      setUpiPaymentStatus("pending");
    } catch (error) {
      toast.error("Failed to create payment request. Please try again.");
      console.error("Payment request error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const printBill = () => {
    // Create a professional bill print function with actual order items
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      // Calculate totals
      const subtotal = orderDetails?.subtotal || amount;
      const tax = orderDetails?.tax || 0;
      const finalAmount = orderDetails?.finalAmount || amount;
      
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
                border-bottom: 2px dashed #000;
                padding-bottom: 10px;
                margin-bottom: 15px;
              }
              .restaurant-name {
                font-size: 20px;
                font-weight: bold;
                margin: 0 0 5px 0;
              }
              .restaurant-address {
                font-size: 12px;
                margin: 0 0 5px 0;
              }
              .restaurant-contact {
                font-size: 12px;
                margin: 0 0 10px 0;
              }
              .receipt-title {
                font-size: 16px;
                font-weight: bold;
                text-align: center;
                margin: 0 0 15px 0;
              }
              .info-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 8px;
              }
              .info-label {
                font-weight: bold;
              }
              .items-table {
                width: 100%;
                border-collapse: collapse;
                margin: 10px 0;
              }
              .items-table th {
                text-align: left;
                border-bottom: 1px dashed #000;
                padding: 5px 0;
                font-size: 12px;
              }
              .items-table td {
                padding: 5px 0;
                font-size: 12px;
              }
              .items-table .item-name {
                width: 50%;
              }
              .items-table .item-qty {
                width: 15%;
                text-align: center;
              }
              .items-table .item-price {
                width: 15%;
                text-align: right;
              }
              .items-table .item-total {
                width: 20%;
                text-align: right;
              }
              .totals-section {
                border-top: 1px dashed #000;
                padding-top: 10px;
                margin-top: 10px;
              }
              .total-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 5px;
              }
              .grand-total {
                font-weight: bold;
                font-size: 16px;
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
            </style>
          </head>
          <body>
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
            ${transactionId ? `<div class="info-row">
              <span class="info-label">Transaction ID:</span>
              <span>${transactionId}</span>
            </div>` : ""}
            
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
                    <td class="item-price">₹${item.unitPrice.toFixed(2)}</td>
                    <td class="item-total">₹${item.total.toFixed(2)}</td>
                  </tr>
                  ${item.cookingInstructions ? `<tr>
                    <td colspan="4" style="font-size: 10px; color: #666;">Note: ${item.cookingInstructions}</td>
                  </tr>` : ""}
                `).join('') || `
                  <tr>
                    <td class="item-name">Cappuccino</td>
                    <td class="item-qty">2</td>
                    <td class="item-price">₹150</td>
                    <td class="item-total">₹300</td>
                  </tr>
                  <tr>
                    <td class="item-name">Croissant</td>
                    <td class="item-qty">1</td>
                    <td class="item-price">₹120</td>
                    <td class="item-total">₹120</td>
                  </tr>
                  <tr>
                    <td class="item-name">Caesar Salad</td>
                    <td class="item-qty">1</td>
                    <td class="item-price">₹250</td>
                    <td class="item-total">₹250</td>
                  </tr>
                `}
              </tbody>
            </table>
            
            <div class="totals-section">
              <div class="total-row">
                <span>Subtotal:</span>
                <span>₹${subtotal.toFixed(2)}</span>
              </div>
              ${systemSettings.enableGST !== false ? `<div class="total-row">
                <span>GST (18%):</span>
                <span>₹${tax.toFixed(2)}</span>
              </div>` : ""}
              <div class="total-row grand-total">
                <span>Total:</span>
                <span>₹${finalAmount.toFixed(2)}</span>
              </div>
            </div>
            
            <div class="payment-info">
              <div class="info-row">
                <span class="info-label">Payment Method:</span>
                <span>${paymentMode.toUpperCase()}</span>
              </div>
              ${paymentMode === "upi" ? `<div class="info-row">
                <span class="info-label">UPI ID:</span>
                <span>${restaurantProfile?.upiId || "N/A"}</span>
              </div>` : ""}
            </div>
            
            <div class="divider"></div>
            
            <div class="footer">
              <div class="thank-you">THANK YOU!</div>
              <div>Visit Again</div>
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
    
    // Generate item list
    let itemsList = "";
    if (orderDetails?.items && orderDetails.items.length > 0) {
      itemsList = orderDetails.items.map((item: any) => 
        `║ ${item.itemName.padEnd(23)} ${String(item.quantity).padStart(3)}    ₹${item.unitPrice.toFixed(2).padStart(6)}   ₹${item.total.toFixed(2).padStart(7)}               ║`
      ).join('\n');
    } else {
      itemsList = `║ Cappuccino              2      ₹150       ₹300               ║
║ Croissant               1      ₹120       ₹120               ║
║ Caesar Salad            1      ₹250       ₹250               ║`;
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
${transactionId ? `║ Transaction ID: ${transactionId}` : ""}
╠══════════════════════════════════════════════════════════════╣
║ Item                    Qty    Price      Total              ║
╠──────────────────────────────────────────────────────────────╣
${itemsList}
╠══════════════════════════════════════════════════════════════╣
║ Subtotal:                                           ₹${subtotal.toFixed(2).padStart(7)}     ║
${systemSettings.enableGST !== false ? `║ GST (18%):                                          ₹${tax.toFixed(2).padStart(7)}     ║` : ""}
║                                                      ║
║ GRAND TOTAL:                                        ₹${finalAmount.toFixed(2).padStart(7)}     ║
╠══════════════════════════════════════════════════════════════╣
║ Payment Method: ${paymentMode.toUpperCase()}
${paymentMode === "upi" ? `║ UPI ID: ${restaurantProfile?.upiId || "N/A"}` : ""}
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║                        THANK YOU!                            ║
║                       Visit Again                            ║
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

  if (showUpiScanner) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-amber-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Scan to Pay</h3>
        
        <div className="text-center mb-6">
          <div className="bg-gray-100 rounded-lg p-4 inline-block mb-4">
            {/* Generate actual QR code */}
            {upiQrCodeData ? (
              <QRCode.QRCodeSVG 
                value={upiQrCodeData} 
                size={192} 
                level="M"
                includeMargin={true}
                className="bg-white p-2 rounded-lg"
              />
            ) : (
              <div className="w-48 h-48 bg-white border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                <span className="text-gray-500">Generating QR Code...</span>
              </div>
            )}
          </div>
          
          <p className="text-gray-600 mb-2">Scan this QR code to pay ₹{amount}</p>
          <p className="text-sm text-gray-500">Order ID: {orderId}</p>
          
          {upiPaymentStatus === "pending" && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-2"></div>
                <span className="text-blue-800">Waiting for payment...</span>
              </div>
              <p className="text-xs text-blue-600 mt-1">
                Payment will be confirmed automatically
              </p>
            </div>
          )}
          
          {upiPaymentStatus === "failed" && (
            <div className="mt-4 p-3 bg-red-50 rounded-lg">
              <p className="text-red-800">Payment not received</p>
              <p className="text-xs text-red-600 mt-1">
                Please try again or use another payment method
              </p>
            </div>
          )}
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => {
              setShowUpiScanner(false);
              setIsProcessing(false);
              setUpiPaymentStatus("pending");
              setUpiQrCodeData("");
              setTransactionId("");
            }}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
            disabled={isProcessing && upiPaymentStatus === "pending"}
          >
            Back
          </button>
          
          {upiPaymentStatus === "pending" ? (
            <button
              onClick={handleUpiPaymentSuccess}
              className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              Simulate Payment Received
            </button>
          ) : upiPaymentStatus === "failed" ? (
            <button
              onClick={() => {
                // Retry the payment
                void handleUpiPayment();
              }}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors"
              disabled={isProcessing}
            >
              {isProcessing ? "Processing..." : "Retry Payment"}
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-amber-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Complete Payment</h3>
      
      <div className="mb-6">
        <p className="text-2xl font-bold text-amber-600 mb-2">₹{amount}</p>
        <p className="text-gray-600">Total Amount</p>
      </div>
      
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Payment Method
        </label>
        
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => setPaymentMode("upi")}
            className={`p-3 rounded-lg border-2 transition-colors ${
              paymentMode === "upi"
                ? "border-amber-500 bg-amber-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="text-center">
              <div className="text-2xl mb-1">📱</div>
              <div className="text-sm font-medium">UPI</div>
            </div>
          </button>
          
          <button
            onClick={() => setPaymentMode("cash")}
            className={`p-3 rounded-lg border-2 transition-colors ${
              paymentMode === "cash"
                ? "border-amber-500 bg-amber-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="text-center">
              <div className="text-2xl mb-1">💵</div>
              <div className="text-sm font-medium">Cash</div>
            </div>
          </button>
          
          <button
            onClick={() => setPaymentMode("card")}
            className={`p-3 rounded-lg border-2 transition-colors ${
              paymentMode === "card"
                ? "border-amber-500 bg-amber-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="text-center">
              <div className="text-2xl mb-1">💳</div>
              <div className="text-sm font-medium">Card</div>
            </div>
          </button>
        </div>
      </div>
      
      {paymentMode === "upi" && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>UPI Payment:</strong> Customer will scan the QR code to pay ₹{amount}
          </p>
          {restaurantProfile?.upiId ? (
            <p className="text-xs text-blue-600 mt-1">
              UPI ID: {restaurantProfile.upiId}
            </p>
          ) : (
            <p className="text-xs text-red-600 mt-1">
              UPI ID not configured. Please set it in Settings.
            </p>
          )}
        </div>
      )}
      
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
          disabled={isProcessing}
        >
          Cancel
        </button>
        
        {isProcessing ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-amber-600 mr-2"></div>
            <span>Processing...</span>
          </div>
        ) : (
          <>
            {paymentMode === "upi" ? (
              <button
                onClick={() => void handleUpiPayment()}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors flex-1"
                disabled={!restaurantProfile?.upiId || isProcessing}
              >
                {isProcessing ? "Generating Payment..." : "Generate UPI Payment"}
              </button>
            ) : paymentMode === "cash" ? (
              <button
                onClick={handleCashPayment}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors flex-1"
                disabled={isProcessing}
              >
                Complete Cash Payment
              </button>
            ) : (
              <button
                onClick={handleCardPayment}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors flex-1"
                disabled={isProcessing}
              >
                Complete Card Payment
              </button>
            )}
          </>
        )}
      </div>
      
      {/* Bill printing and download options */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={printBill}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors flex-1"
          >
            Print Bill
          </button>
          <button
            onClick={downloadBill}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors flex-1"
          >
            Download Bill
          </button>
        </div>
        
        {/* System settings info */}
        {(systemSettings.autoDownloadBills || systemSettings.printBillsAutomatically) && (
          <div className="mt-3 text-xs text-gray-500">
            {systemSettings.autoDownloadBills && systemSettings.printBillsAutomatically ? (
              <span>Auto-download and print enabled in settings</span>
            ) : systemSettings.autoDownloadBills ? (
              <span>Auto-download enabled in settings</span>
            ) : (
              <span>Auto-print enabled in settings</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}