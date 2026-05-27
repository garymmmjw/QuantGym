# QuantGuide Question

## 396. Bond Practice IV

**Metadata**

- ID: `6Sy83p7J8sBGCciM0qSJ`
- URL: https://www.quantguide.io/questions/bond-practice-iv
- Topic: finance
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: https://spu.edu/ddowning/ECN3321/bondprac.pdf
- Tags: Finance
- Premium: True
- Solution Free: False
- Version: 8
- Last Edited: 2023-9-30 23:12:39 America/New_York
- Last Edited By: Gabe

### 题干

Calculate the price of a bond with these characteristics. The coupon rate is 0.06, coupon payments are made every six months (twice per year), and the par value of the bond is 1,000. There are \(8.0\) years to maturity and a market interest rate of \(0.03%\).

### Hint

\[
\begin{gathered}
P=\left(\frac{\text{Par Value} \cdot \text{Coupon Rate/2}}{\text{Interest Rate / 2}}\right)\left(\frac{(1+\text{Interest Rate/2})^{\text{Years} \cdot 2}-1}{(1+\text{Interest Rate/2})^{\text{Years} \cdot 2}}\right)+\frac{\text{Par Value}}{(1+\text{Interest Rate/2})^{\text{Years} \cdot 2}} \\
\end{gathered}
\]

### 解答

\(n=2 \times 8.0=16 ; r=\frac{0.03}{2}=0.01500\); \(C=\frac{0.06 \times 1,000}{2}=30\); \(P=\) price of bond:

\[
\begin{gathered}
P=\left(\frac{30}{0.01500}\right)\left(\frac{(1+0.01500)^{16}-1}{(1+0.01500)^{16}}\right)+\frac{1,000}{(1+0.01500)^{16}} \\
P=(2,000)\left(\frac{1.26899-1}{1.26899}\right)+\frac{1,000}{1.26899} \\
P=423.9379+788.0310 \\
P=1,211.97
\end{gathered}
\]

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1211.97"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "6Sy83p7J8sBGCciM0qSJ",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-30 23:12:39 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3102824,
    "source": "https://spu.edu/ddowning/ECN3321/bondprac.pdf",
    "status": "published",
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Bond Practice IV",
    "topic": "finance",
    "urlEnding": "bond-practice-iv",
    "version": 8
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "6Sy83p7J8sBGCciM0qSJ",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Bond Practice IV",
    "topic": "finance",
    "urlEnding": "bond-practice-iv"
  }
}
```
