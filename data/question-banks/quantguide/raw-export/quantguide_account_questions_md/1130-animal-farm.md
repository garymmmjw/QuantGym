# QuantGuide Question

## 1130. Animal Farm

**Metadata**

- ID: `b0ul47ZyfpxrzS9H2FXn`
- URL: https://www.quantguide.io/questions/animal-farm
- Topic: brainteasers
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: 536 q11
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-9-9 21:36:06 America/New_York
- Last Edited By: Gabe

### 题干

A farmer goes to the market and spends $\$1000$ on $100$ animals. The farmer buys at least one of each animal. The cost of each cow is $\$50$. The cost of each sheep is $\$10$. The cost of each chicken is $\$0.50$. Let $x_1,x_2,$ and $x_3$ represent the number of cows, sheep, and chickens that the farmer bought, respectively. Find $x_1x_2x_3$.

### Hint

A farmer goes to the market and spends $\$1000$ on $100$ animals. The cost of each cow is $\$50$. The cost of each sheep is $\$10$. The cost of each chicken is $\$0.50$. Let $x_1,x_2,$ and $x_3$ represent the number of cows, sheep, and chickens that the farmer bought, respectively. Find $x_1x_2x_3$.

### 解答

From the above, we know that $x_1 + x_2 + x_3 = 100$ by the constraint of having $100$ animals. We also know that $50x_1 + 10x_2 + 0.5x_3 = 1000$ by the constraint of spending $1000$ total. Subtracting half of the first equation from the second yields that $49.5x_1 + 9.5x_2 = 900$, or equivalently that $99x_1 + 19x_2 = 1900$. We need to solve this in the integers that stay within our constraints of each $0 \leq x_i \leq 100$. The easiest solution is to note that $99 \cdot 19 = (100 - 1) \cdot 19 = 1900 - 19$. Therefore, $x_1 = 19$ and $x_2 = 1$ is a solution to this. We leave out verification that it is the only solution satisfying our constraints. This implies now that $x_3 = 100 - 19 - 1 = 80$. Therefore, $x_1x_2x_3 = 19 \cdot 1 \cdot 80 = 1520$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1520"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "b0ul47ZyfpxrzS9H2FXn",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-9 21:36:06 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 9317704,
    "source": "536 q11",
    "status": "published",
    "tags": [],
    "title": "Animal Farm",
    "topic": "brainteasers",
    "urlEnding": "animal-farm",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "b0ul47ZyfpxrzS9H2FXn",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Animal Farm",
    "topic": "brainteasers",
    "urlEnding": "animal-farm"
  }
}
```
