# QuantGuide Question

## 617. Sticky Delta

**Metadata**

- ID: `n99xrWn5nj9IlgUKhDGg`
- URL: https://www.quantguide.io/questions/sticky-delta
- Topic: finance
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: N/A
- Tags: Finance
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-10-25 22:46:25 America/New_York
- Last Edited By: Gabe

### 题干

We have a call option on the underlying $S$ with initial price $S_0 = 4$ and strike $K = 4$. The $\Gamma$ of the underlying is $0.03$. The implied volatility follows a sticky-delta model. Let $\sigma(x) = (x - 0.5)^2 + .3$, where $x$ represents the $\Delta$ of the option and $\sigma$ the implied volatility. 

$$\\$$

Give an approximation for the implied volatility of the $K = 6$ call option. Round to $2$ decimal points.



### Hint

What is the $\Delta$ of the $K = 6$ call option?

### 解答

A sticky delta model means that the implied volatility is a function purely of the deltas. In other words, we need to find the $\Delta$ of the $K = 6$ option and plug it into the function to find the implied volatility. We know that $\Gamma$ is the derivative of $\Delta$ and thus can use a first order approximation. Since we are dealing with $S_0 = 4$ and $K = 4$, the second order term does not matter as $\Gamma$ is maximized (approximately) for at-the-money options. We also know that ATM options have $0.5$ delta.

$$\\$$

We can then find the new delta with $\Delta_1 = 0.5 - 0.03(2) = 0.44$. We subtract since the strike is increasing, and we are becoming further out-of-the-money. Out-of-the-money options have a $\Delta < 0.5$. We then plug this into the function: $f(0.44) = (.44 - .5)^2 + .3 = .31$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      ".31"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "n99xrWn5nj9IlgUKhDGg",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-25 22:46:25 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4894303,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Sticky Delta",
    "topic": "finance",
    "urlEnding": "sticky-delta",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "n99xrWn5nj9IlgUKhDGg",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Sticky Delta",
    "topic": "finance",
    "urlEnding": "sticky-delta"
  }
}
```
