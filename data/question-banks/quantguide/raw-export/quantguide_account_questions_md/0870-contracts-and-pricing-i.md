# QuantGuide Question

## 870. Contracts and Pricing I

**Metadata**

- ID: `NA48wZFi3iVvnjbwXZ3O`
- URL: https://www.quantguide.io/questions/contracts-and-pricing-i
- Topic: probability
- Difficulty: easy
- Internal Difficulty: N/A
- Companies: SIG
- Source: N/A
- Tags: Expectation
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

QuantGuide has a $20\%$ chance of being acquired between Wednesday evening and Thursday morning. One share of its stock is worth $\$30$ on Wednesday. If QuantGuide is acquired, then there is a $50\%$ chance that one share of its stock is worth $\$50$ and a $50\%$ chance that one share of its stock is worth $\$x$. Otherwise, there is a $60\%$ chance that one share of its stock is worth $\$0$ and a $40\%$ chance that one share of its stock is worth $\$10$. A fair contract that awards the buyer the right but not the obligation to buy the stock at $\$40$ on Thursday is worth $\$15$. Compute $x$. 

### Hint

We are interested in the expected gain after purchasing the contract. Specifically, if we purchase the contract, then we will only exercise our right to buy the stock at $\$40$ on Thursday if the value of the stock is greater than $\$40$.

### 解答

We are interested in the expected gain after purchasing the contract. Specifically, if we purchase the contract, then we will only exercise our right to buy the stock at $\$40$ on Thursday if the value of the stock is greater than $\$40$. Let $G$ denote the gain after purchasing the contract. 
\[\begin{aligned}
\mathbb{E}[G] &= -15 + 0.2 \cdot 0.5 \cdot (50 - 40) + 0.2 \cdot 0.5 \cdot (x - 40)
\end{aligned}\]
A fair price for the contract would assume $\mathbb{E}[G] = 0$. 
\[\begin{aligned}
15 &= 1 + 0.1x - 4 \\
18 &= 0.1x \\
x &= 180.
\end{aligned}\]

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "180"
    ],
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "easy",
    "id": "NA48wZFi3iVvnjbwXZ3O",
    "internalDifficulty": 0,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 7098014,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Expectation"
      }
    ],
    "title": "Contracts and Pricing I",
    "topic": "probability",
    "urlEnding": "contracts-and-pricing-i"
  },
  "list_summary": {
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "easy",
    "id": "NA48wZFi3iVvnjbwXZ3O",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Expectation"
      }
    ],
    "title": "Contracts and Pricing I",
    "topic": "probability",
    "urlEnding": "contracts-and-pricing-i"
  }
}
```
