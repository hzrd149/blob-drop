import {
  CashuMint,
  CashuWallet,
  decodePaymentRequest,
  getEncodedToken,
  MintQuoteState,
  PaymentRequest,
  type MintQuoteResponse,
  type Token,
} from "@cashu/cashu-ts";

// Constants
const API_BASE_URL = "http://localhost:3000"; // Update this with your actual API URL
const SATS_PER_MB = 1;

// DOM Elements
const dropZone = document.getElementById("drop-zone") as HTMLDivElement;
const fileInput = document.getElementById("file-input") as HTMLInputElement;
const fileInfo = document.getElementById("file-info") as HTMLDivElement;
const fileName = document.getElementById("file-name") as HTMLSpanElement;
const fileSize = document.getElementById("file-size") as HTMLSpanElement;
const fileCost = document.getElementById("file-cost") as HTMLSpanElement;
const uploadButton = document.getElementById(
  "upload-button",
) as HTMLButtonElement;
const uploadContainer = document.getElementById(
  "upload-container",
) as HTMLDivElement;
const loadingContainer = document.getElementById(
  "loading-container",
) as HTMLDivElement;
const successContainer = document.getElementById(
  "success-container",
) as HTMLDivElement;
const paymentStatus = document.getElementById(
  "payment-status",
) as HTMLParagraphElement;
const fileUrl = document.getElementById("file-url") as HTMLInputElement;
const copyButton = document.getElementById("copy-button") as HTMLButtonElement;

// State
let selectedFile: File | null = null;
let paymentRequest: PaymentRequest | null = null;
let mint: CashuMint | null = null;
let quote: MintQuoteResponse | null = null;
let paymentCheckInterval: number | null = null;

// Event Listeners
dropZone.addEventListener("click", () => fileInput.click());
dropZone.addEventListener("dragover", handleDragOver);
dropZone.addEventListener("dragleave", handleDragLeave);
dropZone.addEventListener("drop", handleDrop);
fileInput.addEventListener("change", handleFileSelect);
uploadButton.addEventListener("click", handleUpload);
copyButton.addEventListener("click", handleCopyUrl);

function handleDragOver(e: DragEvent) {
  e.preventDefault();
  dropZone.classList.add("dragover");
}

function handleDragLeave(e: DragEvent) {
  e.preventDefault();
  dropZone.classList.remove("dragover");
}

function handleDrop(e: DragEvent) {
  e.preventDefault();
  dropZone.classList.remove("dragover");

  if (e.dataTransfer?.files.length) {
    handleFile(e.dataTransfer.files[0]);
  }
}

function handleFileSelect(e: Event) {
  const target = e.target as HTMLInputElement;
  if (target.files?.length) {
    handleFile(target.files[0]);
  }
}

function handleFile(file: File) {
  selectedFile = file;
  fileName.textContent = file.name;
  fileSize.textContent = formatFileSize(file.size);
  fileCost.textContent = calculateCost(file.size).toString();
  fileInfo.style.display = "block";
}

function formatFileSize(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(2)} MB`;
}

function calculateCost(bytes: number): number {
  const mb = bytes / (1024 * 1024);
  return Math.ceil(mb * SATS_PER_MB);
}

async function handleUpload() {
  if (!selectedFile) return;

  try {
    // Show loading state
    uploadContainer.style.display = "none";
    loadingContainer.style.display = "block";

    // Make HEAD request to get payment request
    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: "HEAD",
      headers: {
        "x-content-size": selectedFile.size.toString(),
      },
    });

    if (!response.headers.has("x-cashu"))
      throw new Error("No payment request received");

    paymentRequest = decodePaymentRequest(response.headers.get("x-cashu")!);

    if (!paymentRequest.mints?.length) throw new Error("No mints received");
    if (!paymentRequest.amount) throw new Error("No amount received");
    if (!paymentRequest.unit) throw new Error("No unit received");
    mint = new CashuMint(paymentRequest.mints[0]);

    // Create lightning invoice
    quote = await mint.createMintQuote({
      amount: paymentRequest.amount,
      unit: paymentRequest.unit,
    });

    // Start checking payment status
    checkPaymentStatus();
  } catch (error) {
    console.error("Upload error:", error);
    alert("An error occurred during upload. Please try again.");
    resetUploadState();
  }
}

async function checkPaymentStatus() {
  if (!quote || !mint) return;

  paymentCheckInterval = window.setInterval(async () => {
    if (!quote || !mint) return;
    try {
      const status = await mint.checkMintQuote(quote.quote);

      if (status.state === MintQuoteState.PAID) {
        clearInterval(paymentCheckInterval!);
        await completeUpload();
      }
    } catch (error) {
      console.error("Payment check error:", error);
    }
  }, 2000);
}

async function completeUpload() {
  if (!selectedFile || !quote || !mint || !paymentRequest) return;

  try {
    const wallet = new CashuWallet(mint);

    // Create new Cashu token
    const proofs = await wallet.mintProofs(
      paymentRequest.amount!,
      quote.request,
    );
    const token: Token = {
      proofs,
      mint: mint.mintUrl,
      unit: paymentRequest.unit,
    };

    // Retry upload with cashu token
    const uploadResponse = await fetch(`${API_BASE_URL}/upload`, {
      method: "PUT",
      headers: {
        "x-cashu": getEncodedToken(token),
      },
      body: selectedFile,
    });

    if (!uploadResponse.ok) throw new Error("Upload failed");

    const { url } = await uploadResponse.json();

    // Show success state
    loadingContainer.style.display = "none";
    successContainer.style.display = "block";
    fileUrl.value = url;
  } catch (error) {
    console.error("Upload completion error:", error);
    alert("An error occurred while completing the upload. Please try again.");
    resetUploadState();
  }
}

function resetUploadState() {
  selectedFile = null;
  paymentRequest = null;
  quote = null;
  mint = null;
  if (paymentCheckInterval) {
    clearInterval(paymentCheckInterval);
  }
  uploadContainer.style.display = "block";
  loadingContainer.style.display = "none";
  successContainer.style.display = "none";
  fileInfo.style.display = "none";
  fileInput.value = "";
}

async function handleCopyUrl() {
  fileUrl.select();
  await navigator.clipboard.writeText(fileUrl.value);
  copyButton.textContent = "Copied!";
  setTimeout(() => {
    copyButton.textContent = "Copy URL";
  }, 2000);
}
