# QuantGuide Question

## 820. Minimax Box

**Metadata**

- ID: `yJhXKRCOxKAfZ4VxB7p3`
- URL: https://www.quantguide.io/questions/minimax-box
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 3
- Companies: N/A
- Source: N/A
- Tags: Expected Value
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-26 13:31:51 America/New_York
- Last Edited By: Gabe

### 题干

You have 2 boxes and 100 distinct cards numbered $1-100$. At each turn, you deal a card from the top of the deck and place the card in a box uniformly at random. What is the expected value of the smallest numbered card in the box that has card $100$ in it? The answer is in the form $a(1-a^{-b})$ for integers $a$ and $b$. Find $ab$.

### Hint

Use $\mathbb{E}[X] = \displaystyle \sum_{k=1}^{\infty} \mathbb{P}[X \geq k]$. For an appropriately selected $X$, what does $\{X \geq k\}$ mean?

### 解答

We will want to use our alternate form of expectation for non-negative integer-valued random variables $\mathbb{E}[X] = \displaystyle \sum_{k=1}^{\infty} \mathbb{P}[X \geq k]$. In this case, our random variable $X$ is the smallest value of cards in the box with card $100$. The event $\{X \geq k\}$ means that all of cards valued $1,2,\dots, k-1$ are in the other box. Each of those cards is in the other box with probability $\dfrac{1}{2}$, so $\mathbb{P}[X \geq k] = \dfrac{1}{2^{k-1}}$. The maximal smallest value is $100$, which occurs in the event that $100$ is the only card in the box it is placed in. Therefore, $$\mathbb{E}[X] = \displaystyle \sum_{k=1}^{100} \dfrac{1}{2^{k-1}} = \sum_{k=0}^{99} \dfrac{1}{2^k} = \dfrac{1 - 2^{-100}}{1 - \frac{1}{2}} = 2 - 2^{-99} = 2(1 - 2^{-100})$$ This means the answer to our question is $2 \cdot 100 = 200$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "200"
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "yJhXKRCOxKAfZ4VxB7p3",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 13:31:51 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 6734801,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Minimax Box",
    "topic": "probability",
    "urlEnding": "minimax-box"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "hard",
    "id": "yJhXKRCOxKAfZ4VxB7p3",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Minimax Box",
    "topic": "probability",
    "urlEnding": "minimax-box"
  }
}
```
