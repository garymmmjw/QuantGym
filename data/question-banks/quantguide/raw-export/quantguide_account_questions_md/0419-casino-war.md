# QuantGuide Question

## 419. Casino War

**Metadata**

- ID: `jNknamSvBho1TFSzwEBS`
- URL: https://www.quantguide.io/questions/casino-war
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: N/A
- Tags: Conditional Probability
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-9-9 22:08:22 America/New_York
- Last Edited By: Gabe

### 题干

You are playing a game with the casino. You and the dealer are each dealt a card from a fair, shuffled deck of 52 cards. If you have a strictly larger number than the dealer's, you win- else, you lose. What is the probability you win?

### Hint

This can be solved with symmetry. How do you compare the probability that your number is strictly higher than the dealer's with the probability that the dealer's number is strictly higher than yours? What is the probability that the two numbers are the same?

### 解答

This can be solved with symmetry. There are three distinct outcomes that define the sample space. Let $E_1$ be the event that your number is larger than the dealer's; $E_2$ be the event that your number is equal to the dealer's; $E_3$ be the event that your number is smaller than the dealer's. By symmetry, $P(E_1) = P(E_3)$, so we only need to find $P(E_2)$. We know that when we are dealt a card, there are 51 cards that the dealer could have, of which only 3 could be of the same number, so $P(E_2) = \frac{3}{51}$. Since $\sum_{\omega \in \Omega} P(\omega) = 1$, we can solve for $P(E_1)$:
$$P(E_1) + P (E_2) + P(E_3) = 1 \newline 2P(E_1) + P(E_2) = 1 \newline 2P(E_1) + \frac{3}{51} = 1 \newline P(E_1) = \frac{8}{17}$$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "8/17"
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "jNknamSvBho1TFSzwEBS",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-9 22:08:22 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3312926,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Casino War",
    "topic": "probability",
    "urlEnding": "casino-war",
    "version": 2
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "medium",
    "id": "jNknamSvBho1TFSzwEBS",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Casino War",
    "topic": "probability",
    "urlEnding": "casino-war"
  }
}
```
