# QuantGuide Question

## 541. Leaked IP

**Metadata**

- ID: `N37IN8Ccz0ajry4uBU5t`
- URL: https://www.quantguide.io/questions/leaked-ip
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: SIG
- Source: og
- Tags: Conditional Probability
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-11-4 19:55:05 America/New_York
- Last Edited By: Gabe

### 题干

Someone leaked IP from a quant firm! A witness claims that the IP was leaked by a trader. Suppose that witnesses are correct $2/3$ of the time. At this particular firm, $2/3$ of the employees are traders, while the other $1/3$ are researchers. Taking into account the witness statement, what is the probability that the person who leaked IP was a trader?

### Hint

Be careful about how to interpret the statements in the question. Let $T$ be the event the culprit is a trader and $S$ be the event that the witness says that the person leaking IP is a trader. Formulate the items in the question in terms of $T$ and $S$.

### 解答

Let $T$ be the event the culprit is a trader and $S$ be the event that the witness says that the person leaking IP is a trader. We want $\mathbb{P}[T \mid S]$. We know that $\mathbb{P}[T] = 2/3$ from the question. Also from the question, we can conclude $\mathbb{P}[S \mid T] = 2/3$, as the witness is correct $2/3$ of the time, so given the culprit was a trader, $2/3$ of the time, the witness would also say it is a trader. This also means $\mathbb{P}[S \mid T^c] = 1/3$, as the witness is incorrect $1/3$ of the time. Therefore, we have that $$\mathbb{P}[T \mid S] = \dfrac{\mathbb{P}[S \mid T]\mathbb{P}[T]}{\mathbb{P}[S \mid T]\mathbb{P}[T] + \mathbb{P}[S \mid T^c]\mathbb{P}[T^c]} = \dfrac{2/3 \cdot 2/3}{2/3 \cdot 2/3 + 1/3 \cdot 1/3} = \dfrac{4}{5}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "4/5"
    ],
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "N37IN8Ccz0ajry4uBU5t",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-4 19:55:05 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4334298,
    "source": "og",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Leaked IP",
    "topic": "probability",
    "urlEnding": "leaked-ip",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "easy",
    "id": "N37IN8Ccz0ajry4uBU5t",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Leaked IP",
    "topic": "probability",
    "urlEnding": "leaked-ip"
  }
}
```
