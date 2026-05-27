# QuantGuide Question

## 53. Bond Practice I

**Metadata**

- ID: `qrQyuWNg7dryIzWCeZxw`
- URL: https://www.quantguide.io/questions/bond-practice-i
- Topic: finance
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: N/A
- Tags: Finance
- Premium: False
- Solution Free: False
- Version: 5
- Last Edited: 2023-8-28 09:29:36 America/New_York
- Last Edited By: Gabe

### 题干

Say you have a generic bond that has a 5 year maturity, $3000 face value, an annual coupon of 4%, and a current interest rate of 7%. Calculate the present value of this bond (rounded to two decimal places).

### Hint

Bond calculation formula is cash flows + final face value payment.

### 解答

The first step we want to take is calculating our cash flows. In order to do this, we need to calculate how much money we lose to inflation each year we are paid out. 
To start, we calculate how much we are paid out per period, which is our face value * our coupon rate. In this case $3000\cdot 0.04 = 120$. We then want to calculate how much value we are giving up to inflation. This is given by the formula: \[\sum_{n=1}^{5} \dfrac{120}{1.07^n}\] Here $120$ is our coupon payment, $1.07$ represents our inflation rate of $7\%$, and we iterate through all $5$ years. Calculating here we get $492.02$.
$\\~\\$
$\\~\\$
The second step is calculating our final face value payment, which is given by the face value and then dividing by the inflation rate to the power of however many years we were losing money to inflation. In this case, it will be $3000/1.07^5$, which equals $2138.98$.
$\\~\\$
$\\~\\$
Finally, add up the cash flows and the final face value to get our answer of $2630.98$.



### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "2630.98"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "qrQyuWNg7dryIzWCeZxw",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-28 09:29:36 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 399159,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Bond Practice I",
    "topic": "finance",
    "urlEnding": "bond-practice-i",
    "version": 5
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "qrQyuWNg7dryIzWCeZxw",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Bond Practice I",
    "topic": "finance",
    "urlEnding": "bond-practice-i"
  }
}
```
