# QuantGuide Question

## 624. Bond Practice V

**Metadata**

- ID: `TtyMw2vuGgSRWkbKstav`
- URL: https://www.quantguide.io/questions/bond-practice-v
- Topic: finance
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: https://spu.edu/ddowning/ECN3321/bondprac.pdf
- Tags: Finance
- Premium: False
- Solution Free: False
- Version: 5
- Last Edited: 2023-8-28 09:33:24 America/New_York
- Last Edited By: Gabe

### 题干

Calculate the price of a bond with these characteristics. The coupon rate is 0.06, coupon payments are made every six months (twice per year), and the par value of the bond is 1,000. There are \(12.0\) years to maturity and a market interest rate of \(0.06%\).

### Hint

\[
\begin{gathered}
P=\left(\frac{\text{Par Value} \cdot \text{Coupon Rate/2}}{\text{Interest Rate / 2}}\right)\left(\frac{(1+\text{Interest Rate/2})^{\text{Years} \cdot 2}-1}{(1+\text{Interest Rate/2})^{\text{Years} \cdot 2}}\right)+\frac{\text{Par Value}}{(1+\text{Interest Rate/2})^{\text{Years} \cdot 2}} \\
\end{gathered}
\]

### 解答

\(n=2 \times 12.0=24 ; r=\frac{0.06}{2}=0.03000\); \(C=\frac{0.06 \times 1,000}{2}=30\); \(P=\) price of bond: \[
\begin{gathered}
P=\left(\frac{30}{0.03000}\right)\left(\frac{(1+0.03000)^{24}-1}{(1+0.03000)^{24}}\right)+\frac{1,000}{(1+0.03000)^{24}} \\
P=(1,000)\left(\frac{2.03279-1}{2.03279}\right)+\frac{1,000}{2.03279} \\
P=508.0663+491.9337 \\
P=1,000.00
\end{gathered}
\]

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1000"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "TtyMw2vuGgSRWkbKstav",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-28 09:33:24 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4925281,
    "source": "https://spu.edu/ddowning/ECN3321/bondprac.pdf",
    "status": "published",
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Bond Practice V",
    "topic": "finance",
    "urlEnding": "bond-practice-v",
    "version": 5
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "TtyMw2vuGgSRWkbKstav",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Bond Practice V",
    "topic": "finance",
    "urlEnding": "bond-practice-v"
  }
}
```
