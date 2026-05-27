# QuantGuide Question

## 1102. Bond Practice III

**Metadata**

- ID: `poUgVPLeAjvcAlxqxtMy`
- URL: https://www.quantguide.io/questions/bond-practice-iii
- Topic: finance
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: https://spu.edu/ddowning/ECN3321/bondprac.pdf
- Tags: Finance
- Premium: False
- Solution Free: False
- Version: 3
- Last Edited: 2023-8-28 09:32:27 America/New_York
- Last Edited By: Gabe

### 题干

Calculate the price of a bond with these characteristics. The coupon rate is 0.06, coupon payments are made every six months (twice per year), and the par value of the bond is 1,000. There are \(5.0\) years to maturity and a market interest rate of \(0.05%\).

### Hint

\[
\begin{gathered}
P=\left(\frac{\text{Par Value} \cdot \text{Coupon Rate/2}}{\text{Interest Rate / 2}}\right)\left(\frac{(1+\text{Interest Rate/2})^{\text{Years} \cdot 2}-1}{(1+\text{Interest Rate/2})^{\text{Years} \cdot 2}}\right)+\frac{\text{Par Value}}{(1+\text{Interest Rate/2})^{\text{Years} \cdot 2}} \\
\end{gathered}
\]

### 解答

\(n=2 \times 5.0=10 ; r=\frac{0.05}{2}=0.02500\); \(C=\frac{0.06 \times 1,000}{2}=30\); \(P=\) price of bond:
\[
\begin{gathered}
P=\left(\frac{30}{0.02500}\right)\left(\frac{(1+0.02500)^{10}-1}{(1+0.02500)^{10}}\right)+\frac{1,000}{(1+0.02500)^{10}} \\
P=(1,200)\left(\frac{1.28008-1}{1.28008}\right)+\frac{1,000}{1.28008} \\
P=262.5619+781.1984 \\
P=1,043.76
\end{gathered}
\]

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1043.76"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "poUgVPLeAjvcAlxqxtMy",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-28 09:32:27 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 9013027,
    "source": "https://spu.edu/ddowning/ECN3321/bondprac.pdf",
    "status": "published",
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Bond Practice III",
    "topic": "finance",
    "urlEnding": "bond-practice-iii",
    "version": 3
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "poUgVPLeAjvcAlxqxtMy",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Bond Practice III",
    "topic": "finance",
    "urlEnding": "bond-practice-iii"
  }
}
```
