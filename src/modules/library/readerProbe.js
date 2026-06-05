export async function probePdfUrl(url, options = {}) {
  const language = options.language === "en" ? "en" : "zh";
  const isEnglish = language === "en";
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  let response;
  try {
    response = await fetchImpl(url, { headers: { Range: "bytes=0-0" } });
  } catch {
    throw new Error(isEnglish
      ? "The PDF reader could not reach the API server."
      : "PDF 阅读器暂时连不上 API 服务器。");
  }
  if (response.ok || response.status === 206) return true;

  let serverMessage = "";
  try {
    const contentType = response.headers.get("Content-Type") || "";
    if (contentType.includes("application/json")) {
      const data = await response.json();
      serverMessage = String(data?.error || "");
    } else {
      serverMessage = (await response.text()).slice(0, 160);
    }
  } catch {
    serverMessage = "";
  }

  if (/Library PDF file not found/i.test(serverMessage)) {
    throw new Error(isEnglish
      ? "This PDF is not deployed in the private reader storage yet. Set QUANTGYM_LIBRARY_PDF_ROOT on the API server and copy the PDF there."
      : "这本 PDF 还没有部署到服务器私有阅读目录。请在 API 服务器设置 QUANTGYM_LIBRARY_PDF_ROOT，并把对应 PDF 放进去。");
  }
  throw new Error(serverMessage || (isEnglish
    ? `The PDF reader returned HTTP ${response.status}.`
    : `PDF 阅读接口返回 HTTP ${response.status}。`));
}
