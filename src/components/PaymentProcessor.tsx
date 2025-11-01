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
    // Create a simple bill print function
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Bill Receipt</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .header { text-align: center; margin-bottom: 20px; }
              .bill-details { margin-bottom: 20px; }
              .footer { text-align: center; margin-top: 30px; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h2>${restaurantProfile?.name || "CafePOSPro"}</h2>
              <p>Bill Receipt</p>
            </div>
            <div class="bill-details">
              <p><strong>Order ID:</strong> ${orderId}</p>
              <p><strong>Amount:</strong> ₹${amount}</p>
              <p><strong>Payment Mode:</strong> ${paymentMode.toUpperCase()}</p>
              <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
              ${transactionId ? `<p><strong>Transaction ID:</strong> ${transactionId}</p>` : ""}
            </div>
            <div class="footer">
              <p>Thank you for your visit!</p>
              <p>Have a great day!</p>
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
    // Create a simple bill download function
    const billContent = `
${restaurantProfile?.name || "CafePOSPro"}
Bill Receipt

Order ID: ${orderId}
Amount: ₹${amount}
Payment Mode: ${paymentMode.toUpperCase()}
${transactionId ? `Transaction ID: ${transactionId}` : ""}
Date: ${new Date().toLocaleString()}

Thank you for your visit!
Have a great day!
    `;

    const blob = new Blob([billContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bill_${orderId}.txt`;
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