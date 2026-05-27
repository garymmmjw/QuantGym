# QuantGuide Question

## 925. Quintuple Value

**Metadata**

- ID: `px9wyNecDXCw9K5IwfLM`
- URL: https://www.quantguide.io/questions/quintuple-value
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: Old Mission, Optiver
- Source: OMC OA, edited
- Tags: Expected Value
- Premium: True
- Solution Free: False
- Version: 2
- Last Edited: 2023-11-4 20:06:15 America/New_York
- Last Edited By: Gabe

### 题干

35 cards are in a deck numbered $1-35$. One card is dealt uniformly at random and you are paid out $5$ times the value on the card. Find the expected payout if you draw 2 cards from this deck.

### Hint

Let $X_1$ and $X_2$ be the value of the cards we select. Then our payout is $5(X_1 +X_2)$ by the question. We have that $X_1, X_2 \sim \text{DiscreteUnif}\left(\left\{1,2,\dots,35\right\}\right)$.

### 解答

Let $X_1$ and $X_2$ be the value of the cards we select. Then our payout is $5(X_1 +X_2)$ by the question. We have that $X_1, X_2 \sim \text{DiscreteUnif}\left(\left\{1,2,\dots,35\right\}\right)$. We are looking for $\mathbb{E}[5(X_1 + X_2)]$. By linearity, this is $5\mathbb{E}[X_1] + 5\mathbb{E}[X_2]$. As the two draws are exchangeable, their means are equal, so this is really just $10\mathbb{E}[X_1] = 10 \cdot 18 = 180$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "180"
    ],
    "companies": [
      {
        "company": "Old Mission"
      },
      {
        "company": "Optiver"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "px9wyNecDXCw9K5IwfLM",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-4 20:06:15 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7568755,
    "randomizable": "",
    "source": "OMC OA, edited",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Quintuple Value",
    "topic": "probability",
    "urlEnding": "quintuple-value",
    "version": 2
  },
  "list_summary": {
    "companies": [
      {
        "company": "Old Mission"
      },
      {
        "company": "Optiver"
      }
    ],
    "difficulty": "easy",
    "id": "px9wyNecDXCw9K5IwfLM",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Quintuple Value",
    "topic": "probability",
    "urlEnding": "quintuple-value"
  }
}
```
