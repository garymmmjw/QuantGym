# QuantGuide Question

## 688. Contracts and Pricing II

**Metadata**

- ID: `XlAR5X0xggcqrju0WGIg`
- URL: https://www.quantguide.io/questions/contracts-and-pricing-ii
- Topic: probability
- Difficulty: medium
- Internal Difficulty: N/A
- Companies: N/A
- Source: N/A
- Tags: Conditional Expectation, Expectation
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Steve wants to buy Amy's house 6 months in the future. However, house prices have been volatile lately; the value of Amy's house in 6 months is equal to its current market value scaled by a constant $C$, where $C \sim \text{Unif}([0.6, 1.6])$. Amy offers to sell the following contract: Steve receives the right but not the obligation to, in 6 months, purchase Amy's house at its current market value instead of its value then. Amy is willing to negotiate the price of the contract. What is the fair price for Amy's contract as a proportion of her home's current market value?

### Hint

Note that a fair price for the contract assumes Steve does not lose or gain anything. How can you use the Law of Total Expectation to solve this problem?

### 解答

Let $G$ denote Steve's gain after purchasing the contract and rationally deciding to either purchase or forgo the purchase of Amy's house 6 months in the future. Let Amy's house's current value be denoted as $v$. Let the price of the contract be denoted as $p$. \[\begin{aligned} G &= \begin{cases} -p + (C - 1)v & \text{ if } C \geq 1 \\ -p & \text{ otherwise } \end{cases} \end{aligned}\] $C \geq 1$ with probability $0.6$. By the law of total expectation,  \[\begin{aligned} \mathbb{E}[G] &= \mathbb{E}[\mathbb{E}[G|C]] \\ \mathbb{E}[G] &= \mathbb{E}[G|C \geq 1] \mathbb{P}[G \geq 1] + \mathbb{E}[G|C < 1] \mathbb{P}[G < 1] \\ &= (-p + 0.3v) \cdot 0.6  -  p \cdot 0.4 \\ &= -p + 0.18v \end{aligned}\] Note that a fair price for the contract assumes Steve does not lose or gain anything.  \[\begin{aligned} p &= 0.18v \end{aligned}\] Steve should pay no more than $18\%$ of Amy's house's current value.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "0.18"
    ],
    "difficulty": "medium",
    "id": "XlAR5X0xggcqrju0WGIg",
    "internalDifficulty": 0,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 5591519,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Expectation"
      },
      {
        "tag": "Expectation"
      }
    ],
    "title": "Contracts and Pricing II",
    "topic": "probability",
    "urlEnding": "contracts-and-pricing-ii"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "medium",
    "id": "XlAR5X0xggcqrju0WGIg",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Conditional Expectation"
      },
      {
        "tag": "Expectation"
      }
    ],
    "title": "Contracts and Pricing II",
    "topic": "probability",
    "urlEnding": "contracts-and-pricing-ii"
  }
}
```
