# QuantGuide Question

## 290. Mental Black Scholes

**Metadata**

- ID: `rf1wP8qeYn4CSOTu6vzU`
- URL: https://www.quantguide.io/questions/mental-black-scholes
- Topic: finance
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: heard on the street
- Tags: Finance
- Premium: True
- Solution Free: False
- Version: 3
- Last Edited: 2023-9-30 23:14:27 America/New_York
- Last Edited By: Gabe

### 题干

What is the value of a three-month at-the-money call option on a $\$100$ stock when the implied vol is $40$? Assume that $r = 0$ and that the stock follows GBM dynamics. Do not use a calculator.

### Hint

What is the approximation to price an at-the-money call (and put) option?


### 解答

We can use the approximation to price both puts and calls when interest rates are low and the option is at-the-money (put-call parity). 

$$c(t) \approx \sigma S \sqrt{\frac{T-t}{2\pi}}$$

We can use the approximation of $\frac{1}{\sqrt{2\pi}} \approx 0.4$

This then gives us $c(t) \approx .4 \cdot 100 \cdot 0.4 \cdot \sqrt{0.25} = 8$

Note, we need to divide implied volatility by $100$ as in Black-Scholes, it's reported as a percentage. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "8"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "rf1wP8qeYn4CSOTu6vzU",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-30 23:14:27 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2234230,
    "source": "heard on the street",
    "status": "published",
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Mental Black Scholes",
    "topic": "finance",
    "urlEnding": "mental-black-scholes",
    "version": 3
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "rf1wP8qeYn4CSOTu6vzU",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Mental Black Scholes",
    "topic": "finance",
    "urlEnding": "mental-black-scholes"
  }
}
```
