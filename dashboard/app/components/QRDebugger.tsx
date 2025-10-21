"use client";

import React, { useState } from "react";
import {
  testQRCodeFlow,
  generateMobileDeepLink,
} from "../../lib/qr-service";
import { handleApiError, handleSuccess } from "../../lib/utils";

interface QRTestResult {
  generation: boolean;
  validation: boolean;
  mobileLink: boolean;
  details: any;
}

interface QRDebuggerProps {
  orderId: string;
  onClose: () => void;
}

export default function QRDebugger({ orderId, onClose }: QRDebuggerProps) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<QRTestResult | null>(null);
  const [qrImage, setQrImage] = useState<string>("");
  const [mobileUrl, setMobileUrl] = useState<string>("");
  const [webUrl, setWebUrl] = useState<string>("");

  const runFullTest = async () => {
    setTesting(true);
    setTestResult(null);
    setQrImage("");
    setMobileUrl("");
    setWebUrl("");

    try {
      console.log("🧪 Starting QR Code Full Test for Order:", orderId);

      // Run comprehensive test
      const result = await testQRCodeFlow(orderId);
      setTestResult(result);

      if (result.generation && result.details.qrData) {
        setQrImage(result.details.qrData.image);
        setMobileUrl(result.details.qrData.mobileUrl);
        setWebUrl(result.details.qrData.webUrl);
      }

      console.log("🧪 Test Results:", result);

      if (result.generation && result.validation && result.mobileLink) {
        handleSuccess("All QR code tests passed! ✅");
      } else {
        const failedTests = [];
        if (!result.generation) failedTests.push("Generation");
        if (!result.validation) failedTests.push("Validation");
        if (!result.mobileLink) failedTests.push("Mobile Link");

        handleApiError(
          new Error(`Tests failed: ${failedTests.join(", ")}`),
          "QR Code Test Issues Found"
        );
      }
    } catch (error: any) {
      console.error("🧪 Test failed:", error);
      handleApiError(error, "QR Code Test Failed");
      setTestResult({
        generation: false,
        validation: false,
        mobileLink: false,
        details: { error: error.message },
      });
    } finally {
      setTesting(false);
    }
  };

  const testMobileAppLink = () => {
    const mobileLink = generateMobileDeepLink(orderId);
    setMobileUrl(mobileLink);

    // Try to open the mobile app
    if (typeof window !== "undefined") {
      window.location.href = mobileLink;

      // Fallback to web after short delay
      setTimeout(() => {
        const webFallback = `${window.location.origin}/orders/${orderId}`;
        console.log(
          "Mobile app didn't open, trying web fallback:",
          webFallback
        );
      }, 2000);
    }

    handleSuccess(`Mobile app link generated: ${mobileLink}`);
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      handleSuccess(`${label} copied to clipboard!`);
    } catch (error) {
      console.error("Failed to copy:", error);
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      handleSuccess(`${label} copied to clipboard!`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">
              QR Code Debugger
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              disabled={testing}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Order Information
            </h3>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p>
                <strong>Order ID:</strong> {orderId}
              </p>
              <p>
                <strong>Test Status:</strong>{" "}
                {testResult ? "Completed" : "Not tested"}
              </p>
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={runFullTest}
              disabled={testing}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
            >
              {testing && (
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              )}
              {testing ? "Testing..." : "Run Full Test"}
            </button>

            <button
              onClick={testMobileAppLink}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Test Mobile App Link
            </button>
          </div>

          {testResult && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Test Results
              </h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <span
                    className={`w-4 h-4 rounded-full ${
                      testResult.generation ? "bg-green-500" : "bg-red-500"
                    }`}
                  ></span>
                  <span>
                    QR Code Generation:{" "}
                    {testResult.generation ? "✅ PASSED" : "❌ FAILED"}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <span
                    className={`w-4 h-4 rounded-full ${
                      testResult.validation ? "bg-green-500" : "bg-red-500"
                    }`}
                  ></span>
                  <span>
                    QR Code Validation:{" "}
                    {testResult.validation ? "✅ PASSED" : "❌ FAILED"}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <span
                    className={`w-4 h-4 rounded-full ${
                      testResult.mobileLink ? "bg-green-500" : "bg-red-500"
                    }`}
                  ></span>
                  <span>
                    Mobile App Link:{" "}
                    {testResult.mobileLink ? "✅ PASSED" : "❌ FAILED"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {qrImage && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Generated QR Code
              </h3>
              <div className="text-center">
                <img
                  src={qrImage}
                  alt="QR Code"
                  className="mx-auto border rounded-lg"
                  style={{ maxWidth: "200px" }}
                />
                <p className="text-sm text-gray-600 mt-2">
                  Scan with mobile app to test
                </p>
              </div>
            </div>
          )}

          {mobileUrl && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Mobile App URLs
              </h3>
              <div className="space-y-3">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">Mobile Deep Link:</p>
                      <p className="text-sm text-gray-600 break-all">
                        {mobileUrl}
                      </p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(mobileUrl, "Mobile URL")}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                {webUrl && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">Web Fallback:</p>
                        <p className="text-sm text-gray-600 break-all">
                          {webUrl}
                        </p>
                      </div>
                      <button
                        onClick={() => copyToClipboard(webUrl, "Web URL")}
                        className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {testResult?.details && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Debug Details
              </h3>
              <div className="bg-gray-50 p-3 rounded-lg">
                <pre className="text-xs text-gray-700 overflow-x-auto">
                  {JSON.stringify(testResult.details, null, 2)}
                </pre>
              </div>
            </div>
          )}

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">
              Troubleshooting Tips:
            </h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>
                • Ensure mobile app is installed with correct deep link scheme
              </li>
              <li>• Check that QR code contains valid mobile app URL</li>
              <li>• Verify Supabase edge functions are deployed and working</li>
              <li>• Test QR code scanning with mobile device camera</li>
              <li>• Check browser console for additional error details</li>
            </ul>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
