# QuantGuide Question

## 185. Bond Question II

**Metadata**

- ID: `kWHLgw2Jr4iBPKNIa3A1`
- URL: https://www.quantguide.io/questions/bond-question-ii
- Topic: finance
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: N/A
- Tags: Finance
- Premium: True
- Solution Free: False
- Version: 5
- Last Edited: 2023-9-30 23:13:20 America/New_York
- Last Edited By: Gabe

### 题干

Say you have a generic bond that has a 3 year maturity, $\$1000$ face value, and a $\textbf{quarterly}$ coupon rate of 2%. Find the value of the bond (rounded to the nearest cent) given the current interest rate is 5%.

### Hint

Same process as calculating a bond with annual payments, however we need to realize we have a quarterly coupon payment, meaning that our interest rate and payments will be a bit different due to the quarterly compounding and adjustments required to accommodate this change in frequency.

### 解答

First thing to realize is that our payments are quarterly, meaning we will have 12 payments, and a quarterly interest rate of 1.25% (as opposed to the yearly of 5%). Given these two adjustments, we can approach the problem as we would if the coupon rate was annual.
$\\~\\$
$\\~\\$
The first step we want to take is calculating our cash flows. In order to do this, we need to calculate how much money we lose to inflation each year we are payed out. 
To start, we calculate how much we are payed out per period, which is our face value * our coupon rate. In this case $1000 \cdot 2\% = 20$. We then want to calculate how much value we are giving up to inflation. This is given by the formula: \[\sum_{n=1}^{12} \dfrac{20}{1.0125^n}\] Here 20 is our coupon payment, 1.0125 represents our quarterly inflation rate of 1.25%, and we iterate through all 12 quarters. Calculating here we get $221.59$.
$\\~\\$
$\\~\\$
The second step is calculating our final face value payment, which is given by the face value and then dividing by the inflation rate to the power of however many years we were losing money to inflation. In this case, it will be $1000/1.0125^{12}$, which equals $861.51$.
$\\~\\$
$\\~\\$
Finally, add up the cash flows and the final face value to get our answer of $1083.09$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1083.09",
      "1083.1"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "kWHLgw2Jr4iBPKNIa3A1",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-30 23:13:20 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1446726,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Bond Question II",
    "topic": "finance",
    "urlEnding": "bond-question-ii",
    "version": 5
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "kWHLgw2Jr4iBPKNIa3A1",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Bond Question II",
    "topic": "finance",
    "urlEnding": "bond-question-ii"
  }
}
```
