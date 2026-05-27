# QuantGuide Question

## 780. Bond Practice VI

**Metadata**

- ID: `csyVCzBtpY8jYzKpzNi2`
- URL: https://www.quantguide.io/questions/bond-practice-vi
- Topic: finance
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: https://spu.edu/ddowning/ECN3321/bondprac.pdf
- Tags: Finance
- Premium: True
- Solution Free: False
- Version: 4
- Last Edited: 2023-9-30 23:13:04 America/New_York
- Last Edited By: Gabe

### 题干

Calculate the price of a bond with these characteristics. The coupon rate is 0.06, coupon payments are made every six months (twice per year), and the par value of the bond is 1,000. There are \(20.0\) years to maturity and a market interest rate of \(0.09%\).

### Hint

\[
\begin{gathered}
P=\left(\frac{\text{Par Value} \cdot \text{Coupon Rate/2}}{\text{Interest Rate / 2}}\right)\left(\frac{(1+\text{Interest Rate/2})^{\text{Years} \cdot 2}-1}{(1+\text{Interest Rate/2})^{\text{Years} \cdot 2}}\right)+\frac{\text{Par Value}}{(1+\text{Interest Rate/2})^{\text{Years} \cdot 2}} \\
\end{gathered}
\]

### 解答

\(n=2 \times 20.0=40 ; r=\frac{0.09}{2}=0.04500\); \(C=\frac{0.06 \times 1,000}{2}=30\);
\(P=\) price of bond:
\[
\begin{gathered}
P=\left(\frac{30}{0.04500}\right)\left(\frac{(1+0.04500)^{40}-1}{(1+0.04500)^{40}}\right)+\frac{1,000}{(1+0.04500)^{40}} \\
P=(666.6667)\left(\frac{5.81636-1}{5.81636}\right)+\frac{1,000}{5.81636}\\
P=552.0475+171.9287 \\
P=723.98
\end{gathered}
\]

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "723.98"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "csyVCzBtpY8jYzKpzNi2",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-30 23:13:04 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 6352095,
    "source": "https://spu.edu/ddowning/ECN3321/bondprac.pdf",
    "status": "published",
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Bond Practice VI",
    "topic": "finance",
    "urlEnding": "bond-practice-vi",
    "version": 4
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "csyVCzBtpY8jYzKpzNi2",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Bond Practice VI",
    "topic": "finance",
    "urlEnding": "bond-practice-vi"
  }
}
```
