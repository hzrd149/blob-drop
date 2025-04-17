import { useCallback, useEffect, useState } from "react";
import {
  CashuWallet,
  CashuMint,
  decodePaymentRequest,
  PaymentRequest,
  type MintQuoteResponse,
  type Token,
  getEncodedToken,
} from "@cashu/cashu-ts";
import QRCode from "qrcode";

import FilePicker from "./FilePicker";
import FilePreview from "./FilePreview";

export default function FileUpload() {
  const [loading, setLoading] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [mint, setMint] = useState<CashuMint | null>(null);
  const [wallet, setWallet] = useState<CashuWallet | null>(null);
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(
    null,
  );
  const [quote, setQuote] = useState<MintQuoteResponse | null>(null);
  const [checking, setChecking] = useState(5);
  const [token, setToken] = useState<Token | null>(null);
  const [uploadUrl, setUploadUrl] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setFile(null);
    setPaymentRequest(null);
    setMint(null);
    setWallet(null);
    setQuote(null);
    setUploadUrl(null);
    setToken(null);
    setError(null);
  };

  const handleFileSelect = useCallback(async (file: File) => {
    setFile(file);
    setError(null);

    try {
      const response = await fetch("/upload", {
        method: "HEAD",
        headers: {
          "x-content-length": file.size.toString(),
        },
      });

      if (response.status !== 402) throw new Error("Failed to get upload info");

      const xCashu = response.headers.get("x-cashu");
      if (!xCashu) throw new Error("No payment request received");

      const paymentRequest = decodePaymentRequest(xCashu);

      if (!paymentRequest.amount) throw new Error("No amount received");
      if (!paymentRequest.unit) throw new Error("No unit received");
      if (!paymentRequest.mints || paymentRequest.mints.length === 0)
        throw new Error("No mint received");

      const mint = new CashuMint(paymentRequest.mints![0]);
      setPaymentRequest(paymentRequest);
      setMint(mint);
      setWallet(new CashuWallet(mint, { unit: paymentRequest.unit }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  }, []);

  const createQuote = useCallback(async () => {
    if (!paymentRequest || !mint || !wallet) return;

    setLoading(true);
    const quote = await mint.createMintQuote({
      amount: paymentRequest.amount!,
      unit: paymentRequest.unit!,
    });

    setQrCode(await QRCode.toDataURL(quote.request));
    setQuote(quote);
    setLoading(false);
  }, [paymentRequest, mint, wallet]);

  const checkQuote = useCallback(async () => {
    if (!file || !quote || !mint || !wallet || !paymentRequest) return;

    const state = await mint.checkMintQuote(quote.quote);
    if (state.state !== "PAID") return;

    const proofs = await wallet.mintProofs(paymentRequest.amount!, quote.quote);
    const token: Token = {
      proofs,
      unit: paymentRequest.unit!,
      mint: mint.mintUrl,
    };

    setToken(token);

    // Start upload
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/upload", {
        method: "PUT",
        headers: {
          "x-cashu": getEncodedToken(token),
        },
        body: file,
      });

      if (!response.ok) throw new Error("Upload failed");

      const data = await response.json();
      setUploadUrl(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  }, [file, quote, mint, wallet, paymentRequest]);

  // Check the quote every 5 seconds if there isn't tokens
  useEffect(() => {
    if (!token && quote) {
      let c = 5;
      const i = setInterval(() => {
        if (c > 0) setChecking(c--);
        if (c === 0) checkQuote().finally(() => (c = 5));
      }, 1000);

      return () => clearInterval(i);
    }
  }, [quote, token, checkQuote]);

  return (
    <div className="container mx-auto p-4 max-w-md">
      <div className="bg-base-100 shadow-xl p-4">
        <h2>File Upload</h2>

        <div className="mb-4">
          <p>Files are stored for 24 hours</p>
        </div>

        {/* Show file picker and preview until there is a token */}
        {!token &&
          !uploadUrl &&
          (!file || !paymentRequest ? (
            <FilePicker onFileSelect={handleFileSelect} />
          ) : (
            <FilePreview file={file} onReset={reset} />
          ))}

        {paymentRequest && !quote && !token && (
          <div className="card bg-base-200 shadow-sm p-4 mt-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-sm text-base-content/70">Price</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold">
                    {paymentRequest.amount}
                  </span>
                  <span className="text-base-content/70">
                    {paymentRequest.unit}
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-sm text-base-content/70">Mint</span>
                <span
                  className="text-sm truncate max-w-[200px]"
                  title={paymentRequest.mints![0]}
                >
                  {paymentRequest.mints![0]}
                </span>
              </div>
            </div>
          </div>
        )}

        {qrCode && quote && !token && (
          <div className="mt-4">
            <p>Scan to pay:</p>
            <a target="_blank" href={`lightning:${quote.request}`}>
              <img src={qrCode} alt="Payment QR Code" className="mx-auto" />
            </a>

            <div className="flex gap-2">
              <a
                href={`lightning:${quote.request}`}
                className="btn btn-primary flex-1"
              >
                Open in wallet
              </a>
              {navigator.clipboard && (
                <button
                  className="btn"
                  onClick={() => navigator.clipboard.writeText(quote.request)}
                >
                  Copy
                </button>
              )}
            </div>

            <div className="flex gap-2 p-4 items-center justify-center">
              <div className="loading loading-spinner"></div>
              {checking > 0 ? (
                <p>Checking in {checking}s</p>
              ) : (
                <p>Checking payment...</p>
              )}
            </div>
          </div>
        )}

        {token && !uploadUrl && (
          <div className="flex flex-col items-center gap-2 my-8">
            <span className="loading loading-spinner loading-xl"></span>
            <p className="text-xl">Uploading...</p>
          </div>
        )}

        {error && (
          <div className="alert alert-error mt-4">
            <span>{error}</span>
          </div>
        )}

        {uploadUrl && (
          <div className="mt-4">
            <h2 className="text-center text-success text-xl my-4">
              Upload successful!
            </h2>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={uploadUrl}
                className="input input-bordered flex-1 select-all"
                readOnly
              />
              <button
                className="btn btn-primary"
                onClick={() => navigator.clipboard.writeText(uploadUrl)}
              >
                Copy
              </button>
            </div>

            <button
              className="btn btn-link btn-info w-full mt-1"
              onClick={reset}
            >
              Upload another
            </button>
          </div>
        )}

        {file && paymentRequest && !quote && (
          <button
            className="btn btn-primary w-full mt-4"
            onClick={createQuote}
            disabled={loading}
          >
            Get invoice
          </button>
        )}
      </div>
    </div>
  );
}
